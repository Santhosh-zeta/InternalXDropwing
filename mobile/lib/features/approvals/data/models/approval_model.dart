import 'package:freezed_annotation/freezed_annotation.dart';

part 'approval_model.freezed.dart';
part 'approval_model.g.dart';

/// A single item awaiting a decision.
///
/// The backend exposes no dedicated `/approvals` endpoint. Approvals are
/// pending timesheets, listed by `GET /api/timesheets` and decided through
/// `PATCH /api/timesheets/:id/approve` (see
/// `backend/src/controllers/timesheet.controller.js`). The timesheet rows come
/// back in snake_case straight from the database join, so the JSON keys below
/// mirror that shape.
@freezed
class ApprovalRequest with _$ApprovalRequest {
  const factory ApprovalRequest({
    required int id,

    /// Category shown on the badge and used by the filter chips,
    /// e.g. `Timesheets`.
    required String type,

    /// Short one-line summary of what is being approved.
    required String title,
    @JsonKey(name: 'user_name') required String requesterName,
    required String status,
    @JsonKey(name: 'created_at') required DateTime createdAt,

    /// Free-form extra detail rendered in the expanded card.
    Map<String, dynamic>? metadata,
  }) = _ApprovalRequest;

  factory ApprovalRequest.fromJson(Map<String, dynamic> json) =>
      _$ApprovalRequestFromJson(json);
}
