import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme.dart';
import 'reader_auth_sheet.dart';

/// Shared layout for account-style pages (front AccountSectionPage.css).
class AccountPageLayout extends StatelessWidget {
  const AccountPageLayout({
    super.key,
    required this.title,
    this.lead,
    required this.child,
    this.embedded = false,
  });

  final String title;
  final String? lead;
  final Widget child;
  /// When true, renders inside the shell (no extra app bar / back button).
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final content = ListView(
      padding: EdgeInsets.fromLTRB(20, embedded ? 4 : 8, 20, 32),
      children: [
        if (!embedded) _Breadcrumb(title: title),
        if (!embedded) const SizedBox(height: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.02,
            color: AppColors.textDark,
          ),
        ),
        if (lead != null) ...[
          const SizedBox(height: 8),
          Text(
            lead!,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w600,
              height: 1.45,
              fontSize: 14,
            ),
          ),
        ],
        const SizedBox(height: 16),
        child,
      ],
    );

    if (embedded) {
      return ColoredBox(color: AppColors.bgLight, child: content);
    }

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
        ),
        title: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
      ),
      body: content,
    );
  }
}

class _Breadcrumb extends StatelessWidget {
  const _Breadcrumb({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        GestureDetector(
          onTap: () => context.go('/home'),
          child: const Text(
            'Accueil',
            style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 14),
          ),
        ),
        const Text(' / ', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
        Text(title, style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600, fontSize: 14)),
      ],
    );
  }
}

class AccountCard extends StatelessWidget {
  const AccountCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgWhite,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: child,
    );
  }
}

class AccountLoginPrompt extends StatelessWidget {
  const AccountLoginPrompt({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    return AccountCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Vous n’êtes pas connecté', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            message ?? 'Connectez-vous depuis le bouton « Connexion » en haut.',
            style: const TextStyle(color: AppColors.textSecondary, height: 1.4),
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: () => showReaderAuthDialog(context),
            child: const Text('Se connecter'),
          ),
        ],
      ),
    );
  }
}

class AccountSectionDivider extends StatelessWidget {
  const AccountSectionDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 14),
      child: Divider(height: 1, color: AppColors.border),
    );
  }
}

class AccountOutlineButton extends StatelessWidget {
  const AccountOutlineButton({super.key, required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 44),
        side: const BorderSide(color: AppColors.border, width: 1.5),
      ),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
    );
  }
}
