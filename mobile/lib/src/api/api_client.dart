import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

typedef TokenGetter = String? Function();

class BackendException implements Exception {
  BackendException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required this.tokenGetter});

  final TokenGetter tokenGetter;

  Uri _uri(String path) {
    final p = path.startsWith('/') ? path : '/$path';
    return Uri.parse('${ApiConfig.base()}$p');
  }

  Map<String, String> _headers({required bool auth, Map<String, String>? extra}) {
    final token = (auth ? tokenGetter() : null)?.trim();
    return {
      ...?extra,
      if (auth && token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
    bool auth = true,
    Map<String, String>? headers,
  }) async {
    final uri = _uri(path);
    final h = _headers(auth: auth, extra: {
      if (body != null) 'Content-Type': 'application/json',
      ...?headers,
    });

    late final http.Response res;
    try {
      if (method == 'GET') {
        res = await http.get(uri, headers: h).timeout(const Duration(seconds: 45));
      } else {
        res = await http
            .post(
              uri,
              headers: h,
              body: body != null ? jsonEncode(body) : null,
            )
            .timeout(const Duration(seconds: 45));
      }
    } on SocketException catch (e) {
      throw BackendException(ApiConfig.connectionFailedMessage(e.message));
    } on TimeoutException catch (_) {
      throw BackendException(ApiConfig.connectionFailedMessage('délai dépassé (45 s)'));
    } on http.ClientException catch (e) {
      throw BackendException(ApiConfig.connectionFailedMessage(e.message));
    }

    final text = res.body;
    final contentType = res.headers['content-type'] ?? '';

    if (res.statusCode < 200 || res.statusCode >= 300) {
      var message = text.isEmpty ? 'Request failed (${res.statusCode})' : text;
      try {
        if (text.isNotEmpty) {
          final j = jsonDecode(text);
          if (j is Map) {
            final m = j['message'];
            final err = j['error'];
            // Spring ErrorResponseDto: message = root cause, error = status phrase — prefer message.
            if (m != null && '$m'.trim().isNotEmpty) {
              message = '$m';
            } else if (err != null && '$err'.trim().isNotEmpty) {
              message = '$err';
            }
            final detail = j['detail'];
            if (detail != null && '$detail'.trim().isNotEmpty && message == text) {
              message = '$detail';
            }
          }
        }
      } catch (_) {}
      throw BackendException(message, statusCode: res.statusCode);
    }

    if (contentType.contains('application/json') && text.isNotEmpty) {
      return jsonDecode(text);
    }
    return text;
  }
}
