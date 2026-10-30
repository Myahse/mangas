import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../offline/nearby_share.dart';
import '../offline/offline_store.dart';
import '../theme.dart';
import '../widgets/account_page_layout.dart';

/// Chapters saved on the phone (downloaded here or received from a nearby phone).
class DownloadsScreen extends StatefulWidget {
  const DownloadsScreen({super.key});

  @override
  State<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends State<DownloadsScreen> {
  late Future<List<OfflineChapter>> _future;

  @override
  void initState() {
    super.initState();
    _future = offlineStore.list();
    offlineStore.addListener(_reload);
  }

  @override
  void dispose() {
    offlineStore.removeListener(_reload);
    super.dispose();
  }

  void _reload() {
    if (mounted) setState(() => _future = offlineStore.list());
  }

  Future<void> _delete(OfflineChapter c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce chapitre ?'),
        content: Text('${c.mangaTitle} · Ch. ${c.chapterNumber} sera retiré de ce téléphone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (ok == true) await offlineStore.delete(c.id);
  }

  @override
  Widget build(BuildContext context) {
    return AccountPageLayout(
      title: 'Téléchargements',
      lead: 'Lisez sans connexion et envoyez un chapitre à un ami proche, même sans internet.',
      child: FutureBuilder<List<OfflineChapter>>(
        future: _future,
        builder: (context, snap) {
          final items = snap.data ?? const <OfflineChapter>[];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FilledButton.icon(
                onPressed: () => context.push('/telechargements/recevoir'),
                icon: const Icon(Icons.call_received),
                label: const Text('Recevoir un chapitre'),
              ),
              const SizedBox(height: 16),
              if (snap.connectionState != ConnectionState.done)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
              else if (items.isEmpty)
                const AccountCard(
                  child: Text(
                    'Aucun chapitre téléchargé. Ouvrez un chapitre et touchez l’icône de téléchargement pour le garder sur ce téléphone.',
                    style: TextStyle(color: AppColors.textSecondary, height: 1.45, fontSize: 14),
                  ),
                )
              else
                for (final c in items) ...[
                  _DownloadTile(chapter: c, onDelete: () => _delete(c)),
                  const SizedBox(height: 10),
                ],
            ],
          );
        },
      ),
    );
  }
}

class _DownloadTile extends StatelessWidget {
  const _DownloadTile({required this.chapter, required this.onDelete});

  final OfflineChapter chapter;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final c = chapter;
    return AccountCard(
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadii.sm),
            child: SizedBox(width: 48, height: 68, child: _OfflineCover(chapter: c)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: InkWell(
              onTap: () => context.push('/telechargements/${c.id}'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c.mangaTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(
                    'Ch. ${c.chapterNumber}${c.chapterTitle.isNotEmpty ? ' · ${c.chapterTitle}' : ''} · ${c.pageFiles.length} pages',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    c.isReceived ? 'Reçu de ${c.receivedFrom}' : (c.lite ? 'Téléchargé · économie de données' : 'Téléchargé'),
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
          if (!c.isReceived)
            IconButton(
              tooltip: 'Envoyer à un ami',
              icon: const Icon(Icons.share_outlined),
              onPressed: () => context.push('/telechargements/${c.id}/envoyer'),
            ),
          IconButton(tooltip: 'Supprimer', icon: const Icon(Icons.delete_outline), onPressed: onDelete),
        ],
      ),
    );
  }
}

class _OfflineCover extends StatelessWidget {
  const _OfflineCover({required this.chapter});

  final OfflineChapter chapter;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<File?>(
      future: offlineStore.coverFile(chapter),
      builder: (context, snap) {
        final f = snap.data;
        if (f == null) return const ColoredBox(color: AppColors.border, child: Icon(Icons.menu_book, color: AppColors.textMuted));
        return Image.file(f, fit: BoxFit.cover, errorBuilder: (_, _, _) => const ColoredBox(color: AppColors.border));
      },
    );
  }
}

/// Sender: pick a nearby phone that has "Recevoir un chapitre" open.
class ShareSendScreen extends StatefulWidget {
  const ShareSendScreen({super.key, required this.id});

  final String id;

  @override
  State<ShareSendScreen> createState() => _ShareSendScreenState();
}

