import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';

/// Web routes exist for account, store, subscriptions, favorites; mobile shows a clear stub until native UIs ship.
class AccountStubScreen extends StatelessWidget {
  const AccountStubScreen({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              subtitle ??
                  'Cette section est disponible sur le site MangAfric avec le même compte. L’app lecteur se synchronise déjà avec le catalogue et la lecture.',
              style: TextStyle(fontSize: 15, height: 1.45, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
