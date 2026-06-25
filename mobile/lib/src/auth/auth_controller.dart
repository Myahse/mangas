import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../config/api_config.dart';
import 'auth_exceptions.dart';
import 'auth_models.dart';

final AuthController authController = AuthController();

class AuthController extends ChangeNotifier {
  AuthController() {
    _api = ApiClient(tokenGetter: () => _user?.token);
  }

  late final ApiClient _api;
  AuthUser? _user;

  AuthUser? get user => _user;
  bool get isAuthenticated => _user != null && _user!.hasUsableToken && _user!.role.isNotEmpty;

  ApiClient get api => _api;

  Future<void> load() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(ApiConfig.sessionStorageKey);
    if (raw == null || raw.isEmpty) {
      _user = null;
      notifyListeners();
      return;
    }
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      final u = AuthUser.fromJson(j);
      _user = u.hasUsableToken ? u : null;
      if (_user == null) await sp.remove(ApiConfig.sessionStorageKey);
    } catch (_) {
      await sp.remove(ApiConfig.sessionStorageKey);
      _user = null;
    }
    notifyListeners();
  }

  Future<void> _persist(AuthUser? next) async {
    final sp = await SharedPreferences.getInstance();
    _user = next;
    if (next == null) {
      await sp.remove(ApiConfig.sessionStorageKey);
    } else {
      await sp.setString(ApiConfig.sessionStorageKey, jsonEncode(next.toJson()));
    }
    notifyListeners();
  }

  Future<void> login({required String email, required String password}) async {
    final res = await _api.request(
      '/auth/login',
      method: 'POST',
      body: {'email': email.trim(), 'password': password},
      auth: false,
    ) as Map<String, dynamic>;

    if (res['mustChangePassword'] == true) {
      throw MustChangePasswordException(email: email.trim(), currentPassword: password);
    }

    final roleRaw = '${res['role'] ?? 'reader'}'.trim().toLowerCase();
    if (roleRaw != 'reader' && roleRaw != 'support' && roleRaw != 'admin') {
      throw Exception("Ce compte n'a pas accès à l'application lecteur.");
    }
    final token = '${res['token'] ?? ''}'.trim();
    if (token.isEmpty) throw Exception('Connexion impossible (token manquant).');

    await _persist(
      AuthUser(
        role: roleRaw,
        displayName: '${res['displayName'] ?? email.split('@').first}',
        email: '${res['email'] ?? email}',
        token: token,
      ),
    );
  }

  Future<void> registerAndSignIn({
    required String name,
    required String email,
    required String password,
    required Map<String, dynamic> profile,
    String? referralCode,
  }) async {
    await _api.request(
      '/auth/register',
      method: 'POST',
      body: {
        'role': 'reader',
        'name': name.trim(),
        'email': email.trim(),
        'password': password,
        'profile': profile,
        if (referralCode != null && referralCode.trim().isNotEmpty) 'referralCode': referralCode.trim(),
      },
      auth: false,
    );
    await login(email: email.trim(), password: password);
  }

  Future<void> forgotPassword(String email) async {
    await _api.request(
      '/auth/forgot-password',
      method: 'POST',
      body: {'email': email.trim()},
      auth: false,
    );
  }

  Future<void> changePassword({
    required String email,
    required String oldPassword,
    required String newPassword,
  }) async {
    await _api.request(
      '/auth/change-password',
      method: 'POST',
      body: {'email': email.trim(), 'oldPassword': oldPassword, 'newPassword': newPassword},
      auth: false,
    );
  }

  Future<void> logout() => _persist(null);
}
