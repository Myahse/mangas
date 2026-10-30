import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../auth/auth_controller.dart';
import '../data/catalog_service.dart';
import '../data/community_service.dart';
import '../data/models.dart';
import '../offline/offline_store.dart';
import '../theme.dart';
import '../widgets/chapter_comments.dart';
import '../widgets/chapter_poll.dart';
import '../widgets/reader_auth_sheet.dart';
import '../widgets/reader_page_overlay.dart';

const _dataSaverKey = 'reader.dataSaver';
const _langKey = 'reader.lang';
const _notesKey = 'reader.showNotes';

/// Pages are shown at this aspect ratio (uploads are normalised to 800 px wide, ~1200-1280 px high),
/// which also gives every page the same height to work out the page being read.
const _pageAspect = 800 / 1200;

class ReaderScreen extends StatefulWidget {
  const ReaderScreen({super.key, required this.slug, required this.chapter, this.resumePage = 0});

  final String slug;
  final int chapter;

  /// 0-based page to open at ("Reprendre la lecture").
  final int resumePage;

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  late Future<_ReaderBundle> _future;
  bool _showChrome = true;
  double _zoom = 1;
  bool _saved = false;
  double? _dlProgress;
  bool _dataSaver = false;

  final ScrollController _scroll = ScrollController();
  int _currentPage = 0;
  int _pageCount = 0;
  Timer? _saveTimer;
  bool _resumed = false;

  // Community translations (remembered language; a chapter without it shows the original) and notes.
  List<Map<String, dynamic>> _languages = const [];
  String _lang = '';
  Map<int, List<Map<String, dynamic>>> _bubblesByPage = const {};
  final Set<String> _peeked = {};
  Map<int, List<Map<String, dynamic>>> _notesByPage = const {};
  bool _showNotes = true;

  @override
  void initState() {
    super.initState();
    _currentPage = widget.resumePage;
    _future = _load();
    _scroll.addListener(_onScroll);
    offlineStore.isSaved(widget.slug, widget.chapter).then((v) {
      if (mounted) setState(() => _saved = v);
    });
    SharedPreferences.getInstance().then((p) {
      if (!mounted) return;
      setState(() {
        _dataSaver = p.getBool(_dataSaverKey) ?? false;
        _showNotes = p.getBool(_notesKey) ?? true;
        _lang = p.getString(_langKey) ?? '';
      });
      _loadCommunityLayers();
    });
  }

  static Map<int, List<Map<String, dynamic>>> _byPage(List<Map<String, dynamic>> items) {
    final out = <int, List<Map<String, dynamic>>>{};
    for (final it in items) {
      final page = it['page'] is num ? (it['page'] as num).toInt() : int.tryParse('${it['page']}') ?? 0;
      (out[page] ??= []).add(it);
    }
    return out;
  }

  /// Languages, the chosen language's bubbles and the notes. Failures leave the plain pages.
  Future<void> _loadCommunityLayers() async {
    try {
      final results = await Future.wait([
        communityService.fetchChapterLanguages(widget.slug, widget.chapter),
        communityService.fetchNotes(widget.slug, widget.chapter),
      ]);
      if (!mounted) return;
      setState(() {
        _languages = results[0];
        _notesByPage = _byPage(results[1]);
      });
      await _loadBubbles();
    } catch (_) {}
  }

  Future<void> _loadBubbles() async {
    final lang = _lang;
    if (lang.isEmpty || !_languages.any((l) => l['code'] == lang)) {
      if (mounted) setState(() => _bubblesByPage = const {});
      return;
    }
    try {
      final bubbles = await communityService.fetchBubbles(widget.slug, widget.chapter, lang);
      if (mounted && _lang == lang) setState(() => _bubblesByPage = _byPage(bubbles));
    } catch (_) {}
  }