class _ShareSendScreenState extends State<ShareSendScreen> {
  NearbySender? _sender;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final c = await offlineStore.get(widget.id);
    if (!mounted) return;
    if (c == null || c.isReceived) {
      setState(() => _error = 'Seuls les chapitres que vous avez téléchargés vous-même peuvent être envoyés.');
      return;
    }
    if (!nearbySupported) {
      setState(() => _error = 'Le partage sans internet est disponible sur Android pour le moment.');
      return;
    }
    final s = NearbySender(c);
    setState(() => _sender = s);
    await s.start();
  }

  @override
  void dispose() {
    _sender?.stop();
    _sender?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = _sender;
    return AccountPageLayout(
      title: 'Envoyer à un ami',
      lead: 'Sur l’autre téléphone, ouvrez MangAfric › Téléchargements › Recevoir un chapitre. Les deux téléphones doivent être proches, avec le Bluetooth et le Wi-Fi activés.',
      child: _error != null || s == null
          ? AccountCard(child: Text(_error ?? 'Préparation…', style: const TextStyle(height: 1.45)))
          : ListenableBuilder(
              listenable: s,
              builder: (context, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AccountCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${s.chapter.mangaTitle} · Ch. ${s.chapter.chapterNumber}',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        const SizedBox(height: 8),
                        Text(s.status,
                            style: TextStyle(
                                color: s.failed ? AppColors.accentDark : AppColors.textSecondary, height: 1.4)),
                        if (s.progress != null) ...[
                          const SizedBox(height: 10),
                          LinearProgressIndicator(value: s.progress, color: AppColors.primary),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (s.done || s.failed)
                    FilledButton(onPressed: () => context.pop(), child: const Text('Terminé'))
                  else if (s.progress == null)
                    for (final p in s.peers)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: AccountCard(
                          child: ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.smartphone, color: AppColors.primary),
                            title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                            trailing: const Text('Envoyer',
                                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800)),
                            onTap: () => s.sendTo(p),
                          ),
                        ),
                      ),
                ],
              ),
            ),
    );
  }
}

/// Receiver: visible to nearby senders until a chapter arrives.
class ShareReceiveScreen extends StatefulWidget {
  const ShareReceiveScreen({super.key});

  @override
  State<ShareReceiveScreen> createState() => _ShareReceiveScreenState();
}

class _ShareReceiveScreenState extends State<ShareReceiveScreen> {
  final _receiver = NearbyReceiver();

  @override
  void initState() {
    super.initState();
    _receiver.confirm = _confirm;
    if (nearbySupported) _receiver.start();
  }

  @override
  void dispose() {
    _receiver.stop();
    _receiver.dispose();
    super.dispose();
  }

  Future<bool> _confirm(String name, String code) async {
    if (!mounted) return false;
    final ok = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Recevoir un chapitre ?'),
        content: Text('$name veut vous envoyer un chapitre.\nCode de vérification : $code'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Refuser')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Accepter')),
        ],
      ),
    );
    return ok == true;
  }

  @override
  Widget build(BuildContext context) {
    return AccountPageLayout(
      title: 'Recevoir un chapitre',
      lead: 'Demandez à votre ami de toucher « Envoyer à un ami » sur un chapitre téléchargé. Pas besoin d’internet.',
      child: !nearbySupported
          ? const AccountCard(child: Text('Le partage sans internet est disponible sur Android pour le moment.'))
          : ListenableBuilder(
              listenable: _receiver,
              builder: (context, _) {
                final got = _receiver.received;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    AccountCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_receiver.status,
                              style: TextStyle(
                                  color: _receiver.failed ? AppColors.accentDark : AppColors.textSecondary,
                                  height: 1.4)),
                          if (_receiver.progress != null) ...[
                            const SizedBox(height: 10),
                            LinearProgressIndicator(value: _receiver.progress, color: AppColors.primary),
                          ] else if (!_receiver.failed) ...[
                            const SizedBox(height: 10),
                            const LinearProgressIndicator(color: AppColors.primary),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (got != null)
                      FilledButton(
                        onPressed: () => context.pushReplacement('/telechargements/${got.id}'),
                        child: Text('Lire ${got.mangaTitle} · Ch. ${got.chapterNumber}'),
                      ),
                  ],
                );
              },
            ),
    );
  }
}
