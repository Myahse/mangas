import 'package:flutter/material.dart';

import '../theme/creator_theme.dart';
import '../auth/auth_controller.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    final user = authController.user;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        CircleAvatar(radius: 44, backgroundColor: CreatorColors.primary.withValues(alpha: 0.12), child: const Icon(Icons.person, size: 48, color: CreatorColors.primary)),
        const SizedBox(height: 12),
        Center(child: Text(user?.displayName ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
        Center(child: Text(user?.email ?? '', style: const TextStyle(color: CreatorColors.textMuted))),
        const SizedBox(height: 24),
        _tile(Icons.payments_outlined, 'Finance', 'Retraits Wave, OM, MTN, Moov'),
        _tile(Icons.campaign_outlined, 'Annonces', 'Alertes plateforme'),
        _tile(Icons.people_outline, 'Lecteurs', 'Stats dans l’onglet Stats'),
        const SizedBox(height: 24),
        OutlinedButton(
          onPressed: () => authController.logout(),
          child: const Text('Déconnexion'),
        ),
      ],
    );
  }

  static Widget _tile(IconData icon, String title, String sub) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: CreatorColors.border)),
      child: ListTile(leading: Icon(icon, color: CreatorColors.primary), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Text(sub)),
    );
  }
}
