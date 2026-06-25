import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/catalog_service.dart';
import '../data/models.dart';
import '../theme.dart';

class MangaDetailScreen extends StatefulWidget {
  const MangaDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  State<MangaDetailScreen> createState() => _MangaDetailScreenState();
}

class _MangaDetailScreenState extends State<MangaDetailScreen> {
  late Future<_DetailBundle> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_DetailBundle> _load() async {
    final m = await catalogService.fetchMangaBySlug(widget.slug);
    final ch = await catalogService.fetchChapters(widget.slug);
    return _DetailBundle(m, ch);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_DetailBundle>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
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
        final firstCh = chapters.isEmpty ? 1 : chapters.map((c) => c.number).reduce((a, b) => a < b ? a : b);

        return Scaffold(
          backgroundColor: AppColors.bgLight,
          appBar: AppBar(
            title: Text(m.title, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
          body: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: CachedNetworkImage(
                  imageUrl: m.banner,
                  height: 180,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: (_, url) => const ColoredBox(color: Colors.black12),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: CachedNetworkImage(imageUrl: m.cover, width: 110, height: 165, fit: BoxFit.cover),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(m.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                            const SizedBox(height: 6),
                            Text(m.author, style: const TextStyle(color: AppColors.textSecondary)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.star, color: AppColors.rating, size: 18),
                                const SizedBox(width: 4),
                                Text('${m.rating}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.rating)),
                                Text(' · ${m.status}', style: const TextStyle(color: AppColors.textMuted)),
                              ],
                            ),
                            Text('${m.totalChapters} chapitres', style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: FilledButton.icon(
                    onPressed: chapters.isEmpty
                        ? null
                        : () => context.push('/manga/${widget.slug}/chapter/$firstCh'),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary, minimumSize: const Size(double.infinity, 48)),
                    icon: const Icon(Icons.menu_book),
                    label: Text(
                      chapters.isEmpty ? 'Aucun chapitre' : 'Lire depuis le ch. $firstCh',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  child: Text(m.synopsis, style: const TextStyle(fontSize: 15, height: 1.45)),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Row(
                    children: [
                      Container(width: 4, height: 18, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(2))),
                      const SizedBox(width: 8),
                      const Text('Chapitres', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Card(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      for (var i = 0; i < chapters.length; i++) ...[
                        ListTile(
                          title: Text('Ch. ${chapters[i].number}', style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text(chapters[i].title, maxLines: 1, overflow: TextOverflow.ellipsis),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.push('/manga/${widget.slug}/chapter/${chapters[i].number}'),
                        ),
                        if (i < chapters.length - 1) const Divider(height: 1),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DetailBundle {
  _DetailBundle(this.manga, this.chapters);
  final Manga manga;
  final List<ChapterItem> chapters;
}
