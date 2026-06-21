import 'dart:convert';
import '../../core/network/api_client.dart';

class AuthService {
  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    final res = await ApiClient.post("Auth/login", {
      "email": email,
      "password": password,
    });

    final data = jsonDecode(res.body);

    if (res.statusCode != 200) {
      throw Exception("Login failed");
    }

    return data;
  }
}