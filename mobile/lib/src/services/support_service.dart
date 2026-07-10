import '../api/api_client.dart';
import '../auth/auth_controller.dart';

final SupportService supportService = SupportService();

class SupportService {
  ApiClient get _c => authController.api;

  Future<Map<String, dynamic>> createTicket({
    required String name,
    required String email,
    required String subject,
    required String description,
    String type = 'issue',
  }) async {
    return Map<String, dynamic>.from(
      await _c.request(
        '/support/public/tickets',
        method: 'POST',
        body: {
          'type': type,
          'name': name,
          'email': email,
          'subject': subject,
          'description': description,
        },
        auth: false,
      ) as Map,
    );
  }
}