  Future<void> _chooseLanguage() async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(
                title: Text('Langue de lecture', style: TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text('Traductions faites par la communauté, validées par le créateur.'),
              ),
              RadioGroup<String>(
                groupValue: _lang,
                onChanged: (v) => Navigator.pop(ctx, v),
                child: Column(
                  children: [
                    const RadioListTile<String>(value: '', title: Text('Version originale')),
                    for (final l in _languages)
                      RadioListTile<String>(
                        value: '${l['code']}',
                        title: Text('${l['name']}'),
                        subtitle: Text('${l['translated']}/${l['bubbles']} bulles traduites'),
                      ),
                  ],
                ),
              ),
              if (_notesByPage.isNotEmpty)
                SwitchListTile(
                  title: const Text('Notes culturelles'),
                  value: _showNotes,
                  onChanged: (v) {
                    setState(() => _showNotes = v);
                    setSheet(() {});
                    SharedPreferences.getInstance().then((p) => p.setBool(_notesKey, v));
                  },
                ),
            ],
          ),
        ),
      ),
    );
    if (choice == null || choice == _lang || !mounted) return;
    setState(() {
      _lang = choice;
      _peeked.clear();
    });
    (await SharedPreferences.getInstance()).setString(_langKey, choice);
    await _loadBubbles();
  }

  void _openNote(Map<String, dynamic> n) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('NOTE CULTURELLE',
                  style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
              const SizedBox(height: 6),
              Text('${n['title'] ?? ''}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              Text('${n['body'] ?? ''}', style: const TextStyle(fontSize: 15, height: 1.5)),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _saveTimer?.cancel();
    if (_pageCount > 0 && authController.isAuthenticated) {
      communityService.saveProgress(widget.slug, widget.chapter, _currentPage, _pageCount);
    }
    _scroll.dispose();
    super.dispose();
  }

  double _pageHeight(BuildContext context) => MediaQuery.sizeOf(context).width * _zoom / _pageAspect;

  double _topPadding(BuildContext context) =>
      (_showChrome ? kToolbarHeight + MediaQuery.paddingOf(context).top : 8) + 8;

  void _onScroll() {
    if (!mounted || _pageCount == 0) return;
    final h = _pageHeight(context);
    final middle = _scroll.offset + MediaQuery.sizeOf(context).height / 2 - _topPadding(context);
    final page = (middle / h).floor().clamp(0, _pageCount - 1);
    if (page != _currentPage) {
      setState(() => _currentPage = page);
      _scheduleSave();
    }
  }

  void _scheduleSave() {
    if (!authController.isAuthenticated) return;
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 1500), () {
      communityService.saveProgress(widget.slug, widget.chapter, _currentPage, _pageCount);
    });
  }

  void _resumeIfNeeded() {
    if (_resumed || widget.resumePage <= 0) return;
    _resumed = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients) return;
      _scroll.jumpTo((widget.resumePage * _pageHeight(context)).clamp(0, _scroll.position.maxScrollExtent));
    });
  }

  Future<void> _toggleDataSaver() async {
    final next = !_dataSaver;
    setState(() => _dataSaver = next);
    (await SharedPreferences.getInstance()).setBool(_dataSaverKey, next);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(next
          ? 'Économie de données activée : images plus légères.'
          : 'Économie de données désactivée : images en pleine qualité.'),
    ));
  }

  Future<void> _download() async {
    if (_saved) {
      context.push('/telechargements/${offlineId(widget.slug, widget.chapter)}');
      return;
    }
    final lite = await showModalBottomSheet<bool>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(title: Text('Télécharger ce chapitre', style: TextStyle(fontWeight: FontWeight.w800))),
            ListTile(
              leading: const Icon(Icons.data_saver_on),
              title: const Text('Économie de données (recommandé)'),
              subtitle: const Text('Environ 70 % plus léger, idéal pour partager.'),
              onTap: () => Navigator.pop(ctx, true),
            ),
            ListTile(
              leading: const Icon(Icons.hd_outlined),
              title: const Text('Qualité originale'),
              onTap: () => Navigator.pop(ctx, false),
            ),
          ],
        ),
      ),
    );
    if (lite == null || !mounted) return;
    setState(() => _dlProgress = 0);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await offlineStore.download(
        widget.slug,
        widget.chapter,
        lite: lite,
        onProgress: (done, total) {
          if (mounted) setState(() => _dlProgress = done / total);
        },
      );
      if (!mounted) return;
      setState(() {
        _saved = true;
        _dlProgress = null;
      });
      messenger.showSnackBar(
        SnackBar(
          content: const Text('Chapitre téléchargé. Lisible sans connexion.'),
          action: SnackBarAction(label: 'Envoyer', onPressed: () => context.push('/telechargements/${offlineId(widget.slug, widget.chapter)}/envoyer')),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _dlProgress = null);
      messenger.showSnackBar(SnackBar(content: Text(e is BackendException ? e.message : 'Téléchargement impossible : $e')));
    }
  }

  Future<_ReaderBundle> _load() async {
    final m = await catalogService.fetchMangaBySlug(widget.slug);
    try {
      final pages = await catalogService.fetchPages(widget.slug, widget.chapter);
      _pageCount = pages.length;
      // Counts the view and today's reading day (streak); a weekly streak pays coins.
      communityService.recordView(widget.slug, widget.chapter).then((reward) {
        if (reward > 0 && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Série de lecture : encore une semaine d’affilée, +$reward coins !'),
          ));
        }
      });
      if (authController.isAuthenticated) {
        communityService.saveProgress(widget.slug, widget.chapter, widget.resumePage, pages.length);
      }
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

        // Relative storage URLs from the API resolved against the API host (and ?lite=1 in data saver mode).
        final urls = pages.map((p) => OfflineStore.resolveMediaUrl(p.url, lite: _dataSaver).toString()).toList();
        final bottom = MediaQuery.paddingOf(context).bottom;
        final hasNext = widget.chapter < m.totalChapters;
        _resumeIfNeeded();

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
                      Text(m.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 14)),
                      Text(
                        'Ch. ${widget.chapter} · page ${(_currentPage + 1).clamp(1, urls.length)}/${urls.length}',
                        style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.6)),
                      ),
                    ],
                  ),
                  leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
                  actions: [
                    if (_languages.isNotEmpty || _notesByPage.isNotEmpty)
                      IconButton(
                        tooltip: 'Langue et notes',
                        onPressed: _chooseLanguage,
                        icon: Icon(Icons.translate, color: _bubblesByPage.isNotEmpty ? AppColors.primary : Colors.white),
                      ),
                    IconButton(
                      tooltip: 'Économie de données',
                      onPressed: _toggleDataSaver,
                      icon: Icon(_dataSaver ? Icons.data_saver_on : Icons.data_saver_off,
                          color: _dataSaver ? AppColors.primary : Colors.white),
                    ),
                    if (_dlProgress != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(value: _dlProgress, strokeWidth: 2.5, color: Colors.white),
                        ),
                      )
                    else
                      IconButton(
                        tooltip: _saved ? 'Téléchargé · lire hors ligne' : 'Télécharger',
                        onPressed: _download,
                        icon: Icon(_saved ? Icons.download_done : Icons.download_outlined),
                      ),
                    IconButton(
                      onPressed: () => setState(() => _zoom = (_zoom - 0.1).clamp(0.6, 1.3)),
                      icon: const Icon(Icons.remove),
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
                controller: _scroll,
                padding: EdgeInsets.only(
                  top: _topPadding(context),
                  bottom: (_showChrome ? 72 + bottom : 16) + bottom,
                ),
                itemCount: urls.length + 1,
                itemBuilder: (context, i) {
                  if (i == urls.length) {
                    return _ChapterEnd(
                      slug: widget.slug,
                      chapter: widget.chapter,
                      nextChapter: hasNext ? widget.chapter + 1 : null,
                    );
                  }
                  return Center(
                    child: SizedBox(
                      width: MediaQuery.sizeOf(context).width * _zoom,
                      child: AspectRatio(
                        aspectRatio: _pageAspect,
                        child: ReaderPageImage(
                          url: urls[i],
                          bubbles: _bubblesByPage[i + 1] ?? const [],
                          notes: _showNotes ? _notesByPage[i + 1] ?? const [] : const [],
                          peeked: _peeked,
                          onTapBubble: (id) => setState(() => _peeked.contains(id) ? _peeked.remove(id) : _peeked.add(id)),
                          onTapNote: _openNote,
                        ),
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
                              heightFactor: 1,
                              child: FilledButton.tonal(
                                onPressed: () => context.push('/manga/${widget.slug}'),
                                child: const Text('Chapitres'),
                              ),
                            ),
                          ),
                          if (hasNext)
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

/// End of the chapter: next chapter (or "à jour"), then the readers' comments.
class _ChapterEnd extends StatelessWidget {
  const _ChapterEnd({required this.slug, required this.chapter, required this.nextChapter});

  final String slug;
  final int chapter;
  final int? nextChapter;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Column(
        children: [
          Text('Fin du chapitre $chapter',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 12),
          if (nextChapter != null)
            FilledButton.icon(
              onPressed: () => context.go('/manga/$slug/chapter/$nextChapter'),
              icon: const Icon(Icons.chevron_right),
              label: const Text('Chapitre suivant'),
            )
          else ...[
            Text('Vous êtes à jour. Le prochain chapitre arrive bientôt.',
                textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 13)),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () => context.push('/manga/$slug'), child: const Text('Tous les chapitres')),
          ],
          const SizedBox(height: 20),
          ChapterPollCard(slug: slug, chapter: chapter),
          ChapterComments(slug: slug, chapter: chapter),
        ],
      ),
    );
  }
}

class _ReaderBundle {
  _ReaderBundle(this.manga, this.pages, this.error);
  final Manga manga;
  final List<PageItem> pages;
  final Object? error;
}
