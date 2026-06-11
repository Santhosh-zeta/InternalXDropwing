import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
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
      body: docsAsync.when(
        data: (docs) {
          if (docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.fileX,
                      size: 64,
                      color: NebulaColors.textSecondary.withOpacity(0.4)),
                  const SizedBox(height: 16),
                  const Text('No documents yet',
                      style: TextStyle(
                          color: NebulaColors.textSecondary, fontSize: 16)),
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
            color: color.withOpacity(0.12),
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
