import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../models/document_model.dart';

final documentsRemoteDataSourceProvider =
    Provider<DocumentsRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return DocumentsRemoteDataSource(dio);
});

class DocumentsRemoteDataSource {
  final Dio _dio;

  DocumentsRemoteDataSource(this._dio);

  Future<List<DocumentModel>> getDocuments() async {
    try {
      final response = await _dio.get('/documents');
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => DocumentModel.fromJson(json)).toList();
      }
      throw Exception(response.data['message'] ?? 'Failed to load documents');
    } catch (e) {
      throw Exception('Failed to load documents: $e');
    }
  }

  /// [onSendProgress] reports bytes sent / total so the upload sheet can show
  /// a real figure. Dio reports `total` as -1 when the length is unknown; the
  /// caller is expected to ignore those, rather than render a made-up number.
  Future<DocumentModel> uploadDocument(
    String filePath,
    String fileName, {
    void Function(int sent, int total)? onSendProgress,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: fileName),
      });

      final response = await _dio.post(
        '/documents/upload',
        data: formData,
        onSendProgress: onSendProgress,
        options: Options(
          headers: {'Content-Type': 'multipart/form-data'},
        ),
      );

      if (response.data['success'] == true) {
        return DocumentModel.fromJson(response.data['data']);
      }
      throw Exception(response.data['message'] ?? 'Failed to upload document');
    } catch (e) {
      throw Exception('Failed to upload document: $e');
    }
  }

  Future<void> deleteDocument(int id) async {
    try {
      final response = await _dio.delete('/documents/$id');
      if (response.data['success'] != true) {
        throw Exception(
            response.data['message'] ?? 'Failed to delete document');
      }
    } catch (e) {
      throw Exception('Failed to delete document: $e');
    }
  }
}
