import 'package:dio/dio.dart';
import '../models/calendar_model.dart';

class CalendarRemoteDataSource {
  final Dio _dio;

  CalendarRemoteDataSource(this._dio);

  Future<List<CalendarEvent>> getCalendarEvents({
    int? projectId,
    required DateTime month,
  }) async {
    try {
      final queryParams = {
        'month': month.month,
        'year': month.year,
        if (projectId != null) 'project_id': projectId,
      };

      final response = await _dio.get(
        '/calendar/events',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final events = response.data['data'] as List;
        return events
            .map((json) => CalendarEvent.fromJson(json as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  Future<void> markMilestoneComplete(int eventId) async {
    await _dio.put(
      '/calendar/events/$eventId/complete',
      data: {'completed': true},
    );
  }
}
