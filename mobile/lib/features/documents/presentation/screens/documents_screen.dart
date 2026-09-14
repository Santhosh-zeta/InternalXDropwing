import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/rbac/permissions.dart';
import '../../../../core/rbac/rbac_widgets.dart';
import '../../../../core/theme/nebula_spacing.dart';
import '../../../../core/theme/theme_context.dart';
import '../../../../core/widgets/data_display.dart';
import '../../../../core/widgets/motion.dart';
import '../../../../core/widgets/primitives.dart';
import '../../../../core/widgets/state_views.dart';
import '../../data/models/document_model.dart';
import '../providers/documents_provider.dart';

class DocumentsScreen extends ConsumerWidget {
  const DocumentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Documents'),
        centerTitle: false,
      ),
      // Upload is `manageDocuments` (staff and above). Hidden, not disabled —
      // a greyed-out button invites a support ticket.
      floatingActionButton: PermissionGate(
        permission: Permission.manageDocuments,
        child: FloatingActionButton(
          onPressed: () => _pickAndUpload(context, ref),
          child: const Icon(LucideIcons.plus),
        ),
      ),
      body: const PermissionScope(
        permission: Permission.viewDocuments,
        what: 'documents',
        child: _DocumentsBody(),
      ),
    );
  }
}

class _DocumentsBody extends ConsumerWidget {
  const _DocumentsBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docsAsync = ref.watch(documentsProvider);

    return docsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(NebulaSpacing.md),
        child: ListSkeleton(),
      ),
      error: (error, _) => ErrorStateView(
        message: readableError(error),
        onRetry: () => ref.invalidate(documentsProvider),
      ),
      data: (docs) {
        if (docs.isEmpty) {
          return EmptyStateView(
            icon: LucideIcons.fileX,
            title: 'No documents yet',
            message: 'Files shared with you will be listed here.',
            action: PermissionGate(
              permission: Permission.manageDocuments,
              child: OutlinedButton.icon(
                onPressed: () => _pickAndUpload(context, ref),
                icon: const Icon(LucideIcons.upload, size: 15),
                label: const Text('Upload a document'),
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => ref.read(documentsProvider.notifier).refresh(),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.md,
              NebulaSpacing.xxl,
            ),
            itemCount: docs.length,
            separatorBuilder: (_, __) =>
                const SizedBox(height: NebulaSpacing.sm),
            itemBuilder: (context, index) => StaggerIn(
              index: index,
              child: _DocumentRow(doc: docs[index]),
            ),
          ),
        );
      },
    );
  }
}

class _DocumentRow extends ConsumerWidget {
  const _DocumentRow({required this.doc});

  final DocumentModel doc;

  IconData get _icon {
    if (doc.isPdf) return LucideIcons.fileText;
    if (doc.isImage) return LucideIcons.image;
    if (doc.isVideo) return LucideIcons.video;
    switch (doc.extension) {
      case 'doc':
      case 'docx':
        return LucideIcons.filePen;
      case 'xls':
      case 'xlsx':
        return LucideIcons.table;
      case 'zip':
      case 'rar':
        return LucideIcons.archive;
      default:
        return LucideIcons.file;
    }
  }

  String get _typeLabel =>
      doc.extension.isEmpty ? 'FILE' : doc.extension.toUpperCase();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dl = context.dl;

    return EntityRow(
      title: doc.originalName,
      onTap: () => _open(context),
      leading: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: dl.surfaceRaised,
          borderRadius: BorderRadius.circular(NebulaSpacing.radiusSm),
          border: Border.all(color: dl.border),
        ),
        // File type is not a venture, so it gets no hue — only an icon.
        child: Icon(_icon, size: 16, color: context.scheme.onSurfaceVariant),
      ),
      meta: [
        Mono(doc.formattedSize, size: 10.5, color: dl.textTertiary),
        Mono(_formatDate(doc.createdAt), size: 10.5, color: dl.textTertiary),
        if (doc.uploadedByName != null && doc.uploadedByName!.isNotEmpty)
          Text(doc.uploadedByName!, overflow: TextOverflow.ellipsis),
      ],
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DTag(_typeLabel),
          PermissionGate(
            permission: Permission.manageDocuments,
            child: IconButton(
              icon: Icon(LucideIcons.trash2, size: 17, color: dl.critical),
              tooltip: 'Delete',
              visualDensity: VisualDensity.compact,
              onPressed: () => _confirmDelete(context, ref),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _open(BuildContext context) async {
    final uri = Uri.parse(doc.fileUrl);
    final launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    ).catchError((_) => false);

    if (launched || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Could not open this file'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete document'),
        content: Text('Delete "${doc.originalName}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(
              'Delete',
              style: TextStyle(color: dialogContext.dl.critical),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    final ok =
        await ref.read(documentsProvider.notifier).deleteDocument(doc.id);
    if (ok || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Could not delete that document'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  static String _formatDate(String createdAt) {
    final when = DateTime.tryParse(createdAt);
    return when == null ? '—' : DateFormat('d MMM yyyy').format(when);
  }
}

// ── Upload ────────────────────────────────────────────────────────────────

Future<void> _pickAndUpload(BuildContext context, WidgetRef ref) async {
  try {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif',
      ],
    );

    if (result == null || result.files.isEmpty) return;
    if (!context.mounted) return;

    final file = result.files.first;
    final filePath = file.path;

    // FilePicker leaves `path` null on platforms that only hand back bytes
    // (web). Uploading needs a real file on disk, so bail out clearly.
    if (filePath == null) {
      _toast(context, 'This file could not be read from disk');
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => _UploadSheet(
        filePath: filePath,
        fileName: file.name,
      ),
    );
  } catch (error) {
    if (!context.mounted) return;
    _toast(context, readableError(error));
  }
}

