import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../data/datasources/client_portal_remote_data_source.dart';
import '../../data/models/client_portal_model.dart';

final clientPortalDataSourceProvider = Provider<ClientPortalRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return ClientPortalRemoteDataSource(dio);
});

final clientPortalOverviewProvider = FutureProvider<ClientPortalOverview>((ref) async {
  final dataSource = ref.watch(clientPortalDataSourceProvider);
  return dataSource.getClientPortalOverview();
});
