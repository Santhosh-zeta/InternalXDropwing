import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/datasources/documents_remote_data_source.dart';
import '../../data/models/document_model.dart';

final documentsProvider =
    AsyncNotifierProvider<DocumentsNotifier, List<DocumentModel>>(
        DocumentsNotifier.new);

class DocumentsNotifier extends AsyncNotifier<List<DocumentModel>> {
  @override
  Future<List<DocumentModel>> build() async {
    final dataSource = ref.watch(documentsRemoteDataSourceProvider);
    return dataSource.getDocuments();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<bool> uploadDocument(String filePath, String fileName) async {
    try {
      final dataSource = ref.read(documentsRemoteDataSourceProvider);
      final newDoc = await dataSource.uploadDocument(filePath, fileName);
      final current = state.value ?? [];
      state = AsyncData([newDoc, ...current]);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteDocument(int id) async {
    final previous = state;
    final current = state.value ?? [];
    state = AsyncData(current.where((d) => d.id != id).toList());

    try {
      final dataSource = ref.read(documentsRemoteDataSourceProvider);
      await dataSource.deleteDocument(id);
      return true;
    } catch (e) {
      state = previous;
      return false;
    }
  }
}
