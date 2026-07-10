import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_models.dart';
import '../theme.dart';
import '../widgets/account_page_layout.dart';

const _readerFreq = {
  'daily': 'Tous les jours',
  'weekly': 'Chaque semaine',
  'sometimes': 'De temps en temps',
};

const _creatorGoal = {
  'web': 'Web',
  'print': 'Impression',
  'both': 'Les deux',
};

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = authController.user;
    if (!authController.isAuthenticated || user == null) {
      return AccountPageLayout(
        title: 'Mon profil',
        lead: 'Connectez-vous pour voir vos informations.',
        child: const AccountLoginPrompt(message: 'Connectez-vous pour voir vos informations.'),
      );
    }

    return AccountPageLayout(
      title: 'Mon profil',
      lead: 'Les informations enregistrées lors de l’inscription.',
      child: _ProfileBody(user: user),
    );
  }
}

class _ProfileBody extends StatelessWidget {
  const _ProfileBody({required this.user});

  final AuthUser user;

  @override
  Widget build(BuildContext context) {
    final rows = <({String label, String value})>[
      (label: 'Nom', value: user.displayName),
      (label: 'Email', value: user.email),
      (label: 'Rôle', value: user.role == 'creator' ? 'Créateur' : 'Lecteur'),
    ];

    final profile = user.profile;
    if (user.role == 'reader' && profile != null) {
      rows.add((
        label: 'Genres préférés',
        value: '${profile['favoriteGenres'] ?? '—'}',
      ));
      final freq = '${profile['readingFrequency'] ?? ''}';
      rows.add((
        label: 'Fréquence de lecture',
        value: _readerFreq[freq] ?? '—',
      ));
    }

    if (user.role == 'creator' && profile != null) {
      rows.add((label: 'Nom de plume', value: '${profile['penName'] ?? '—'}'));
      rows.add((label: 'Genres que vous créez', value: '${profile['genres'] ?? '—'}'));
      final goal = '${profile['publishingGoal'] ?? ''}';
      rows.add((label: 'Objectif de publication', value: _creatorGoal[goal] ?? '—'));
    }

    return Column(
      children: [
        ...rows.map((r) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _ProfileRow(label: r.label, value: r.value),
            )),
        if (user.role != 'creator') ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => context.push('/compte/devenir-createur'),
              child: const Text('Devenir créateur'),
            ),
          ),
        ],
      ],
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.bgWhite,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textMuted)),
          ),
          const SizedBox(width: 16),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark),
            ),
          ),
        ],
      ),
    );
  }
}
