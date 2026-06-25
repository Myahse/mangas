import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../data/catalog_service.dart';
import '../data/models.dart';
import '../theme.dart';
import '../widgets/reader_auth_sheet.dart';

class ReaderScreen extends StatefulWidget {
  const ReaderScreen({super.key, required this.slug, required this.chapter});

  final String slug;
  final int chapter;

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  late Future<_ReaderBundle> _future;
  bool _showChrome = true;
  double _zoom = 1;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_ReaderBundle> _load() async {
    final m = await catalogService.fetchMangaBySlug(widget.slug);
    try {
      final pages = await catalogService.fetchPages(widget.slug, widget.chapter);
      return _ReaderBundle(m, pages, null);
    } catch (e) {
      return _ReaderBundle(m, const [], e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_ReaderBundle>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snap.hasError || snap.data == null) {
          return Scaffold(
            appBar: AppBar(),
            body: Center(child: Text('${snap.error}')),
          );
        }
        final bundle = snap.data!;
        final m = bundle.manga;
        final err = bundle.error;
        final pages = bundle.pages;

        if (err != null) {
          final code = err is BackendException ? err.statusCode : null;
          return Scaffold(
            appBar: AppBar(title: Text(m.title)),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      err is BackendException ? err.message : '$err',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    if (code == 401 || code == 403)
                      FilledButton(
                        onPressed: () async {
                          await showReaderAuthSheet(context);
                          if (mounted) setState(() => _future = _load());
                        },
                        child: const Text('Se connecter'),
                      )
                    else
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

        if (pages.isEmpty) {
          return Scaffold(
            appBar: AppBar(title: Text(m.title)),
            body: const Center(child: Text('Aucune page pour ce chapitre.')),
          );
        }

        final urls = pages.map((p) => p.url).toList();
        final bottom = MediaQuery.paddingOf(context).bottom;

        return Scaffold(
          backgroundColor: AppColors.readerBg,
          extendBodyBehindAppBar: true,
          appBar: _showChrome
              ? AppBar(
                  backgroundColor: Colors.black.withValues(alpha: 0.85),
                  foregroundColor: Colors.white,
                  title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                      Text(
                        'Ch. ${widget.chapter} · ${urls.length} pages',
                        style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.6)),
                      ),
                    ],
                  ),
                  leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
                  actions: [
                    IconButton(
                      onPressed: () => setState(() => _zoom = (_zoom - 0.1).clamp(0.6, 1.3)),
                      icon: const Icon(Icons.remove),
                    ),
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Text('${(_zoom * 100).round()}%', style: const TextStyle(fontSize: 12, color: Colors.white)),
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() => _zoom = (_zoom + 0.1).clamp(0.6, 1.3)),
                      icon: const Icon(Icons.add),
                    ),
                  ],
                )
              : null,
          body: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _showChrome = !_showChrome),
            child: NotificationListener<UserScrollNotification>(
              onNotification: (_) {
                setState(() => _showChrome = true);
                return false;
              },
              child: ListView.builder(
                padding: EdgeInsets.only(
                  top: (_showChrome ? kToolbarHeight + MediaQuery.paddingOf(context).top : 8) + 8,
                  bottom: (_showChrome ? 72 + bottom : 16) + bottom,
                ),
                itemCount: urls.length,
                itemBuilder: (context, i) {
                  return Center(
                    child: SizedBox(
                      width: MediaQuery.sizeOf(context).width * _zoom,
                      child: AspectRatio(
                        aspectRatio: 800 / 1200,
                        child: CachedNetworkImage(imageUrl: urls[i], fit: BoxFit.contain),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          bottomNavigationBar: _showChrome
              ? Material(
                  color: Colors.black.withValues(alpha: 0.88),
                  child: SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                      child: Row(
                        children: [
                          if (widget.chapter > 1)
                            TextButton.icon(
                              onPressed: () => context.go('/manga/${widget.slug}/chapter/${widget.chapter - 1}'),
                              icon: const Icon(Icons.chevron_left, color: Colors.white),
                              label: Text('Ch. ${widget.chapter - 1}', style: const TextStyle(color: Colors.white)),
                            )
                          else
                            const SizedBox(width: 8),
                          Expanded(
                            child: Center(
                              child: FilledButton.tonal(
                                onPressed: () => context.push('/manga/${widget.slug}'),
                                child: const Text('Chapitres'),
                              ),
                            ),
                          ),
                          if (widget.chapter < m.totalChapters)
                            TextButton.icon(
                              onPressed: () => context.go('/manga/${widget.slug}/chapter/${widget.chapter + 1}'),
                              icon: const Icon(Icons.chevron_right, color: Colors.white),
                              label: Text('Ch. ${widget.chapter + 1}', style: const TextStyle(color: Colors.white)),
                            )
                          else
                            const SizedBox(width: 8),
                        ],
                      ),
                    ),
                  ),
                )
              : null,
        );
      },
    );
  }
}

class _ReaderBundle {
  _ReaderBundle(this.manga, this.pages, this.error);
  final Manga manga;
  final List<PageItem> pages;
  final Object? error;
}