void _toast(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
  );
}

class _UploadSheet extends ConsumerStatefulWidget {
  const _UploadSheet({required this.filePath, required this.fileName});

  final String filePath;
  final String fileName;

  @override
  ConsumerState<_UploadSheet> createState() => _UploadSheetState();
}

class _UploadSheetState extends ConsumerState<_UploadSheet> {
  bool _uploading = false;

  /// Null until Dio reports a send with a known total — an unknown figure is
  /// left blank rather than guessed at.
  double? _progress;

  String get _fileSize {
    try {
      final bytes = File(widget.filePath).lengthSync();
      if (bytes < 1024) return '${bytes}B';
      if (bytes < 1024 * 1024) {
        return '${(bytes / 1024).toStringAsFixed(1)}KB';
      }
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
    } catch (_) {
      return '—';
    }
  }

  String get _extension {
    final parts = widget.fileName.split('.');
    return parts.length > 1 ? parts.last.toLowerCase() : '';
  }

  IconData get _icon {
    switch (_extension) {
      case 'pdf':
        return LucideIcons.fileText;
      case 'doc':
      case 'docx':
        return LucideIcons.filePen;
      case 'xls':
      case 'xlsx':
        return LucideIcons.table;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return LucideIcons.image;
      default:
        return LucideIcons.file;
    }
  }

  Future<void> _upload() async {
    setState(() => _uploading = true);

    final ok = await ref.read(documentsProvider.notifier).uploadDocument(
          widget.filePath,
          widget.fileName,
          onSendProgress: (sent, total) {
            if (!mounted || total <= 0) return;
            setState(() => _progress = sent / total);
          },
        );

    if (!mounted) return;
    Navigator.pop(context);
    _toast(
      context,
      ok ? 'Document uploaded' : 'Could not upload that document',
    );
  }

  @override
  Widget build(BuildContext context) {
    final dl = context.dl;
    final progress = _progress;

    return Padding(
      padding: EdgeInsets.only(
        left: NebulaSpacing.md,
        right: NebulaSpacing.md,
        top: NebulaSpacing.md,
        bottom: MediaQuery.viewInsetsOf(context).bottom + NebulaSpacing.lg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SectionHeader('Upload document'),
          DCard(
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: dl.surfaceRaised,
                    borderRadius:
                        BorderRadius.circular(NebulaSpacing.radiusSm),
                    border: Border.all(color: dl.border),
                  ),
                  child: Icon(
                    _icon,
                    size: 19,
                    color: context.scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: NebulaSpacing.sm + 3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.fileName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: context.text.titleSmall,
                      ),
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          Mono(
                            _fileSize,
                            size: 11,
                            color: dl.textTertiary,
                          ),
                          const SizedBox(width: NebulaSpacing.sm),
                          DTag(
                            _extension.isEmpty
                                ? 'FILE'
                                : _extension.toUpperCase(),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (_uploading) ...[
            const SizedBox(height: NebulaSpacing.md),
            ProgressTrack(value: progress ?? 0),
            const SizedBox(height: 7),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Uploading…', style: context.text.bodySmall),
                if (progress != null)
                  Mono(
                    '${(progress * 100).round()}%',
                    size: 11,
                    color: dl.timeNow,
                  ),
              ],
            ),
          ],
          const SizedBox(height: NebulaSpacing.md),
          Row(
            children: [
              if (!_uploading) ...[
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: NebulaSpacing.sm),
              ],
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _uploading ? null : _upload,
                  icon: const Icon(LucideIcons.upload, size: 15),
                  label: Text(_uploading ? 'Uploading' : 'Upload'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
