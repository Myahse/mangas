import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class BackendException implements Exception {
  BackendException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required this.tokenGetter});
  final String? Function() tokenGetter;

  Future<dynamic> request(String path, {String method = 'GET', Map<String, dynamic>? body, bool auth = true}) async {
    final p = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('${ApiConfig.base()}$p');
    final token = auth ? tokenGetter()?.trim() : null;
    final headers = {
      if (body != null) 'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    late final http.Response res;
    if (method == 'GET') {
      res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 45));
    } else {
      res = await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null).timeout(const Duration(seconds: 45));
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      var message = res.body.isEmpty ? 'Erreur ${res.statusCode}' : res.body;
      try {
        final j = jsonDecode(res.body);
        if (j is Map && j['error'] != null) message = '${j['error']}';
      } catch (_) {}
      throw BackendException(message, statusCode: res.statusCode);
    }
    if (res.body.isEmpty) return null;
    try {
      return jsonDecode(res.body);
    } catch (_) {
      return res.body;
    }
  }
}
