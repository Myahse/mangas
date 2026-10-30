import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/api_config.dart';
import '../data/catalog_service.dart';
import '../data/community_service.dart';
import '../data/models.dart';
import '../theme.dart';
import '../widgets/connection_error_panel.dart';
import '../widgets/app_footer.dart';
import '../widgets/manga_card.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final _search = TextEditingController();
  String _sort = 'popular';
  String? _genreFilter;
  String _status = 'Tous';
  bool _filtersOpen = false;
  List<Manga> _base = [];
  List<String> _apiGenres = [];
  bool _loading = true;
  String? _error;
  // Server search (accents and a typo forgiven), 300 ms after the last keystroke.
  List<Manga>? _searchResults;
  String _searchedFor = '';
  Timer? _searchTimer;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _searchTimer?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    await ApiConfig.discoverReachableBaseUrl(force: true);
    try {
      final pair = await Future.wait([
        catalogService.fetchAllManga(),
        catalogService.fetchGenres(),
      ]);
      if (!mounted) return;
      setState(() {
        _base = pair[0] as List<Manga>;
        _apiGenres = pair[1] as List<String>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = ApiConfig.connectionFailedMessage();
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final uri = GoRouterState.of(context).uri;
    final g = uri.queryParameters['genre'];
    final q = uri.queryParameters['q'];
    final sort = uri.queryParameters['sort'];
    final nextGenre = (g == null || g.isEmpty) ? null : g;
    if (nextGenre != _genreFilter) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _genreFilter = nextGenre);
      });
    }
    if (sort != null && sort.isNotEmpty && sort != _sort) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _sort = sort);
      });
    }
    if (q != null && q.isNotEmpty && _search.text != q) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _search.text = q;
          _onQueryChanged();
        }
      });
    }
  }

  void _onQueryChanged() {
    _searchTimer?.cancel();
    final q = _search.text.trim();
    if (q.isEmpty) {
      setState(() {
        _searchResults = null;
        _searchedFor = '';
      });
      return;
    }
    _searchTimer = Timer(const Duration(milliseconds: 300), () async {
      try {
        final found = await communityService.search(q, limit: 50);
        if (!mounted || _search.text.trim() != q) return;
        setState(() {
          _searchResults = found;
          _searchedFor = q;
        });
      } catch (_) {}
    });
  }

  List<Manga> _filtered() {
    final query = _search.text.trim();
    final searching = query.isNotEmpty && _searchResults != null && _searchedFor == query;
    var list = searching ? [..._searchResults!] : [..._base];
    if (_genreFilter != null && _genreFilter!.isNotEmpty) {
      list = list.where((m) => m.genres.contains(_genreFilter)).toList();
    }
    if (_status != 'Tous') {
      list = list.where((m) => m.status == _status).toList();
    }
    // While searching, keep the server's relevance order unless another sort is picked.
    if (searching && _sort == 'popular') return list;
    switch (_sort) {
      case 'rating':
        list.sort((a, b) => b.rating.compareTo(a.rating));
      case 'latest':
        list.sort((a, b) => b.latestChapter.number.compareTo(a.latestChapter.number));
      case 'new':
        list.sort((a, b) => b.year.compareTo(a.year));
      case 'az':
        list.sort((a, b) => a.title.compareTo(b.title));
      default:
        list.sort((a, b) => b.rating.compareTo(a.rating));
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_error != null) {
      return Center(
        child: ConnectionErrorPanel(
          onRetry: _reload,
          busy: _loading,
        ),
      );
    }

    final items = _filtered();

    return RefreshIndicator(
      onRefresh: _reload,
      color: AppColors.primary,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Explorer les Mangas',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 22),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${items.length} résultat${items.length > 1 ? 's' : ''}',
                          style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => setState(() => _filtersOpen = !_filtersOpen),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _filtersOpen ? AppColors.primary : AppColors.textSecondary,
                      side: BorderSide(
                        color: _filtersOpen ? AppColors.primary : AppColors.border,
                        width: 1.5,
                      ),
                      backgroundColor: _filtersOpen ? AppColors.primary.withValues(alpha: 0.04) : AppColors.bgWhite,
                    ),
                    icon: const Icon(Icons.tune, size: 18),
                    label: const Text('Filtres'),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: TextField(
                controller: _search,
                decoration: const InputDecoration(
                  hintText: 'Rechercher un manga, un auteur…',
                  prefixIcon: Icon(Icons.search, color: AppColors.textMuted),
                ),
                onChanged: (_) => _onQueryChanged(),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _sortPill('Popularité', 'popular'),
                    _sortPill('Note', 'rating'),
                    _sortPill('Dernières MAJ', 'latest'),
                    _sortPill('Récents', 'new'),
                    _sortPill('A → Z', 'az'),
                  ],
                ),
              ),
            ),
          ),
          if (_filtersOpen)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.bgWhite,
                    borderRadius: BorderRadius.circular(AppRadii.md),
                    border: Border.all(color: AppColors.border),
                    boxShadow: AppShadows.card,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Statut', style: TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: ['Tous', 'Ongoing', 'Completed', 'Hiatus'].map((s) {
                          final sel = _status == s;
                          return ChoiceChip(
                            label: Text(s),
                            selected: sel,
                            onSelected: (_) => setState(() => _status = s),
                            selectedColor: AppColors.primary,
                            labelStyle: TextStyle(
                              color: sel ? Colors.white : AppColors.textDark,
                              fontWeight: FontWeight.w600,
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),
                      const Text('Genres', style: TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          FilterChip(
                            label: const Text('Tous'),
                            selected: _genreFilter == null,
                            onSelected: (_) {
                              setState(() => _genreFilter = null);
                              context.go('/explore');
                            },
                          ),
                          ..._apiGenres.map((g) {
                            return FilterChip(
                              label: Text(g),
                              selected: _genreFilter == g,
                              onSelected: (_) {
                                setState(() => _genreFilter = g);
                                context.go('/explore?genre=${Uri.encodeComponent(g)}');
                              },
                            );
                          }),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_genreFilter != null && _genreFilter!.isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Chip(
                    label: Text(_genreFilter!),
                    deleteIcon: const Icon(Icons.close, size: 16),
                    onDeleted: () {
                      setState(() => _genreFilter = null);
                      context.go('/explore');
                    },
                    backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                    side: BorderSide(color: AppColors.primary.withValues(alpha: 0.3)),
                  ),
                ),
              ),
            ),
          if (items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.menu_book_outlined, size: 56, color: AppColors.textMuted.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    const Text('Aucun résultat', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () {
                        _search.clear();
                        setState(() {
                          _genreFilter = null;
                          _status = 'Tous';
                          _sort = 'popular';
                        });
                        context.go('/explore');
                      },
                      child: const Text('Réinitialiser'),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(14, 16, 14, 32),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.44,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => MangaCard(manga: items[i]),
                  childCount: items.length,
                ),
              ),
            ),
          const SliverToBoxAdapter(child: AppFooter()),
        ],
      ),
    );
  }

  Widget _sortPill(String label, String value) {
    final sel = _sort == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: sel,
        onSelected: (_) => setState(() => _sort = value),
        selectedColor: AppColors.primary,
        showCheckmark: false,
        labelStyle: TextStyle(
          color: sel ? Colors.white : AppColors.textSecondary,
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
        backgroundColor: AppColors.bgWhite,
        side: BorderSide(color: sel ? AppColors.primary : AppColors.border, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }
}
