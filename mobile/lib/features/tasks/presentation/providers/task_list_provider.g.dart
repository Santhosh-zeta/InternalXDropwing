// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'task_list_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$filteredTasksHash() => r'85284bfe68ca67c3b643cfe3417e84b53a8aa4c5';

/// See also [filteredTasks].
@ProviderFor(filteredTasks)
final filteredTasksProvider =
    AutoDisposeFutureProvider<List<TaskModel>>.internal(
  filteredTasks,
  name: r'filteredTasksProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$filteredTasksHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef FilteredTasksRef = AutoDisposeFutureProviderRef<List<TaskModel>>;
String _$taskListHash() => r'47c388e1d88a05d26ea26b105add2de5d49136c9';

/// See also [TaskList].
@ProviderFor(TaskList)
final taskListProvider =
    AutoDisposeAsyncNotifierProvider<TaskList, List<TaskModel>>.internal(
  TaskList.new,
  name: r'taskListProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$taskListHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$TaskList = AutoDisposeAsyncNotifier<List<TaskModel>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
