import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../api/auth_errors.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_models.dart';
import '../services/wallet_service.dart';
import '../theme.dart';
import '../widgets/account_page_layout.dart';
import '../widgets/reader_auth_sheet.dart';

/// Wallet, daily bonus, referral — mirrors web AccountSectionPage.
class AccountSectionScreen extends StatefulWidget {
  const AccountSectionScreen({super.key, required this.title, this.embedded = false});

  final String title;
  final bool embedded;

  bool get _isFavoritesPage => title == 'Mes favoris';
  bool get _isSubscriptionsPage => title == 'Mes abonnements';

  @override
  State<AccountSectionScreen> createState() => _AccountSectionScreenState();
}

class _AccountSectionScreenState extends State<AccountSectionScreen> {
  Map<String, dynamic>? _wallet;
  Map<String, dynamic>? _referral;
  String _claimMsg = '';
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    authController.addListener(_onAuth);
    _load();
  }

  @override
  void dispose() {
    authController.removeListener(_onAuth);
    super.dispose();
  }

  void _onAuth() => _load();

  bool get _needsWalletApi => widget.title == 'Mon espace';

  Future<void> _load() async {
    if (!_needsWalletApi) {
      setState(() {
        _loading = false;
        _error = null;
      });
      return;
    }
    if (!authController.isAuthenticated) {
      setState(() {
        _wallet = null;
        _referral = null;
        _loading = false;
        _error = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        walletService.fetchWallet(),
        walletService.fetchReferralInfo(),
      ]);
      if (!mounted) return;
      setState(() {
        _wallet = results[0];
        _referral = results[1];
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (isAuthError(e)) await handleApiAuthError(e);
      setState(() {
        _error = friendlyApiError(e, authRequired: true);
        _loading = false;
      });
    }
  }

  Future<void> _claimDaily() async {
    setState(() => _claimMsg = '');
    try {
      final res = await walletService.dailyClaimCoins();
      final credited = res['credited'] == true;
      final amt = (res['creditedAmount'] as num?)?.toInt() ?? 0;
      setState(() {
        _claimMsg = credited ? 'Bonus reçu: +$amt coins' : 'Bonus déjà réclamé aujourd’hui.';
      });
      await _load();
    } catch (e) {
      if (isAuthError(e)) await handleApiAuthError(e);
      setState(() => _claimMsg = friendlyApiError(e, authRequired: true));
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: authController,
      builder: (context, _) {
        final user = authController.user;

        return AccountPageLayout(
          title: widget.title,
          embedded: widget.embedded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.embedded && widget.title == 'Mon espace') const _AccountQuickLinks(),
              _buildBody(user),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBody(AuthUser? user) {
    if (widget._isFavoritesPage) {
      return _FavoritesPlaceholder(embedded: widget.embedded);
    }

    if (widget._isSubscriptionsPage) {
      if (!authController.isAuthenticated || user == null) {
        return const AccountLoginPrompt(message: 'Connectez-vous pour voir vos abonnements.');
      }
      return const _SubscriptionsPlaceholder();
    }

    if (!_needsWalletApi) {
      return const SizedBox.shrink();
    }

    if (!authController.isAuthenticated || user == null) {
      return const AccountLoginPrompt();
    }

    if (_loading && _wallet == null) {
      return const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()));
    }

    if (_error != null && _wallet == null) {
      return AccountCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_error!, style: const TextStyle(color: AppColors.accentDark, height: 1.4)),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => showReaderAuthDialog(context),
              child: const Text('Se connecter'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: _load, child: const Text('Réessayer')),
          ],
        ),
      );
    }

    return _WalletCard(
      user: user,
      wallet: _wallet,
      referral: _referral,
      claimMsg: _claimMsg,
      onClaimDaily: _claimDaily,
    );
  }
}

class _SubscriptionsPlaceholder extends StatelessWidget {
  const _SubscriptionsPlaceholder();

