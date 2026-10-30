import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../config/api_config.dart';
import '../data/catalog_service.dart';
import '../data/community_service.dart';
import '../offline/offline_store.dart';
import '../data/models.dart';
import '../theme.dart';
import '../widgets/connection_error_panel.dart';
import '../widgets/app_footer.dart';
import '../widgets/manga_card.dart';
import '../widgets/section_header.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  String? _error;
  List<Manga> _featured = [];
  List<Manga> _latest = [];
  List<Manga> _popular = [];
  List<Manga> _top = [];
  List<Manga> _newest = [];
  List<ReadingProgress> _progress = [];
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
    await ApiConfig.discoverReachableBaseUrl(force: true);
    try {
      final results = await Future.wait([
        catalogService.fetchFeaturedManga(),
        catalogService.fetchLatestUpdated(count: 12),
        catalogService.fetchPopularManga(count: 8),
        catalogService.fetchPopularManga(count: 10),
        catalogService.fetchNewestSeries(count: 8),
      ]);
      if (!mounted) return;
      setState(() {
        _featured = results[0] as List<Manga>;
        _latest = results[1] as List<Manga>;
        _popular = results[2] as List<Manga>;
        _top = results[3] as List<Manga>;
        _newest = results[4] as List<Manga>;
        _heroIndex = 0;
        _loading = false;
      });
      _restartHeroTimer();
      _loadProgress();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = ApiConfig.connectionFailedMessage();
      });
    }
  }

  /// "Reprendre la lecture" (signed in only; never blocks the home page).
  Future<void> _loadProgress() async {
    if (!authController.isAuthenticated) return;
    try {
      final list = await communityService.fetchProgress(limit: 8);
      if (mounted) setState(() => _progress = list.where((p) => !p.caughtUp).toList());
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_error != null) {
      return Center(
        child: ConnectionErrorPanel(
          onRetry: _load,
          busy: _loading,
        ),
      );
    }

    final featured = _featured;
    final current = featured.isEmpty ? null : featured[_heroIndex % featured.length];

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: current == null
                ? const SizedBox(
                    height: 200,
                    child: Center(child: Text('Aucun manga mis en avant pour le moment.')),
                  )
                : _HeroBanner(
                    manga: current,
                    heroIndex: _heroIndex,
                    total: featured.length,
                    onPrev: () => setState(() => _heroIndex = (_heroIndex - 1 + featured.length) % featured.length),
                    onNext: () => setState(() => _heroIndex = (_heroIndex + 1) % featured.length),
                    onDot: (i) => setState(() => _heroIndex = i),
                  ),
          ),
          if (_progress.isNotEmpty) ...[
            const SliverToBoxAdapter(child: SectionHeader(title: 'Reprendre la lecture')),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 92,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  itemCount: _progress.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, i) => _ContinueCard(item: _progress[i]),
                ),
              ),
            ),
          ],
          SliverToBoxAdapter(child: SectionHeader(title: 'Mises à jour', onSeeAll: () => context.go('/explore'))),
          if (_latest.isEmpty)
            const SliverToBoxAdapter(child: SizedBox(height: 80, child: Center(child: Text('Aucune mise à jour.'))))
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.44,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => MangaCard(manga: _latest[i]),
                  childCount: _latest.length,
                ),
              ),
            ),
          SliverToBoxAdapter(
            child: SectionHeader(title: 'Les plus populaires', onSeeAll: () => context.go('/explore?sort=popular')),
          ),
          if (_popular.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.44,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => MangaCard(manga: _popular[i]),
                  childCount: _popular.length,
                ),
              ),
            ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Column(
                children: [
                  _sidebarCard(
                    title: 'Top Manga',
                    icon: Icons.trending_up,
                    child: Column(
                      children: List.generate(_top.length, (i) {
                        final m = _top[i];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: MangaCard(manga: m, variant: MangaCardVariant.list),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _sidebarCard(
                    title: 'Nouvelles séries',
                    icon: Icons.auto_awesome,
                    child: Column(
                      children: _newest.map((m) {
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: CachedNetworkImage(imageUrl: m.cover, width: 48, height: 68, fit: BoxFit.cover),
                          ),
                          title: Text(m.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${m.genres.take(2).join(' · ')} · ${m.totalChapters} ch.'),
                          onTap: () => context.push('/manga/${m.slug}'),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: AppFooter()),
        ],
      ),
    );
  }

  Widget _sidebarCard({required String title, required IconData icon, required Widget child}) {
    return Container(
      width: double.infinity,
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
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
            ],
          ),
          const Divider(height: 24),
          child,
        ],
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  const _HeroBanner({
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
      height: 480,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CachedNetworkImage(imageUrl: manga.banner, fit: BoxFit.cover, alignment: Alignment.topCenter),
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [Color(0xEB000000), Color(0xA6000000), Color(0x1A000000)],
              ),
            ),
          ),
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [Color(0xF2F4F4F6), Colors.transparent],
                stops: [0.0, 0.35],
              ),
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 88,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _tag(manga.status, uppercase: true),
                    ...manga.genres.take(3).map((g) => _tag(g)),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  manga.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    height: 1.05,
                    letterSpacing: -0.02,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.star, size: 16, color: AppColors.rating),
                    const SizedBox(width: 4),
                    Text('${manga.rating}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    const Text('  ·  ', style: TextStyle(color: Colors.white54)),
                    Text(manga.author, style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w500)),
                    const Text('  ·  ', style: TextStyle(color: Colors.white54)),
                    Text('${manga.totalChapters} ch.', style: const TextStyle(color: Colors.white70)),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  manga.synopsis,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, height: 1.4, fontSize: 14),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    FilledButton.icon(
                      onPressed: () => context.push('/manga/${manga.slug}'),
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Lire maintenant'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => context.push('/manga/${manga.slug}'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: Colors.white.withValues(alpha: 0.35)),
                        backgroundColor: Colors.white.withValues(alpha: 0.12),
                      ),
                      icon: const Icon(Icons.info_outline),
                      label: const Text('Voir les détails'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (total > 1)
            Positioned(
              bottom: 36,
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
                          width: active ? 20 : 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: active ? AppColors.primary : Colors.white38,
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

  Widget _tag(String label, {bool uppercase = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        uppercase ? label.toUpperCase() : label,
        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.04),
      ),
    );
  }
}


