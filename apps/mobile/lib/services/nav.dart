import 'package:flutter/material.dart';

/// Khóa điều hướng/thông báo toàn cục: cho phép các dịch vụ (đăng xuất khi hết phiên,
/// lỗi xác thực từ socket...) đưa người dùng về màn đăng nhập và hiện thông báo
/// mà không cần BuildContext.
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<ScaffoldMessengerState> messengerKey = GlobalKey<ScaffoldMessengerState>();

void showAppMessage(String message, {bool error = false}) {
  messengerKey.currentState
    ?..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: error ? const Color(0xFFBE123C) : const Color(0xFF1E293B),
      ),
    );
}