  @override
  Widget build(BuildContext context) {
    return AccountCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Aucun abonnement actif', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          const SizedBox(height: 8),
          const Text(
            'Les abonnements premium seront bientôt disponibles sur MangAfric. En attendant, utilisez vos coins pour débloquer des chapitres.',
            style: TextStyle(color: AppColors.textSecondary, height: 1.45, fontSize: 14),
          ),
          const SizedBox(height: 14),
          FilledButton(onPressed: () => context.go('/store'), child: const Text('Voir la boutique')),
        ],
      ),
    );
  }
}

class _FavoritesPlaceholder extends StatelessWidget {
  const _FavoritesPlaceholder({required this.embedded});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    if (!authController.isAuthenticated) {
      return const AccountLoginPrompt(message: 'Connectez-vous pour retrouver vos favoris.');
    }

    return AccountCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Aucun favori pour le moment', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          const SizedBox(height: 8),
          const Text(
            'Parcourez le catalogue et ajoutez vos séries préférées. La synchronisation des favoris arrive bientôt.',
            style: TextStyle(color: AppColors.textSecondary, height: 1.45, fontSize: 14),
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: () => embedded ? context.go('/explore') : context.go('/explore'),
            child: const Text('Explorer'),
          ),
        ],
      ),
    );
  }
}

class _WalletCard extends StatelessWidget {
  const _WalletCard({
    required this.user,
    required this.wallet,
    required this.referral,
    required this.claimMsg,
    required this.onClaimDaily,
  });

  final AuthUser user;
  final Map<String, dynamic>? wallet;
  final Map<String, dynamic>? referral;
  final String claimMsg;
  final VoidCallback onClaimDaily;

  @override
  Widget build(BuildContext context) {
    final balance = (wallet?['balance'] as num?)?.toInt() ?? 0;
    final balancePaid = (wallet?['balancePaid'] as num?)?.toInt() ?? 0;
    final balanceReward = (wallet?['balanceReward'] as num?)?.toInt() ?? 0;
    final rewardsEnabled = wallet?['rewardsEnabled'] == true;
    final referralLink = '${referral?['link'] ?? ''}'.trim();

    return AccountCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Connecté en tant que', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          const SizedBox(height: 8),
          _InfoRow(label: 'Nom', value: user.displayName),
          _InfoRow(label: 'Email', value: user.email),
          _InfoRow(label: 'Rôle', value: user.role),
          const AccountSectionDivider(),
          const Text('Coins', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          const SizedBox(height: 8),
          _InfoRow(label: 'Solde total', value: '$balance'),
          Text(
            'Achetés: $balancePaid · Récompenses: $balanceReward',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
          ),
          if (rewardsEnabled) ...[
            const SizedBox(height: 12),
            AccountOutlineButton(label: 'Réclamer bonus quotidien', onPressed: onClaimDaily),
            if (claimMsg.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(claimMsg, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ),
          ] else
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Text('Bonus quotidien désactivé.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ),
          const AccountSectionDivider(),
          const Text('Parrainage', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          const SizedBox(height: 8),
          const Text(
            'Invitez un ami avec votre lien. Quand il crée un compte, vous gagnez des coins.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.45),
          ),
          if (referralLink.isNotEmpty) ...[
            const SizedBox(height: 12),
            TextField(
              readOnly: true,
              controller: TextEditingController(text: referralLink),
              decoration: const InputDecoration(
                isDense: true,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 10),
            AccountOutlineButton(
              label: 'Copier le lien',
              onPressed: () {
                Clipboard.setData(ClipboardData(text: referralLink));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Lien copié'), duration: Duration(seconds: 2)),
                );
              },
            ),
          ] else
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Text('Chargement du lien…', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ),
        ],
      ),
    );
  }
}

class _AccountQuickLinks extends StatelessWidget {
  const _AccountQuickLinks();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          _chip(context, 'Mon profil', '/compte/profil'),
          _chip(context, 'Mes abonnements', '/compte/abonnements'),
          _chip(context, 'Favoris', '/compte/favoris'),
        ],
      ),
    );
  }

  Widget _chip(BuildContext context, String label, String route) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
      onPressed: () => context.push(route),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(color: AppColors.textDark, fontSize: 14, height: 1.4),
          children: [
            TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.w800)),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}
