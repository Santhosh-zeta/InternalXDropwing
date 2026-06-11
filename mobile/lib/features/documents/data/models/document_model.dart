class DocumentModel {
  final int id;
  final String originalName;
  final String storedName;
  final String mimeType;
  final int fileSize;
  final String filePath;
  final int uploadedBy;
  final String? uploadedByName;
  final String? relatedTo;
  final int? relatedId;
  final String createdAt;

  DocumentModel({
    required this.id,
    required this.originalName,
    required this.storedName,
    required this.mimeType,
    required this.fileSize,
    required this.filePath,
    required this.uploadedBy,
    this.uploadedByName,
    this.relatedTo,
    this.relatedId,
    required this.createdAt,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {
    return DocumentModel(
      id: json['id'] ?? 0,
      originalName: json['original_name'] ?? json['originalName'] ?? '',
      storedName: json['stored_name'] ?? json['storedName'] ?? '',
      mimeType: json['mime_type'] ?? json['mimeType'] ?? '',
      fileSize: int.tryParse(json['file_size']?.toString() ?? '0') ?? 0,
      filePath: json['file_path'] ?? json['filePath'] ?? '',
      uploadedBy: json['uploaded_by'] ?? 0,
      uploadedByName: json['uploaded_by_name'],
      relatedTo: json['related_to'],
      relatedId: json['related_id'],
      createdAt: json['created_at']?.toString() ?? '',
    );
  }

  String get fileUrl =>
      'https://internalx.dropwinggroups.com${filePath.startsWith('/') ? filePath : '/$filePath'}';

  String get extension {
    final parts = originalName.split('.');
    return parts.length > 1 ? parts.last.toLowerCase() : '';
  }

  bool get isImage =>
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].contains(extension);
  bool get isPdf => extension == 'pdf';
  bool get isVideo =>
      ['mp4', 'mov', 'avi', 'webm'].contains(extension);

  String get formattedSize {
    if (fileSize < 1024) return '${fileSize}B';
    if (fileSize < 1024 * 1024) return '${(fileSize / 1024).toStringAsFixed(1)}KB';
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)}MB';
  }
}
