import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';
import '../widgets/account_page_layout.dart';

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AccountPageLayout(
      title: 'Page introuvable',
      lead: 'La page demandée n’existe pas ou a été déplacée.',
      child: AccountCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('404', style: TextStyle(fontSize: 48, fontWeight: FontWeight.w900, color: AppColors.primary)),
            const SizedBox(height: 8),
            const Text('Retournez à l’accueil pour continuer votre lecture.', style: TextStyle(color: AppColors.textSecondary, height: 1.4)),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => context.go('/home'), child: const Text('Accueil')),
          ],
        ),
      ),
    );
  }
}
