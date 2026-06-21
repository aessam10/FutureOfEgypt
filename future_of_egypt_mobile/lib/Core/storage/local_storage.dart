class LocalStorage {
  static String? token;

  static Future<void> saveToken(String value) async {
    token = value;
  }

  static String? getToken() {
    return token;
  }
}