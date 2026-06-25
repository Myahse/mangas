class AuthUser {
  const AuthUser({
    required this.role,
    required this.displayName,
    required this.email,
    this.token,
    this.profile,
  });

  final String role;
  final String displayName;
  final String email;
  final String? token;
  final Map<String, dynamic>? profile;

  Map<String, dynamic> toJson() => {
        'role': role,
        'displayName': displayName,
        'email': email,
        if (token != null) 'token': token,
        if (profile != null) 'profile': profile,
      };

  factory AuthUser.fromJson(Map<String, dynamic> j) {
    return AuthUser(
      role: '${j['role'] ?? 'reader'}',
      displayName: '${j['displayName'] ?? j['email'] ?? ''}',
      email: '${j['email'] ?? ''}',
      token: j['token'] != null ? '${j['token']}' : null,
      profile: j['profile'] is Map<String, dynamic> ? Map<String, dynamic>.from(j['profile'] as Map) : null,
    );
  }

  bool get hasUsableToken => (token ?? '').trim().length > 20;
}
