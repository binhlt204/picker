import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';
import 'nav.dart';

/// Kết quả đăng ký: pending=true nghĩa là tài khoản cần quản trị viên duyệt mới đăng nhập được.
class RegisterResult {
  final bool pending;
  final String message;
  const RegisterResult({required this.pending, required this.message});
}

/// Phiên đăng nhập của app: lưu token + địa chỉ máy chủ + thông tin người dùng (shared_preferences),
/// khôi phục khi mở lại app, và thông báo (ChangeNotifier) cho giao diện khi đăng nhập/đăng xuất.
class AuthService extends ChangeNotifier {
  AuthService._();
  static final AuthService instance = AuthService._();

  static const _kServer = 'server_url';
  static const _kToken = 'auth_token';
  static const _kUser = 'auth_user';

  /// Địa chỉ mặc định gợi ý: máy tính chạy server trong cùng mạng WiFi (người dùng sửa được ở màn đăng nhập).
  static String get defaultServerUrl => kIsWeb ? 'http://localhost:3001' : 'http://192.168.1.11:3001';

  String serverUrl = defaultServerUrl;
  String? token;
  Map<String, dynamic>? user;
  bool initialized = false;

  bool get isLoggedIn => token != null && user != null;
  String get displayName => (user?['full_name'] ?? user?['email'] ?? '').toString();
  String get email => (user?['email'] ?? '').toString();
  bool get isAdmin => user?['role'] == 'admin';

  /// Chuẩn hóa địa chỉ người dùng nhập: thêm http:// nếu thiếu, bỏ dấu / và /api ở cuối.
  static String normalizeUrl(String input) {
    var u = input.trim();
    if (u.isEmpty) return defaultServerUrl;
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'http://$u';
    u = u.replaceAll(RegExp(r'/+$'), '');
    if (u.endsWith('/api')) u = u.substring(0, u.length - 4);
    return u;
  }

  /// Khôi phục phiên đã lưu khi mở app. Token còn hiệu lực -> vào thẳng; 401/403 -> xóa phiên;
  /// mất mạng -> vẫn dùng thông tin đã lưu để vào app (các lệnh gọi sau sẽ báo lỗi mạng rõ ràng).
  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      serverUrl = prefs.getString(_kServer) ?? defaultServerUrl;
      token = prefs.getString(_kToken);
      final rawUser = prefs.getString(_kUser);
      if (rawUser != null) {
        try {
          user = Map<String, dynamic>.from(jsonDecode(rawUser) as Map);
        } catch (_) {
          user = null;
        }
      }
      if (token != null && user == null) token = null;

      if (token != null) {
        try {
          final data = await ApiClient.get('/auth/me');
          if (data is Map && data['user'] is Map) {
            user = Map<String, dynamic>.from(data['user'] as Map);
            await _persist();
          }
        } on ApiException catch (e) {
          if (!e.isNetworkError) await _clear(); // 401/403: phiên không còn hợp lệ
        }
      }
    } catch (e) {
      debugPrint('AuthService.init lỗi: $e');
    } finally {
      initialized = true;
      notifyListeners();
    }
  }

  Future<void> setServerUrl(String input) async {
    serverUrl = normalizeUrl(input);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kServer, serverUrl);
    notifyListeners();
  }

  Future<void> login(String email, String password, {String? serverInput}) async {
    if (serverInput != null) await setServerUrl(serverInput);
    final data = await ApiClient.post('/auth/login', {'email': email.trim(), 'password': password}, false);
    await _acceptSession(data);
  }

  Future<RegisterResult> register({
    required String fullName,
    required String email,
    required String password,
    String? serverInput,
  }) async {
    if (serverInput != null) await setServerUrl(serverInput);
    final data = await ApiClient.post(
      '/auth/register',
      {'full_name': fullName.trim(), 'email': email.trim(), 'password': password},
      false,
    );
    if (data is Map && data['token'] != null) {
      await _acceptSession(data);
      return RegisterResult(pending: false, message: (data['message'] ?? 'Đăng ký thành công').toString());
    }
    return RegisterResult(
      pending: true,
      message: (data is Map ? data['message'] : null)?.toString() ??
          'Đăng ký thành công. Tài khoản đang chờ quản trị viên duyệt.',
    );
  }

  Future<String> forgotPassword(String email, {String? serverInput}) async {
    if (serverInput != null) await setServerUrl(serverInput);
    final data = await ApiClient.post('/auth/forgot-password', {'email': email.trim()}, false);
    return (data is Map ? data['message'] : null)?.toString() ??
        'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.';
  }

  Future<void> _acceptSession(dynamic data) async {
    if (data is! Map || data['token'] == null || data['user'] is! Map) {
      throw const ApiException('Phản hồi từ máy chủ không hợp lệ');
    }
    token = data['token'].toString();
    user = Map<String, dynamic>.from(data['user'] as Map);
    await _persist();
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kServer, serverUrl);
    if (token != null) await prefs.setString(_kToken, token!);
    if (user != null) await prefs.setString(_kUser, jsonEncode(user));
  }

  Future<void> _clear() async {
    token = null;
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kToken);
    await prefs.remove(_kUser);
  }

  /// Đăng xuất chủ động. Đưa người dùng về màn đầu tiên (màn đăng nhập) kể cả khi đang ở màn sâu.
  Future<void> logout() async {
    await _clear();
    navigatorKey.currentState?.popUntil((route) => route.isFirst);
    notifyListeners();
  }

  /// Token hết hạn hoặc bị thu hồi (API trả 401 / socket báo UNAUTHENTICATED).
  Future<void> sessionExpired() async {
    if (token == null) return;
    await logout();
    showAppMessage('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', error: true);
  }
}
