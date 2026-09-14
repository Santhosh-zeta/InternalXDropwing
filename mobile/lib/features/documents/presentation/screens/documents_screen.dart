import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import '../../../../core/theme/nebula_colors.dart';
import '../providers/documents_provider.dart';
import '../../data/models/document_model.dart';

class DocumentsScreen extends ConsumerWidget {
  const DocumentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docsAsync = ref.watch(documentsProvider);

    return Scaffold(
      backgroundColor: NebulaColors.background,
      appBar: AppBar(
        title: const Text('Documents',
            style: TextStyle(
                fontWeight: FontWeight.w600, color: NebulaColors.textPrimary)),
        backgroundColor: NebulaColors.surfaceCard,
        elevation: 0,
        centerTitle: false,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _handleFileUpload(context, ref),
        backgroundColor: NebulaColors.primary,
        child: const Icon(LucideIcons.plus),
      ),
      body: docsAsync.when(
        data: (docs) {
          if (docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.fileX,
                      size: 64,
                      color: NebulaColors.textSecondary.withValues(alpha: 0.4)),
                  const SizedBox(height: 16),
                  const Text('No documents yet',
                      style: TextStyle(
                          color: NebulaColors.textSecondary, fontSize: 16)),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => _handleFileUpload(context, ref),
                    icon: const Icon(LucideIcons.upload),
                    label: const Text('Upload Document'),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(documentsProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: docs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) =>
                  _DocumentTile(doc: docs[index]),
            ),
          );
        },
        loading: () => const Center(
            child: CircularProgressIndicator(color: NebulaColors.primary)),
        error: (e, st) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.alertCircle,
                  size: 48, color: NebulaColors.critical),
              const SizedBox(height: 12),
              Text(e.toString(),
                  style: const TextStyle(color: NebulaColors.textSecondary),
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(documentsProvider),
                icon: const Icon(LucideIcons.refreshCw),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleFileUpload(BuildContext context, WidgetRef ref) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'],
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final filePath = file.path;
        final fileName = file.name;

        if (!context.mounted) return;

        // FilePicker leaves `path` null on platforms that only hand back bytes
        // (web). Uploading needs a real file on disk, so bail out clearly.
        if (filePath == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('This file could not be read from disk'),
              backgroundColor: NebulaColors.critical,
            ),
          );
          return;
        }

        _showUploadBottomSheet(context, ref, filePath, fileName);
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error picking file: $e'),
          backgroundColor: NebulaColors.critical,
        ),
      );
    }
  }

  void _showUploadBottomSheet(
    BuildContext context,
    WidgetRef ref,
    String filePath,
    String fileName,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: NebulaColors.surfaceCard,
      builder: (context) => _UploadBottomSheet(
        filePath: filePath,
        fileName: fileName,
        onUpload: (onProgress) async {
          final success = await ref
              .read(documentsProvider.notifier)
              .uploadDocument(filePath, fileName);

          if (!context.mounted) return;

          Navigator.pop(context);

          if (success) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Document uploaded successfully'),
                backgroundColor: NebulaColors.success,
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Failed to upload document'),
                backgroundColor: NebulaColors.critical,
                action: SnackBarAction(
                  label: 'Retry',
                  onPressed: () => _handleFileUpload(context, ref),
                ),
              ),
            );
          }
        },
      ),
    );
  }
}

class _DocumentTile extends ConsumerWidget {
  final DocumentModel doc;

  const _DocumentTile({required this.doc});

