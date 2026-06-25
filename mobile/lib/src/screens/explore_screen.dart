import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/api_endpoint_sheet.dart';
import '../data/catalog_service.dart';
import '../data/models.dart';
import '../theme.dart';
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
  List<Manga> _base = [];
  List<String> _apiGenres = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _loading = true;
      _error = null;
    });
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
        _error = '$e';
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final uri = GoRouterState.of(context).uri;
    final g = uri.queryParameters['genre'];
    final q = uri.queryParameters['q'];
    final nextGenre = (g == null || g.isEmpty) ? null : g;
    if (nextGenre != _genreFilter) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _genreFilter = nextGenre);
      });
    }
    if (q != null && q.isNotEmpty && _search.text != q) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _search.text = q;
          setState(() {});
        }
      });
    }
  }

  List<Manga> _filtered() {
    var list = [..._base];
    final query = _search.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      list = list
          .where(
            (m) =>
                m.title.toLowerCase().contains(query) ||
                m.author.toLowerCase().contains(query) ||
                m.genres.any((g) => g.toLowerCase().contains(query)),
          )
          .toList();
    }
    if (_genreFilter != null && _genreFilter!.isNotEmpty) {
      list = list.where((m) => m.genres.contains(_genreFilter)).toList();
    }
    if (_status != 'Tous') {
      list = list.where((m) => m.status == _status).toList();
    }
    switch (_sort) {
      case 'rating':
        list.sort((a, b) => b.rating.compareTo(a.rating));
        break;
      case 'latest':
        list.sort((a, b) => b.latestChapter.number.compareTo(a.latestChapter.number));
        break;
      case 'new':
        list.sort((a, b) => b.year.compareTo(a.year));
        break;
      case 'az':
        list.sort((a, b) => a.title.compareTo(b.title));
        break;
      default:
        list.sort((a, b) => b.rating.compareTo(a.rating));
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.bgLight,
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        backgroundColor: AppColors.bgLight,
        appBar: AppBar(title: const Text('Explorer')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(onPressed: _reload, child: const Text('Réessayer')),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: () async {
                    final ok = await showApiEndpointEditor(context);
                    if (ok && mounted) _reload();
                  },
                  child: const Text('URL du serveur…'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final genres = _apiGenres;
    final items = _filtered();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(title: const Text('Explorer')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                hintText: 'Rechercher…',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: AppColors.bgWhite,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                FilterChip(
                  label: const Text('Tous genres'),
                  selected: _genreFilter == null || _genreFilter!.isEmpty,
                  onSelected: (_) {
                    setState(() => _genreFilter = null);
                    context.go('/explore');
                  },
                ),
                const SizedBox(width: 6),
                ...genres.map(
                  (g) => Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: FilterChip(
                      label: Text(g),
                      selected: _genreFilter == g,
                      onSelected: (_) {
                        setState(() => _genreFilter = g);
                        context.go('/explore?genre=${Uri.encodeComponent(g)}');
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _sortChip('Popularité', 'popular'),
                _sortChip('Note', 'rating'),
                _sortChip('MAJ', 'latest'),
                _sortChip('Récents', 'new'),
                _sortChip('A → Z', 'az'),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final s in ['Tous', 'Ongoing', 'Completed', 'Hiatus'])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(s),
                        selected: _status == s,
                        onSelected: (_) => setState(() => _status = s),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Expanded(
            child: items.isEmpty
                ? const Center(child: Text('Aucun résultat'))
                : GridView.builder(
                    padding: const EdgeInsets.fromLTRB(10, 8, 10, 24),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.52,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemCount: items.length,
                    itemBuilder: (context, i) => Padding(padding: const EdgeInsets.all(6), child: MangaCard(manga: items[i])),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _sortChip(String label, String value) {
    final sel = _sort == value;
    return FilterChip(
      label: Text(label),
      selected: sel,
      onSelected: (_) => setState(() => _sort = value),
    );
  }
}
