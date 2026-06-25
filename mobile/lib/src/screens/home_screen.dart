import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/api_endpoint_sheet.dart';
import '../data/catalog_service.dart';
import '../data/models.dart';
import '../theme.dart';
import '../widgets/manga_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  String? _error;
  List<Manga> _featured = [];
  List<String> _genres = [];
  List<Manga> _latest = [];
  List<Manga> _popular = [];
  List<Manga> _top = [];
  List<Manga> _newest = [];
  int _heroIndex = 0;
  Timer? _heroTimer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    super.dispose();
  }

  void _restartHeroTimer() {
    _heroTimer?.cancel();
    _heroTimer = null;
    if (_featured.length > 1) {
      _heroTimer = Timer.periodic(const Duration(seconds: 5), (_) {
        if (!mounted) return;
        setState(() => _heroIndex = (_heroIndex + 1) % _featured.length);
      });
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        catalogService.fetchFeaturedManga(),
        catalogService.fetchGenres(),
        catalogService.fetchLatestUpdated(count: 12),
        catalogService.fetchPopularManga(count: 10),
        catalogService.fetchPopularManga(count: 10),
        catalogService.fetchNewestSeries(count: 8),
      ]);
      if (!mounted) return;
      setState(() {
        _featured = results[0] as List<Manga>;
        _genres = results[1] as List<String>;
        _latest = results[2] as List<Manga>;
        _popular = results[3] as List<Manga>;
        _top = results[4] as List<Manga>;
        _newest = results[5] as List<Manga>;
        _heroIndex = 0;
        _loading = false;
      });
      _restartHeroTimer();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
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
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(onPressed: _load, child: const Text('Réessayer')),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: () async {
                    final ok = await showApiEndpointEditor(context);
                    if (ok && mounted) _load();
                  },
                  child: const Text('URL du serveur…'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final featured = _featured;
    final current = featured.isEmpty ? null : featured[_heroIndex % featured.length];

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: current == null
                ? const SizedBox(
                    height: 200,
                    child: Center(child: Text('Aucun manga mis en avant pour le moment.')),
                  )
                : _Hero(
                    manga: current,
                    heroIndex: _heroIndex % (featured.isEmpty ? 1 : featured.length),
                    total: featured.length,
                    onPrev: () => setState(() => _heroIndex = (_heroIndex - 1 + featured.length) % featured.length),
                    onNext: () => setState(() => _heroIndex = (_heroIndex + 1) % featured.length),
                    onDot: (i) => setState(() => _heroIndex = i),
                  ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Container(
                    width: 4,
                    height: 20,
                    decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(2)),
                  ),
                  const SizedBox(width: 10),
                  const Text('Genres', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 40,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: _genres.length,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final g = _genres[i];
                  return OutlinedButton(
                    onPressed: () => context.go('/explore?genre=${Uri.encodeComponent(g)}'),
                    child: Text(g),
                  );
                },
              ),
            ),
          ),
          _sectionTitle('Mises à jour', onSeeAll: () => context.go('/explore')),
          if (_latest.isEmpty)
            const SliverToBoxAdapter(child: SizedBox(height: 80, child: Center(child: Text('Aucune mise à jour.'))))
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.52,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => Padding(padding: const EdgeInsets.all(6), child: MangaCard(manga: _latest[i])),
                  childCount: _latest.length,
                ),
              ),
            ),
          _sectionTitle('Les plus populaires', onSeeAll: () => context.go('/explore')),
          if (_popular.isEmpty)
            const SliverToBoxAdapter(child: SizedBox.shrink())
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.52,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => Padding(padding: const EdgeInsets.all(6), child: MangaCard(manga: _popular[i])),
                  childCount: _popular.length,
                ),
              ),
            ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sidebarTopManga(_top),
                  const SizedBox(height: 16),
                  _sidebarNewest(_newest),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sidebarTopManga(List<Manga> topManga) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.trending_up, size: 18, color: AppColors.primary),
                SizedBox(width: 8),
                Text('Top Manga', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              ],
            ),
            const Divider(height: 20),
            ...List.generate(topManga.length, (i) {
              final m = topManga[i];
              final rank = i + 1;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                leading: SizedBox(
                  width: 22,
                  child: Text(
                    '$rank',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.w800, color: rank <= 3 ? AppColors.primaryDark : AppColors.textMuted),
                  ),
                ),
                title: Text(m.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                subtitle: Text('${m.author} · ${m.rating} · ${m.views}', maxLines: 1, overflow: TextOverflow.ellipsis),
                onTap: () => context.push('/manga/${m.slug}'),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _sidebarNewest(List<Manga> list) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.auto_awesome, size: 18, color: AppColors.primary),
                SizedBox(width: 8),
                Text('Nouvelles séries', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              ],
            ),
            const Divider(height: 20),
            ...list.map((m) {
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: CachedNetworkImage(imageUrl: m.cover, width: 48, height: 68, fit: BoxFit.cover),
                ),
                title: Text(m.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                subtitle: Text('${m.genres.take(2).join(' · ')} · ${m.totalChapters} ch.'),
                onTap: () => context.push('/manga/${m.slug}'),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title, {VoidCallback? onSeeAll}) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
        child: Row(
          children: [
            Container(width: 4, height: 20, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(2))),
            const SizedBox(width: 10),
            Expanded(child: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700))),
            if (onSeeAll != null)
              OutlinedButton(
                onPressed: onSeeAll,
                style: OutlinedButton.styleFrom(foregroundColor: AppColors.primary, side: const BorderSide(color: AppColors.primary)),
                child: const Text('Voir tout'),
              ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.manga,
    required this.heroIndex,
    required this.total,
    required this.onPrev,
    required this.onNext,
    required this.onDot,
  });

  final Manga manga;
  final int heroIndex;
  final int total;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final ValueChanged<int> onDot;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 420,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CachedNetworkImage(
            imageUrl: manga.banner,
            fit: BoxFit.cover,
            placeholder: (context, url) => const ColoredBox(color: Colors.black26),
          ),
          Container(decoration: BoxDecoration(gradient: LinearGradient(colors: [Colors.black.withValues(alpha: 0.75), Colors.transparent], begin: Alignment.topCenter, end: Alignment.center))),
          Container(decoration: BoxDecoration(gradient: LinearGradient(colors: [Colors.transparent, Colors.black.withValues(alpha: 0.88)], begin: Alignment.center, end: Alignment.bottomCenter))),
          Positioned(
            left: 16,
            right: 120,
            bottom: 100,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _heroChip(manga.status),
                    ...manga.genres.take(3).map(_heroChip),
                  ],
                ),
                const SizedBox(height: 8),
                Text(manga.title, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, height: 1.1)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.star, size: 14, color: AppColors.rating),
                    const SizedBox(width: 4),
                    Text('${manga.rating}', style: const TextStyle(color: Colors.white70)),
                    const Text(' · ', style: TextStyle(color: Colors.white54)),
                    Expanded(child: Text(manga.author, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70))),
                  ],
                ),
                const SizedBox(height: 8),
                Text(manga.synopsis, maxLines: 4, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, height: 1.35)),
                const SizedBox(height: 14),
                Row(
                  children: [
                    FilledButton.icon(
                      onPressed: () => context.push('/manga/${manga.slug}'),
                      style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Lire maintenant'),
                    ),
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      onPressed: () => context.push('/manga/${manga.slug}'),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white54)),
                      icon: const Icon(Icons.info_outline),
                      label: const Text('Détails'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Positioned(
            right: 8,
            bottom: 100,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: CachedNetworkImage(imageUrl: manga.heroCover, width: 110, height: 165, fit: BoxFit.cover),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(onPressed: onPrev, icon: const Icon(Icons.chevron_left, color: Colors.white)),
                ...List.generate(total, (i) {
                  final active = i == heroIndex;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: GestureDetector(
                      onTap: () => onDot(i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: active ? 18 : 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: active ? Colors.white : Colors.white38,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  );
                }),
                IconButton(onPressed: onNext, icon: const Icon(Icons.chevron_right, color: Colors.white)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}