  IconData _iconForType() {
    if (doc.isPdf) return LucideIcons.fileText;
    if (doc.isImage) return LucideIcons.image;
    if (doc.isVideo) return LucideIcons.video;
    switch (doc.extension) {
      case 'doc':
      case 'docx':
        return LucideIcons.fileEdit;
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

  Color _colorForType() {
    if (doc.isPdf) return NebulaColors.critical;
    if (doc.isImage) return NebulaColors.highlight;
    if (doc.isVideo) return NebulaColors.primary;
    switch (doc.extension) {
      case 'doc':
      case 'docx':
        return Colors.blue;
      case 'xls':
      case 'xlsx':
        return NebulaColors.success;
      default:
        return NebulaColors.textSecondary;
    }
  }

  String _formatDate(String createdAt) {
    try {
      return DateFormat('MMM d, yyyy').format(DateTime.parse(createdAt));
    } catch (_) {
      return createdAt;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final color = _colorForType();

    return Container(
      decoration: BoxDecoration(
        color: NebulaColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(_iconForType(), size: 22, color: color),
        ),
        title: Text(
          doc.originalName,
          style: const TextStyle(
              color: NebulaColors.textPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 14),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '${doc.formattedSize}  •  ${_formatDate(doc.createdAt)}',
          style: const TextStyle(
              color: NebulaColors.textSecondary, fontSize: 11),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(LucideIcons.download,
                  size: 18, color: NebulaColors.primary),
              onPressed: () async {
                final uri = Uri.parse(doc.fileUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri,
                      mode: LaunchMode.externalApplication);
                }
              },
              tooltip: 'Download',
            ),
            IconButton(
              icon: const Icon(LucideIcons.trash2,
                  size: 18, color: NebulaColors.critical),
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (c) => AlertDialog(
                    backgroundColor: NebulaColors.surfaceCard,
                    title: const Text('Delete Document',
                        style: TextStyle(color: NebulaColors.textPrimary)),
                    content: Text(
                        'Delete "${doc.originalName}"?',
                        style: const TextStyle(
                            color: NebulaColors.textSecondary)),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(c, false),
                          child: const Text('Cancel')),
                      TextButton(
                          onPressed: () => Navigator.pop(c, true),
                          child: const Text('Delete',
                              style:
                                  TextStyle(color: NebulaColors.critical))),
                    ],
                  ),
                );
                if (confirm == true) {
                  await ref
                      .read(documentsProvider.notifier)
                      .deleteDocument(doc.id);
                }
              },
              tooltip: 'Delete',
            ),
          ],
        ),
      ),
    );
  }
}

class _UploadBottomSheet extends StatefulWidget {
  final String filePath;
  final String fileName;
  final Future<void> Function(void Function(double)?) onUpload;

  const _UploadBottomSheet({
    required this.filePath,
    required this.fileName,
    required this.onUpload,
  });

  @override
  State<_UploadBottomSheet> createState() => _UploadBottomSheetState();
}

class _UploadBottomSheetState extends State<_UploadBottomSheet> {
  bool _isUploading = false;
  double _uploadProgress = 0.0;

  String get _fileSize {
    try {
      final file = File(widget.filePath);
      final bytes = file.lengthSync();
      if (bytes < 1024) return '${bytes}B';
      if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
    } catch (_) {
      return 'Unknown';
    }
  }

  IconData get _fileIcon {
    final ext = widget.fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'pdf':
        return LucideIcons.fileText;
      case 'doc':
      case 'docx':
        return LucideIcons.fileEdit;
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

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Upload Document',
            style: TextStyle(
              color: NebulaColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 20),

          // File Preview Section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: NebulaColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: NebulaColors.primary.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: NebulaColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    _fileIcon,
                    color: NebulaColors.primary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.fileName,
                        style: const TextStyle(
                          color: NebulaColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _fileSize,
                        style: const TextStyle(
                          color: NebulaColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Progress Bar
          if (_isUploading)
            Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _uploadProgress,
                    minHeight: 6,
                    backgroundColor: NebulaColors.textSecondary.withValues(alpha: 0.1),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      NebulaColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${(_uploadProgress * 100).toStringAsFixed(0)}%',
                  style: const TextStyle(
                    color: NebulaColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),

          // Action Buttons
          Row(
            children: [
              if (!_isUploading)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(
                        color: NebulaColors.textSecondary,
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
              if (!_isUploading) const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isUploading
                      ? null
                      : () async {
                          setState(() => _isUploading = true);
                          await widget.onUpload((progress) {
                            setState(() => _uploadProgress = progress);
                          });
                        },
                  child: _isUploading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              NebulaColors.textPrimary,
                            ),
                          ),
                        )
                      : const Text('Upload'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
