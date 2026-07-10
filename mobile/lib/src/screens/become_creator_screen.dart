import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../theme.dart';
import '../widgets/account_page_layout.dart';

/// Placeholder aligned with web BecomeCreatorPage — full creator flow uses creator app.
class BecomeCreatorScreen extends StatelessWidget {
  const BecomeCreatorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authenticated = authController.isAuthenticated;

    return AccountPageLayout(
      title: 'Devenir créateur',
      lead: 'Publiez vos mangas sur MangAfric. La demande complète est disponible sur le site web.',
      child: AccountCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Pour soumettre une candidature créateur, utilisez le site MangAfric avec le même compte, ou contactez le support.',
              style: TextStyle(color: AppColors.textSecondary, height: 1.45),
            ),
            const SizedBox(height: 16),
            if (!authenticated) const AccountLoginPrompt(message: 'Connectez-vous pour continuer.'),
            if (authenticated) ...[
              FilledButton(
                onPressed: () => context.push('/contact'),
                child: const Text('Contacter le support'),
              ),
            ],
            const SizedBox(height: 10),
            OutlinedButton(onPressed: () => context.go('/compte/profil'), child: const Text('Retour au profil')),
          ],
        ),
      ),
    );
  }
}
