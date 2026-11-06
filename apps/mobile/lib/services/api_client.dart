import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

/// Lỗi gọi API đã được chuyển thành thông báo tiếng Việt sẵn sàng hiển thị cho người dùng.
class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final String? code; // ví dụ 'PENDING', 'DISABLED', 'UNAUTHENTICATED'

  const ApiException(this.message, {this.statusCode, this.code});

  bool get isNetworkError => statusCode == null;

  @override
  String toString() => message;
}

/// Tầng gọi API duy nhất của app: tự đính token đăng nhập (Authorization: Bearer ...),
/// đọc lỗi `{error}` từ server, và khi gặp 401 trong lúc đang đăng nhập thì đăng xuất
/// toàn app (về màn đăng nhập). Mọi đường dẫn tính từ `/api`.
class ApiClient {
  ApiClient._();

  static const Duration _timeout = Duration(seconds: 12);

  static Uri _uri(String path) => Uri.parse('${AuthService.instance.serverUrl}/api$path');

  static Map<String, String> _headers({String contentType = 'application/json', bool auth = true}) {
    final token = AuthService.instance.token;
    return {
      'Content-Type': contentType,
      if (auth && token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> get(String path, {bool auth = true}) =>
      _send(() => http.get(_uri(path), headers: _headers(auth: auth)), auth);

  static Future<dynamic> post(String path, [Object? body, bool auth = true]) => _send(
        () => http.post(_uri(path), headers: _headers(auth: auth), body: body == null ? null : jsonEncode(body)),
        auth,
      );

  static Future<dynamic> put(String path, Object body) =>
      _send(() => http.put(_uri(path), headers: _headers(), body: jsonEncode(body)), true);

  static Future<dynamic> delete(String path) => _send(() => http.delete(_uri(path), headers: _headers()), true);

  /// Gửi ảnh nhị phân (khung hình camera) tới server để nhận diện thẻ.
  static Future<dynamic> postBytes(String path, Uint8List bytes) => _send(
        () => http.post(_uri(path), headers: _headers(contentType: 'application/octet-stream'), body: bytes),
        true,
      );

  static Future<dynamic> _send(Future<http.Response> Function() request, bool auth) async {
    final http.Response res;
    try {
      res = await request().timeout(_timeout);
    } on TimeoutException {
      throw const ApiException('Máy chủ phản hồi quá chậm, vui lòng thử lại');
    } catch (_) {
      throw ApiException('Không thể kết nối đến máy chủ ${AuthService.instance.serverUrl}. Kiểm tra mạng và địa chỉ máy chủ.');
    }

    dynamic data;
    if (res.body.isNotEmpty) {
      try {
        data = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {
        data = null;
      }
    }

    if (res.statusCode >= 200 && res.statusCode < 300) return data;

    final String? serverMessage = data is Map ? data['error']?.toString() : null;
    final String? code = data is Map ? data['code']?.toString() : null;

    // Token hết hạn / bị thu hồi khi đang đăng nhập -> về màn đăng nhập
    if (res.statusCode == 401 && auth && AuthService.instance.token != null) {
      AuthService.instance.sessionExpired();
    }

    throw ApiException(
      serverMessage ?? 'Lỗi máy chủ (${res.statusCode})',
      statusCode: res.statusCode,
      code: code,
    );
  }
}
