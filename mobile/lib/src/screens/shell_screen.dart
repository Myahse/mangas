import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../data/catalog_service.dart';
import '../data/models.dart';
import '../notifications/notification_controller.dart';
import '../theme.dart';
import '../config/api_endpoint_sheet.dart';
import '../widgets/reader_auth_sheet.dart';

class ReaderShellScreen extends StatefulWidget {
  const ReaderShellScreen({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  State<ReaderShellScreen> createState() => _ReaderShellScreenState();
}

class _ReaderShellScreenState extends State<ReaderShellScreen> {
  int? _walletBalance;

  @override
  void initState() {
    super.initState();
    authController.addListener(_onAuthChanged);
    notificationController.startPolling();
    _refreshWallet();
  }

  @override
  void dispose() {
    authController.removeListener(_onAuthChanged);
    notificationController.disposePolling();
    super.dispose();
  }

  void _onAuthChanged() {
    _refreshWallet();
  }

  Future<void> _refreshWallet() async {
    if (!authController.isAuthenticated) {
      if (mounted) setState(() => _walletBalance = null);
      return;
    }
    try {
      final w = await catalogService.fetchWallet();
      final b = (w['balance'] as num?)?.toInt();
      if (mounted) setState(() => _walletBalance = b);
    } catch (_) {
      if (mounted) setState(() => _walletBalance = null);
    }
  }

  Future<void> _openSearch() async {
    final slug = await showSearch<String>(
      context: context,
      delegate: _MangaSearchDelegate(),
    );
    if (!mounted || slug == null || slug.isEmpty) return;
    context.push('/manga/$slug');
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: authController,
      builder: (context, _) {
        final user = authController.user;
        final authed = authController.isAuthenticated;

        return Scaffold(
          appBar: AppBar(
            title: RichText(
              text: const TextSpan(
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                children: [
                  TextSpan(text: 'Mang', style: TextStyle(color: AppColors.textDark)),
                  TextSpan(text: 'Afrik', style: TextStyle(color: AppColors.primary)),
                ],
              ),
            ),
            actions: [
              IconButton(icon: const Icon(Icons.search), tooltip: 'Rechercher', onPressed: _openSearch),
              if (authed)
                ListenableBuilder(
                  listenable: notificationController,
                  builder: (context, _) {
                    final unread = notificationController.unreadCount;
                    return IconButton(
                      tooltip: 'Notifications',
                      onPressed: () => context.push('/notifications'),
                      icon: Badge(
                        isLabelVisible: unread > 0,
                        label: Text(unread > 99 ? '99+' : '$unread'),
                        child: const Icon(Icons.notifications_outlined),
                      ),
                    );
                  },
                ),
              if (authed && _walletBalance != null)
                Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.monetization_on_outlined, size: 18, color: AppColors.primary),
                        const SizedBox(width: 2),
                        Text(
                          '$_walletBalance',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              if (!authed)
                TextButton(
                  onPressed: () => showReaderAuthSheet(context),
                  child: const Text('Connexion'),
                )
              else
                PopupMenuButton<String>(
                  tooltip: 'Menu compte',
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.person_outline, size: 22),
                        const SizedBox(width: 4),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 120),
                          child: Text(
                            user?.displayName ?? '',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                        ),
                        const Icon(Icons.arrow_drop_down, size: 20),
                      ],
                    ),
                  ),
                  onSelected: (value) async {
                    switch (value) {
                      case 'logout':
                        await authController.logout();
                        break;
                      case 'compte':
                        if (context.mounted) context.push('/compte');
                        break;
                      case 'profil':
                        if (context.mounted) context.push('/compte/profil');
                        break;
                      case 'store':
                        if (context.mounted) context.push('/store');
                        break;
                      case 'abos':
                        if (context.mounted) context.push('/compte/abonnements');
                        break;
                      case 'fav':
                        if (context.mounted) context.push('/compte/favoris');
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(value: 'compte', child: Text('Mon espace')),
                    const PopupMenuItem(value: 'profil', child: Text('Mon profil')),
                    const PopupMenuItem(value: 'store', child: Text('Boutique (coins)')),
                    const PopupMenuItem(value: 'abos', child: Text('Mes abonnements')),
                    const PopupMenuItem(value: 'fav', child: Text('Favoris')),
                    const PopupMenuDivider(),
                    const PopupMenuItem(value: 'logout', child: Text('Déconnexion')),
                  ],
                ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                tooltip: 'Plus',
                onSelected: (value) async {
                  if (value == 'api') {
                    final ok = await showApiEndpointEditor(context);
                    if (ok && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('URL du serveur mise à jour. Sur l’accueil, touchez Réessayer si la liste ne charge pas.'),
                        ),
                      );
                    }
                  }
                },
                itemBuilder: (context) => const [
                  PopupMenuItem(value: 'api', child: Text('URL du serveur…')),
                ],
              ),
            ],
          ),
          body: widget.navigationShell,
          bottomNavigationBar: NavigationBar(
            selectedIndex: widget.navigationShell.currentIndex,
            onDestinationSelected: (i) {
              widget.navigationShell.goBranch(
                i,
                initialLocation: i == widget.navigationShell.currentIndex,
              );
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Accueil',
              ),
              NavigationDestination(
                icon: Icon(Icons.search_outlined),
                selectedIcon: Icon(Icons.search),
                label: 'Explorer',
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MangaSearchDelegate extends SearchDelegate<String> {
  _MangaSearchDelegate() : _catalog = catalogService.fetchAllManga();

  final Future<List<Manga>> _catalog;

  @override
  String get searchFieldLabel => 'Rechercher…';

  @override
  List<Widget>? buildActions(BuildContext context) {
    return [
      if (query.isNotEmpty)
        IconButton(
          icon: const Icon(Icons.clear),
          onPressed: () {
            query = '';
            showSuggestions(context);
          },
        ),
    ];
  }

  @override
  Widget? buildLeading(BuildContext context) {
    return IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.of(context).pop());
  }

  @override
  Widget buildResults(BuildContext context) => buildSuggestions(context);

  @override
  Widget buildSuggestions(BuildContext context) {
    if (query.trim().isEmpty) {
      return const Center(child: Text('Tapez un titre ou un auteur'));
    }
    return FutureBuilder<List<Manga>>(
      future: _catalog,
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final q = query.toLowerCase().trim();
        final list = snap.data!
            .where((m) {
              return m.title.toLowerCase().contains(q) || m.author.toLowerCase().contains(q);
            })
            .take(12)
            .toList();
        if (list.isEmpty) {
          return const Center(child: Text('Aucun résultat'));
        }
        return ListView.builder(
          itemCount: list.length,
          itemBuilder: (context, i) {
            final m = list[i];
            return ListTile(
              title: Text(m.title),
              subtitle: Text(m.author),
              onTap: () => close(context, m.slug),
            );
          },
        );
      },
    );
  }
}
