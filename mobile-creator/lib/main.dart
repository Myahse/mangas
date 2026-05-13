import 'package:flutter/material.dart';

void main() {
  runApp(const MangafriqCreatorApp());
}

/// Creator panel palette: blue primary, green accent (creator-panel global.css).
abstract final class CreatorColors {
  static const Color primary = Color(0xFF2563EB);
  static const Color primaryDark = Color(0xFF1D4ED8);
  static const Color accent = Color(0xFF22C55E);
  static const Color bgLight = Color(0xFFF4F4F6);
  static const Color bgWhite = Color(0xFFFFFFFF);
  static const Color textDark = Color(0xFF111111);
  static const Color textMuted = Color(0xFF888888);
  static const Color border = Color(0xFFE0E0E0);
}

class MangafriqCreatorApp extends StatelessWidget {
  const MangafriqCreatorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MangAfric Studio',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: CreatorColors.primary, brightness: Brightness.light),
        scaffoldBackgroundColor: CreatorColors.bgLight,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(backgroundColor: CreatorColors.bgWhite, foregroundColor: CreatorColors.textDark, elevation: 0),
      ),
      home: const CreatorHome(),
    );
  }
}

class CreatorHome extends StatefulWidget {
  const CreatorHome({super.key});

  @override
  State<CreatorHome> createState() => _CreatorHomeState();
}

class _CreatorHomeState extends State<CreatorHome> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [_SeriesTab(), _EpisodesTab(), _ProfileTab()],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.library_books_outlined), selectedIcon: Icon(Icons.library_books), label: 'Séries'),
          NavigationDestination(icon: Icon(Icons.article_outlined), selectedIcon: Icon(Icons.article), label: 'Épisodes'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}

class _SeriesTab extends StatelessWidget {
  const _SeriesTab();

  static final _mock = [
    ('Les Gardiens de Cendres', 'Publié', 42),
    ('Éclats de Lune', 'Brouillon', 12),
    ('Protocole Zéro', 'Révision', 10),
  ];

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: 140,
          flexibleSpace: FlexibleSpaceBar(
            title: const Text('Mes séries'),
            background: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [CreatorColors.primary, CreatorColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              alignment: Alignment.bottomLeft,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 48),
              child: const Text(
                'Espace créateur',
                style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              FilledButton.icon(
                onPressed: () {},
                style: FilledButton.styleFrom(backgroundColor: CreatorColors.accent, minimumSize: const Size(double.infinity, 48)),
                icon: const Icon(Icons.add),
                label: const Text('Nouvelle série'),
              ),
              const SizedBox(height: 16),
              ..._mock.map(
                (t) => Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: CreatorColors.border)),
                  child: ListTile(
                    title: Text(t.$1, style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text('${t.$3} chapitres · ${t.$2}'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _EpisodesTab extends StatelessWidget {
  const _EpisodesTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Épisodes', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Text('Aperçu local — branchez l’API du panneau web.', style: TextStyle(color: CreatorColors.textMuted)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _statCard('À publier', '2', CreatorColors.primary)),
            const SizedBox(width: 10),
            Expanded(child: _statCard('Publiés (7j)', '5', CreatorColors.accent)),
          ],
        ),
        const SizedBox(height: 16),
        _episodeRow('Ch. 42 · Les Gardiens de Cendres', 'Publié'),
        _episodeRow('Ch. 41 · Les Gardiens de Cendres', 'Programmé'),
        _episodeRow('Ch. 12 · Éclats de Lune', 'Brouillon'),
      ],
    );
  }

  static Widget _statCard(String label, String value, Color valueColor) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: CreatorColors.border)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: CreatorColors.textMuted)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: valueColor)),
          ],
        ),
      ),
    );
  }

  static Widget _episodeRow(String title, String state) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: CreatorColors.border)),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: CreatorColors.primary.withValues(alpha: 0.12), child: const Icon(Icons.article, color: CreatorColors.primary)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(state),
        trailing: const Icon(Icons.more_vert),
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const CircleAvatar(radius: 44, backgroundColor: Color(0x332563EB), child: Icon(Icons.person, size: 48, color: CreatorColors.primary)),
        const SizedBox(height: 12),
        const Center(child: Text('Studio MangAfric', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
        const Center(child: Text('createur@exemple.com', style: TextStyle(color: CreatorColors.textMuted))),
        const SizedBox(height: 24),
        _tile(Icons.analytics_outlined, 'Statistiques', 'Vues, abonnés'),
        _tile(Icons.payments_outlined, 'Paiements', 'RIB, factures'),
        _tile(Icons.help_outline, 'Aide', 'Guides et support'),
        const SizedBox(height: 20),
        const Center(
          child: Text(
            'Connexion backend à ajouter (même API que creator-panel).',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: CreatorColors.textMuted),
          ),
        ),
      ],
    );
  }

  static Widget _tile(IconData icon, String title, String sub) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: CreatorColors.border)),
      child: ListTile(
        leading: Icon(icon, color: CreatorColors.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(sub),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {},
      ),
    );
  }
}
