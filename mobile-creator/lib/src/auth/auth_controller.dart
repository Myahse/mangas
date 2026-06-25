import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../config/api_config.dart';

class AuthUser {
  AuthUser({required this.email, required this.displayName, required this.role, required this.token});
  final String email;
  final String displayName;
  final String role;
  final String token;
  bool get hasUsableToken => token.trim().isNotEmpty;

  Map<String, dynamic> toJson() => {'email': email, 'displayName': displayName, 'role': role, 'token': token};
  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        email: '${j['email'] ?? ''}',
        displayName: '${j['displayName'] ?? ''}',
        role: '${j['role'] ?? ''}',
        token: '${j['token'] ?? ''}',
      );
}

final authController = AuthController();

class AuthController extends ChangeNotifier {
  AuthController() {
    _api = ApiClient(tokenGetter: () => _user?.token);
  }

  late final ApiClient _api;
  AuthUser? _user;

  AuthUser? get user => _user;
  bool get isAuthenticated => _user != null && _user!.hasUsableToken;
  ApiClient get api => _api;

  Future<void> load() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString(ApiConfig.sessionStorageKey);
    if (raw == null) {
      _user = null;
      notifyListeners();
      return;
    }
    try {
      _user = AuthUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      if (!_user!.hasUsableToken) _user = null;
    } catch (_) {
      _user = null;
    }
    notifyListeners();
  }

  Future<void> login({required String email, required String password}) async {
    final res = await _api.request('/auth/login', method: 'POST', body: {'email': email.trim(), 'password': password}, auth: false)
        as Map<String, dynamic>;
    final role = '${res['role'] ?? ''}'.trim().toLowerCase();
    if (role != 'creator' && role != 'admin') {
      throw Exception("Ce compte n'est pas un compte créateur.");
    }
    final token = '${res['token'] ?? ''}'.trim();
    if (token.isEmpty) throw Exception('Token manquant.');
    _user = AuthUser(
      email: '${res['email'] ?? email}',
      displayName: '${res['displayName'] ?? email.split('@').first}',
      role: role,
      token: token,
    );
    final sp = await SharedPreferences.getInstance();
    await sp.setString(ApiConfig.sessionStorageKey, jsonEncode(_user!.toJson()));
    notifyListeners();
  }

  Future<void> logout() async {
    _user = null;
    final sp = await SharedPreferences.getInstance();
    await sp.remove(ApiConfig.sessionStorageKey);
    notifyListeners();
  }
}
