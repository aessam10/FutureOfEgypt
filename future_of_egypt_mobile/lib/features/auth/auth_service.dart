import 'dart:convert';

import '../../core/network/api_client.dart';

class AuthService {
  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await ApiClient.post(
      "Auth/login",
      {
        "email": email,
        "password": password,
      },
    );

    final body = response.body;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        "Login failed: ${response.statusCode}\n$body",
      );
    }

    if (body.trim().isEmpty) {
      throw Exception("Login failed: empty response from server");
    }

    final decoded = jsonDecode(body);

    if (decoded is! Map<String, dynamic>) {
      throw Exception("Login failed: invalid response format");
    }

    return decoded;
  }
}