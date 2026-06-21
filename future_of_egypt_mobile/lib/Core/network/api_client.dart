import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String _defaultBaseUrl = "https://localhost:7029/api";

  static const String _definedBaseUrl = String.fromEnvironment(
    "API_BASE_URL",
    defaultValue: _defaultBaseUrl,
  );

  static String get baseUrl => _definedBaseUrl;

  static String? token;

  static void setToken(String t) {
    token = t;
  }

  static Map<String, String> _headers({String? bearerToken}) {
    final activeToken = bearerToken ?? token;

    return {
      "Content-Type": "application/json",
      if (activeToken != null && activeToken.isNotEmpty)
        "Authorization": "Bearer $activeToken",
    };
  }

  static Future<http.Response> post(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    return await http.post(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(),
      body: jsonEncode(body),
    );
  }

  static Future<http.Response> postWithToken(
    String endpoint,
    Map<String, dynamic> body,
    String bearerToken,
  ) async {
    return await http.post(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(bearerToken: bearerToken),
      body: jsonEncode(body),
    );
  }

  static Future<http.Response> get(String endpoint) async {
    return await http.get(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(),
    );
  }

  static Future<http.Response> getWithToken(
    String endpoint,
    String bearerToken,
  ) async {
    return await http.get(
      Uri.parse("$baseUrl/$endpoint"),
      headers: _headers(bearerToken: bearerToken),
    );
  }
}