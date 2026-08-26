import 'package:freezed_annotation/freezed_annotation.dart';

part 'approval_model.freezed.dart';
part 'approval_model.g.dart';

@freezed
class ApprovalRequest with _$ApprovalRequest {
  const factory ApprovalRequest({
    required int id,
    required String type,
    required String title,
    @JsonKey(name: 'requesterName') required String requesterName,
    required String status,
    @JsonKey(name: 'createdAt') required DateTime createdAt,
    Map<String, dynamic>? metadata,
  }) = _ApprovalRequest;

  factory ApprovalRequest.fromJson(Map<String, dynamic> json) =>
      _$ApprovalRequestFromJson(json);
}
