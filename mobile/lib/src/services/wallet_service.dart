import '../api/api_client.dart';
import '../auth/auth_controller.dart';

final WalletService walletService = WalletService();

class CoinPack {
  CoinPack({
    required this.id,
    required this.title,
    required this.coins,
    required this.amount,
    required this.currency,
  });

  final String id;
  final String title;
  final int coins;
  final num amount;
  final String currency;

  factory CoinPack.fromJson(Map<String, dynamic> j) {
    return CoinPack(
      id: '${j['id'] ?? ''}',
      title: '${j['title'] ?? 'Pack'}',
      coins: (j['coins'] as num?)?.toInt() ?? 0,
      amount: j['amount'] as num? ?? 0,
      currency: '${j['currency'] ?? 'XOF'}',
    );
  }
}

class WalletService {
  ApiClient get _c => authController.api;

  Future<Map<String, dynamic>> fetchWallet() async {
    return Map<String, dynamic>.from(await _c.request('/wallet') as Map);
  }

  Future<Map<String, dynamic>> dailyClaimCoins() async {
    return Map<String, dynamic>.from(
      await _c.request('/wallet/daily-claim', method: 'POST') as Map,
    );
  }

  Future<Map<String, dynamic>> fetchReferralInfo() async {
    return Map<String, dynamic>.from(await _c.request('/wallet/referral') as Map);
  }

  Future<Map<String, dynamic>> fetchCoinPacks() async {
    return Map<String, dynamic>.from(
      await _c.request('/store/coin-packs', auth: false) as Map,
    );
  }

  Future<Map<String, dynamic>> createCoinPurchaseIntent(String packId) async {
    return Map<String, dynamic>.from(
      await _c.request(
        '/store/coin-purchase-intents',
        method: 'POST',
        body: {'packId': packId},
      ) as Map,
    );
  }

  Future<void> resetPassword({required String token, required String newPassword}) async {
    await _c.request(
      '/auth/reset-password',
      method: 'POST',
      body: {'token': token, 'newPassword': newPassword},
      auth: false,
    );
  }
}

String formatMoney(num amount, {String currency = 'XOF'}) {
  final n = amount is int ? amount : amount.toDouble();
  if (currency == 'XOF' || currency == 'CFA') {
    return '${n.toStringAsFixed(0)} $currency';
  }
  return '$n $currency';
}
