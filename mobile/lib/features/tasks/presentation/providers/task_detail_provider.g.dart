// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'task_detail_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$taskDetailHash() => r'77309a0f7ce11bb37ab0b8ace4e50e97775a9312';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

/// See also [taskDetail].
@ProviderFor(taskDetail)
const taskDetailProvider = TaskDetailFamily();

/// See also [taskDetail].
class TaskDetailFamily extends Family<AsyncValue<TaskModel>> {
  /// See also [taskDetail].
  const TaskDetailFamily();

  /// See also [taskDetail].
  TaskDetailProvider call(
    int taskId,
  ) {
    return TaskDetailProvider(
      taskId,
    );
  }

  @override
  TaskDetailProvider getProviderOverride(
    covariant TaskDetailProvider provider,
  ) {
    return call(
      provider.taskId,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'taskDetailProvider';
}

/// See also [taskDetail].
class TaskDetailProvider extends AutoDisposeFutureProvider<TaskModel> {
  /// See also [taskDetail].
  TaskDetailProvider(
    int taskId,
  ) : this._internal(
          (ref) => taskDetail(
            ref as TaskDetailRef,
            taskId,
          ),
          from: taskDetailProvider,
          name: r'taskDetailProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$taskDetailHash,
          dependencies: TaskDetailFamily._dependencies,
          allTransitiveDependencies:
              TaskDetailFamily._allTransitiveDependencies,
          taskId: taskId,
        );

  TaskDetailProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.taskId,
  }) : super.internal();

  final int taskId;

  @override
  Override overrideWith(
    FutureOr<TaskModel> Function(TaskDetailRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: TaskDetailProvider._internal(
        (ref) => create(ref as TaskDetailRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        taskId: taskId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<TaskModel> createElement() {
    return _TaskDetailProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is TaskDetailProvider && other.taskId == taskId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, taskId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin TaskDetailRef on AutoDisposeFutureProviderRef<TaskModel> {
  /// The parameter `taskId` of this provider.
  int get taskId;
}

class _TaskDetailProviderElement
    extends AutoDisposeFutureProviderElement<TaskModel> with TaskDetailRef {
  _TaskDetailProviderElement(super.provider);

  @override
  int get taskId => (origin as TaskDetailProvider).taskId;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
