import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../offline/offline_store.dart';
import '../theme.dart';

/// Reads a chapter saved on the phone, with no network. Every page carries a small MangAfric
/// mark and the chapter ends with an invite, so a shared chapter brings the reader to the app.
class OfflineReaderScreen extends StatefulWidget {
  const OfflineReaderScreen({super.key, required this.id});

  final String id;

  @override
  State<OfflineReaderScreen> createState() => _OfflineReaderScreenState();
}

class _OfflineReaderScreenState extends State<OfflineReaderScreen> {
  late final Future<(OfflineChapter, List<File>)?> _future = _load();
  bool _showChrome = true;

  Future<(OfflineChapter, List<File>)?> _load() async {
    final c = await offlineStore.get(widget.id);
    if (c == null) return null;
    final files = [for (final p in c.pageFiles) await offlineStore.pageFile(c, p)];
    return (c, files);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<(OfflineChapter, List<File>)?>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final data = snap.data;
        if (data == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: Text('Ce chapitre n’est plus sur ce téléphone.')),
          );
        }
        final (c, files) = data;
        final top = MediaQuery.paddingOf(context).top;
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
                      Text(c.mangaTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14)),
                      Text(
                        'Ch. ${c.chapterNumber} · ${files.length} pages · hors ligne',
                        style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.6)),
                      ),
                    ],
                  ),
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: () => context.canPop() ? context.pop() : context.go('/telechargements'),
                  ),
                )
              : null,
          body: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _showChrome = !_showChrome),
            child: ListView.builder(
              padding: EdgeInsets.only(top: (_showChrome ? kToolbarHeight + top : 8) + 8, bottom: 24),
              itemCount: files.length + 1,
              itemBuilder: (context, i) {
                if (i == files.length) return _EndOfChapterInvite(chapter: c);
                return Stack(
                  children: [
                    Image.file(
                      files[i],
                      width: double.infinity,
                      fit: BoxFit.fitWidth,
                      errorBuilder: (_, _, _) => const AspectRatio(
                        aspectRatio: 800 / 1200,
                        child: Center(child: Icon(Icons.broken_image, color: Colors.white54)),
                      ),
                    ),
                    const Positioned(right: 8, bottom: 8, child: _Watermark()),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }
}

class _Watermark extends StatelessWidget {
  const _Watermark();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.45),
          borderRadius: BorderRadius.circular(AppRadii.sm),
        ),
        child: const Text(
          'MangAfric',
          style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.3),
        ),
      ),
    );
  }
}

class _EndOfChapterInvite extends StatelessWidget {
  const _EndOfChapterInvite({required this.chapter});

  final OfflineChapter chapter;

  @override
  Widget build(BuildContext context) {
    final c = chapter;
    return ListenableBuilder(
      listenable: authController,
      builder: (context, _) {
        final authed = authController.isAuthenticated;
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 24, 16, 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.bgDark2,
            borderRadius: BorderRadius.circular(AppRadii.lg),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Image.asset('assets/images/magafrik-logo.png', height: 48, errorBuilder: (_, _, _) => const SizedBox.shrink()),
              const SizedBox(height: 12),
              Text(
                c.isReceived
                    ? 'Chapitre partagé par ${c.receivedFrom} avec MangAfric'
                    : 'Fin du chapitre ${c.chapterNumber}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Text(
                authed
                    ? 'Retrouvez la suite de ${c.mangaTitle} sur MangAfric.'
                    : 'Le manga africain, gratuit pour commencer. Créez votre compte pour lire la suite de ${c.mangaTitle} et gagner des coins.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white.withValues(alpha: 0.75), height: 1.45, fontSize: 14),
              ),
              const SizedBox(height: 16),
              if (!authed)
                FilledButton(onPressed: () => context.push('/register'), child: const Text('Créer mon compte gratuit')),
              const SizedBox(height: 8),
              OutlinedButton(
                style: OutlinedButton.styleFrom(foregroundColor: Colors.white),
                onPressed: () => context.push('/manga/${c.slug}'),
                child: const Text('Voir la série (internet requis)'),
              ),
            ],
          ),
        );
      },
    );
  }
}
