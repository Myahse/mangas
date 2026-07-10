import 'package:flutter/material.dart';

import '../api/auth_errors.dart';
import '../auth/auth_controller.dart';
import '../services/wallet_service.dart';
import '../theme.dart';
import '../widgets/account_page_layout.dart';
import '../widgets/reader_auth_sheet.dart';

class StoreScreen extends StatefulWidget {
  const StoreScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  Map<String, dynamic>? _wallet;
  Map<String, dynamic>? _packsRes;
  String _busyPack = '';
  String _message = '';
  bool _loadingWallet = false;
  bool _loadingPacks = true;
  String? _walletError;

  @override
  void initState() {
    super.initState();
    authController.addListener(_onAuth);
    _loadPacks();
    _loadWallet();
  }

  @override
  void dispose() {
    authController.removeListener(_onAuth);
    super.dispose();
  }

  void _onAuth() {
    _loadWallet();
  }

  Future<void> _loadPacks() async {
    setState(() => _loadingPacks = true);
    try {
      final packs = await walletService.fetchCoinPacks();
      if (!mounted) return;
      setState(() {
        _packsRes = packs;
        _loadingPacks = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingPacks = false;
        _message = friendlyApiError(e);
      });
    }
  }

  Future<void> _loadWallet() async {
    if (!authController.isAuthenticated) {
      setState(() {
        _wallet = null;
        _walletError = null;
        _loadingWallet = false;
      });
      return;
    }
    setState(() {
      _loadingWallet = true;
      _walletError = null;
    });
    try {
      final wallet = await walletService.fetchWallet();
      if (!mounted) return;
      setState(() {
        _wallet = wallet;
        _loadingWallet = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (isAuthError(e)) await handleApiAuthError(e);
      setState(() {
        _walletError = friendlyApiError(e, authRequired: true);
        _loadingWallet = false;
      });
    }
  }

  Future<void> _reloadAll() async {
    await Future.wait([_loadPacks(), _loadWallet()]);
  }

  Future<void> _purchase(String packId) async {
    if (!authController.isAuthenticated) {
      showReaderAuthDialog(context);
      return;
    }
    setState(() {
      _busyPack = packId;
      _message = '';
    });
    try {
      final intent = await walletService.createCoinPurchaseIntent(packId);
      setState(() {
        _message = 'Intent créé: ${intent['id']}\nStatut: ${intent['status']}\nFournisseur: ${intent['provider']}';
      });
      await _loadWallet();
    } catch (e) {
      if (isAuthError(e)) await handleApiAuthError(e);
      setState(() => _message = friendlyApiError(e, authRequired: true));
    } finally {
      if (mounted) setState(() => _busyPack = '');
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: authController,
      builder: (context, _) {
        final authed = authController.isAuthenticated;
        final balance = (_wallet?['balance'] as num?)?.toInt();
        final paymentsEnabled = _packsRes?['paymentsEnabled'] == true || _wallet?['paymentsEnabled'] == true;
        final packsRaw = _packsRes?['packs'];
        final packs = packsRaw is List
            ? packsRaw.map((e) => CoinPack.fromJson(Map<String, dynamic>.from(e as Map))).toList()
            : <CoinPack>[];

        return AccountPageLayout(
          title: 'Boutique',
          lead: authed && balance != null ? 'Solde: $balance coins' : 'Achetez des coins pour débloquer des chapitres.',
          embedded: widget.embedded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!authed) ...[
                const AccountLoginPrompt(message: 'Connectez-vous pour voir votre solde et acheter des coins.'),
                const SizedBox(height: 14),
              ],
              if (authed && _walletError != null)
                AccountCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_walletError!, style: const TextStyle(color: AppColors.accentDark, height: 1.4)),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () => showReaderAuthDialog(context),
                        child: const Text('Se connecter'),
                      ),
                    ],
                  ),
                ),
              if (authed && _loadingWallet && _wallet == null && _walletError == null)
                const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator())),
              if (!paymentsEnabled && !_loadingPacks)
                AccountCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('Achat de coins désactivé', style: TextStyle(fontWeight: FontWeight.w900)),
                      SizedBox(height: 6),
                      Text(
                        'L’administrateur peut activer l’option « Coin payments » dans le panneau admin.',
                        style: TextStyle(color: AppColors.textMuted, height: 1.4),
                      ),
                    ],
                  ),
                ),
              if (_message.isNotEmpty) ...[
                const SizedBox(height: 14),
                AccountCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Info', style: TextStyle(fontWeight: FontWeight.w900)),
                      const SizedBox(height: 6),
                      Text(_message, style: const TextStyle(color: AppColors.textMuted, height: 1.45)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              if (_loadingPacks)
                const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
              else
                LayoutBuilder(
                  builder: (context, constraints) {
                    final crossCount = constraints.maxWidth >= 520 ? 2 : 1;
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossCount,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: crossCount == 1 ? 2.2 : 1.35,
                      ),
                      itemCount: packs.length,
                      itemBuilder: (context, i) => _PackCard(
                        pack: packs[i],
                        paymentsEnabled: paymentsEnabled && authed,
                        busy: _busyPack == packs[i].id,
                        onBuy: () => _purchase(packs[i].id),
                      ),
                    );
                  },
                ),
              if (packs.isEmpty && !_loadingPacks)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Aucun pack disponible pour le moment.', style: TextStyle(color: AppColors.textMuted)),
                      const SizedBox(height: 10),
                      OutlinedButton(onPressed: _reloadAll, child: const Text('Actualiser')),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _PackCard extends StatelessWidget {
  const _PackCard({
    required this.pack,
    required this.paymentsEnabled,
    required this.busy,
    required this.onBuy,
  });

  final CoinPack pack;
  final bool paymentsEnabled;
  final bool busy;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgWhite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(pack.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          const SizedBox(height: 6),
          Text('${pack.coins} coins', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
          const SizedBox(height: 4),
          Text(
            formatMoney(pack.amount, currency: pack.currency),
            style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w800),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: busy ? null : onBuy,
              child: Text(busy ? 'Création…' : (paymentsEnabled ? 'Acheter' : 'Connexion')),
            ),
          ),
        ],
      ),
    );
  }
}
