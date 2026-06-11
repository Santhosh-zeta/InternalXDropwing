// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'projects_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$filteredProjectsHash() => r'393a2b5cfccd86144ed52ba1825a9ca4a46c05fb';

/// See also [filteredProjects].
@ProviderFor(filteredProjects)
final filteredProjectsProvider =
    AutoDisposeFutureProvider<List<ProjectModel>>.internal(
  filteredProjects,
  name: r'filteredProjectsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$filteredProjectsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef FilteredProjectsRef = AutoDisposeFutureProviderRef<List<ProjectModel>>;
String _$projectDetailHash() => r'499449b33742afa9840356b2c424e9a5e1348412';

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

/// See also [projectDetail].
@ProviderFor(projectDetail)
const projectDetailProvider = ProjectDetailFamily();

/// See also [projectDetail].
class ProjectDetailFamily extends Family<AsyncValue<ProjectModel>> {
  /// See also [projectDetail].
  const ProjectDetailFamily();

  /// See also [projectDetail].
  ProjectDetailProvider call(
    int id,
  ) {
    return ProjectDetailProvider(
      id,
    );
  }

  @override
  ProjectDetailProvider getProviderOverride(
    covariant ProjectDetailProvider provider,
  ) {
    return call(
      provider.id,
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
  String? get name => r'projectDetailProvider';
}

/// See also [projectDetail].
class ProjectDetailProvider extends AutoDisposeFutureProvider<ProjectModel> {
  /// See also [projectDetail].
  ProjectDetailProvider(
    int id,
  ) : this._internal(
          (ref) => projectDetail(
            ref as ProjectDetailRef,
            id,
          ),
          from: projectDetailProvider,
          name: r'projectDetailProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$projectDetailHash,
          dependencies: ProjectDetailFamily._dependencies,
          allTransitiveDependencies:
              ProjectDetailFamily._allTransitiveDependencies,
          id: id,
        );

  ProjectDetailProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.id,
  }) : super.internal();

  final int id;

  @override
  Override overrideWith(
    FutureOr<ProjectModel> Function(ProjectDetailRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ProjectDetailProvider._internal(
        (ref) => create(ref as ProjectDetailRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        id: id,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<ProjectModel> createElement() {
    return _ProjectDetailProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ProjectDetailProvider && other.id == id;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, id.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ProjectDetailRef on AutoDisposeFutureProviderRef<ProjectModel> {
  /// The parameter `id` of this provider.
  int get id;
}

class _ProjectDetailProviderElement
    extends AutoDisposeFutureProviderElement<ProjectModel>
    with ProjectDetailRef {
  _ProjectDetailProviderElement(super.provider);

  @override
  int get id => (origin as ProjectDetailProvider).id;
}

String _$projectListHash() => r'853aff3b3ad430a94fdd3c5dfb729d2b04deb0ed';

/// See also [ProjectList].
@ProviderFor(ProjectList)
final projectListProvider =
    AutoDisposeAsyncNotifierProvider<ProjectList, List<ProjectModel>>.internal(
  ProjectList.new,
  name: r'projectListProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$projectListHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$ProjectList = AutoDisposeAsyncNotifier<List<ProjectModel>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
