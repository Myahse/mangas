import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../data/catalog_service.dart';
import '../data/community_service.dart';
import '../data/models.dart';
import '../theme.dart';
import '../widgets/manga_card.dart';
import '../widgets/reader_auth_sheet.dart';
import '../widgets/section_header.dart';

class MangaDetailScreen extends StatefulWidget {
  const MangaDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  State<MangaDetailScreen> createState() => _MangaDetailScreenState();
}

class _MangaDetailScreenState extends State<MangaDetailScreen> {
  late Future<_DetailBundle> _future;
  final _chapterSearch = TextEditingController();
  bool _following = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
    if (authController.isAuthenticated) {
      communityService.isFollowing(widget.slug).then((v) {
        if (mounted) setState(() => _following = v);
      }).catchError((_) {});
    }
  }

  /// Follow the series: stored server-side, a new chapter then shows up in the notifications.
  Future<void> _toggleFollow() async {
    if (!authController.isAuthenticated) {
      await showReaderAuthSheet(context);
      return;
    }
    final next = !_following;
    setState(() => _following = next);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final v = await communityService.setFollowing(widget.slug, next);
      if (!mounted) return;
      setState(() => _following = v);
      if (v) messenger.showSnackBar(const SnackBar(content: Text('Série suivie : vous serez prévenu de chaque nouveau chapitre.')));
    } catch (_) {
      if (mounted) setState(() => _following = !next);
    }
  }

  @override
  void dispose() {
    _chapterSearch.dispose();
    super.dispose();
  }

  Future<_DetailBundle> _load() async {
    final m = await catalogService.fetchMangaBySlug(widget.slug);
    final ch = await catalogService.fetchChapters(widget.slug);
    List<Manga> related = [];
    try {
      related = (await catalogService.fetchPopularManga(count: 6))
          .where((x) => x.slug != widget.slug)
          .take(6)
          .toList();
    } catch (_) {}
    return _DetailBundle(m, ch, related);
  }

  List<ChapterItem> _filterChapters(List<ChapterItem> chapters) {
    final q = _chapterSearch.text.trim().toLowerCase();
    if (q.isEmpty) return chapters;
    return chapters
        .where((c) => '${c.number}'.contains(q) || c.title.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_DetailBundle>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
        }
        if (snap.hasError) {
          return Scaffold(
            appBar: AppBar(),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${snap.error}'),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => setState(() => _future = _load()),
                      child: const Text('Réessayer'),
                    ),
                  ],
                ),
              ),
            ),
          );
        }
        final bundle = snap.data!;
        final m = bundle.manga;
        final chapters = bundle.chapters;
        final related = bundle.related;
        final filtered = _filterChapters(chapters);
        final firstCh = chapters.isEmpty ? 1 : chapters.map((c) => c.number).reduce((a, b) => a < b ? a : b);
        final lastCh = chapters.isEmpty ? 1 : chapters.map((c) => c.number).reduce((a, b) => a > b ? a : b);

        return Scaffold(
          backgroundColor: AppColors.bgLight,
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.navBg.withValues(alpha: 0.92),
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => context.pop(),
                ),
                title: Text(m.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                actions: [
                  IconButton(
                    tooltip: _following ? 'Ne plus suivre' : 'Suivre la série',
                    onPressed: _toggleFollow,
                    icon: Icon(_following ? Icons.favorite : Icons.favorite_border,
                        color: _following ? AppColors.primary : null),
                  ),
                ],
              ),
              SliverToBoxAdapter(
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    SizedBox(
                      height: 220,
                      width: double.infinity,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          CachedNetworkImage(imageUrl: m.banner, fit: BoxFit.cover),
                          Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [AppColors.bgLight, Color(0x80F4F4F6), Colors.transparent],
                                stops: [0.0, 0.6, 1.0],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 120, 20, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(AppRadii.md),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.25),
                                      blurRadius: 40,
                                      offset: const Offset(0, 12),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(AppRadii.md),
                                  child: CachedNetworkImage(imageUrl: m.cover, width: 130, height: 182, fit: BoxFit.cover),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Accueil / ${m.title}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        m.title,
                                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, height: 1.1),
                                      ),
                                      const SizedBox(height: 10),
                                      _infoRow(Icons.person_outline, m.author),
                                      _infoRow(Icons.menu_book_outlined, '${m.totalChapters} chapitres'),
                                      _infoRow(Icons.visibility_outlined, m.views),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: m.genres.map((g) {
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                decoration: BoxDecoration(
                                  color: AppColors.bgWhite,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: AppColors.border, width: 1.5),
                                ),
                                child: Text(g, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                            decoration: BoxDecoration(
                              color: AppColors.bgWhite,
                              borderRadius: BorderRadius.circular(AppRadii.md),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _stat('Note', '${m.rating}', icon: Icons.star, color: AppColors.rating),
                                _divider(),
                                _stat('Chapitres', '${m.totalChapters}'),
                                _divider(),
                                _stat('Statut', m.status),
                                _divider(),
                                _stat('Année', '${m.year}'),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(m.synopsis, style: const TextStyle(fontSize: 15, height: 1.5, color: AppColors.textSecondary)),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton.icon(
                                  onPressed: chapters.isEmpty ? null : () => context.push('/manga/${widget.slug}/chapter/$firstCh'),
                                  icon: const Icon(Icons.play_arrow),
                                  label: Text(chapters.isEmpty ? 'Aucun chapitre' : 'Lire le Ch. $firstCh'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: chapters.isEmpty ? null : () => context.push('/manga/${widget.slug}/chapter/$lastCh'),
                                  child: Text('Dernier ch. $lastCh'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.bgWhite,
                      borderRadius: BorderRadius.circular(AppRadii.lg),
                      border: Border.all(color: AppColors.border),
                      boxShadow: AppShadows.card,
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: TextField(
                            controller: _chapterSearch,
                            decoration: const InputDecoration(
                              hintText: 'Rechercher un chapitre…',
                              prefixIcon: Icon(Icons.search),
                              isDense: true,
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        if (filtered.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(24),
                            child: Text('Aucun chapitre trouvé'),
                          )
                        else
                          ...List.generate(filtered.length, (i) {
                            final ch = filtered[i];
                            return Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => context.push('/manga/${widget.slug}/chapter/${ch.number}'),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  decoration: BoxDecoration(
                                    border: i < filtered.length - 1
                                        ? const Border(bottom: BorderSide(color: AppColors.border))
                                        : null,
                                  ),
                                  child: Row(
                                    children: [
                                      Text(
                                        'Ch. ${ch.number}',
                                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary, fontSize: 14),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(ch.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                                      ),
                                      const Icon(Icons.chevron_right, color: AppColors.textMuted),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                ),
              ),
              if (related.isNotEmpty) ...[
                SliverToBoxAdapter(child: SectionHeader(title: 'Vous pourriez aussi aimer')),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 32),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.44,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => MangaCard(manga: related[i]),
                      childCount: related.length,
                    ),
                  ),
                ),
              ] else
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
        );
      },
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 15, color: AppColors.primary),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, {IconData? icon, Color? color}) {
    return Column(
      children: [
        if (icon != null)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: color ?? AppColors.primary),
              const SizedBox(width: 4),
              Text(value, style: TextStyle(fontWeight: FontWeight.w800, color: color ?? AppColors.textDark)),
            ],
          )
        else
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _divider() => Container(width: 1, height: 32, color: AppColors.border);
}

class _DetailBundle {
  _DetailBundle(this.manga, this.chapters, this.related);
  final Manga manga;
  final List<ChapterItem> chapters;
  final List<Manga> related;
}