/// One series to resume: cover, title, where the reader stopped, and a progress bar.
class _ContinueCard extends StatelessWidget {
  const _ContinueCard({required this.item});

  final ReadingProgress item;

  @override
  Widget build(BuildContext context) {
    final sameChapter = item.resumeChapter == item.chapterNumber;
    final progress = sameChapter && item.pageCount > 0 ? (item.page + 1) / item.pageCount : 0.0;
    final query = item.resumePage > 0 ? '?page=${item.resumePage + 1}' : '';
    return InkWell(
      onTap: () => context.push('/manga/${item.slug}/chapter/${item.resumeChapter}$query'),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 250,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.bgWhite,
          borderRadius: BorderRadius.circular(10),
          boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 2))],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: CachedNetworkImage(
                imageUrl: OfflineStore.resolveMediaUrl(item.cover).toString(),
                width: 48,
                height: 68,
                fit: BoxFit.cover,
                errorWidget: (_, _, _) => Container(width: 48, height: 68, color: AppColors.border),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(
                    sameChapter
                        ? 'Chapitre ${item.chapterNumber} · page ${item.page + 1}/${item.pageCount}'
                        : 'Chapitre ${item.chapterNumber} terminé · suite : ch. ${item.resumeChapter}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: LinearProgressIndicator(value: progress, minHeight: 4, color: AppColors.primary, backgroundColor: AppColors.border),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const CircleAvatar(radius: 15, backgroundColor: AppColors.primary, child: Icon(Icons.play_arrow, size: 18, color: Colors.white)),
          ],
        ),
      ),
    );
  }
}
