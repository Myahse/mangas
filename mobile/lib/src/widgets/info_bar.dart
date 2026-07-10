import 'package:flutter/material.dart';

import '../theme.dart';

class InfoBar extends StatefulWidget {
  const InfoBar({super.key});

  @override
  State<InfoBar> createState() => _InfoBarState();
}

class _InfoBarState extends State<InfoBar> {
  bool _visible = true;

  static const _notices = [
    'Bienvenue sur MangAfric — découvrez les mangas africains',
    'Nouveaux chapitres chaque semaine',
    'Créez un compte pour débloquer les épisodes premium',
  ];

  @override
  Widget build(BuildContext context) {
    if (!_visible) return const SizedBox.shrink();

    return Container(
      height: 30,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.infoBarStart, AppColors.infoBarMid, AppColors.infoBarStart],
        ),
        border: Border(
          bottom: BorderSide(color: Color(0x33E63946)),
        ),
      ),
      child: Row(
        children: [
          const SizedBox(width: 12),
          const Icon(Icons.campaign_outlined, size: 14, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _notices.first,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 30),
            icon: const Icon(Icons.close, size: 16, color: Colors.white54),
            onPressed: () => setState(() => _visible = false),
          ),
        ],
      ),
    );
  }
}
