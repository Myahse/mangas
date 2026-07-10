import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';

/// Matches front/src/components/Layout/Footer.jsx (mobile layout).
class AppFooter extends StatelessWidget {
  const AppFooter({super.key});

  @override
  Widget build(BuildContext context) {
    final year = DateTime.now().year;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 28),
      decoration: const BoxDecoration(
        color: AppColors.bgWhite,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RichText(
            text: const TextSpan(
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textDark),
              children: [
                TextSpan(text: 'Mang'),
                TextSpan(text: 'Afrik', style: TextStyle(color: AppColors.primary)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Votre destination pour lire les meilleurs mangas en ligne, gratuitement et en haute qualité.',
            style: TextStyle(color: AppColors.textMuted, height: 1.5, fontSize: 14),
          ),
          const SizedBox(height: 20),
          const Text('Navigation', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const SizedBox(height: 10),
          _link(context, 'Accueil', '/home'),
          _link(context, 'Parcourir', '/explore'),
          _link(context, 'Nouveautés', '/explore?sort=new'),
          _link(context, 'Populaire', '/explore?sort=popular'),
          const SizedBox(height: 20),
          const Text('Informations', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const SizedBox(height: 10),
          _link(context, 'Nous contacter', '/contact'),
          const SizedBox(height: 20),
          Row(
            children: [
              Icon(Icons.favorite, size: 14, color: AppColors.primary.withValues(alpha: 0.8)),
              const SizedBox(width: 6),
              Text('© $year MangAfric', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _link(BuildContext context, String label, String route) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => context.go(route),
        child: Text(
          label,
          style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
    );
  }
}
