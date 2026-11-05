import 'package:flutter/material.dart';

/// Bảng màu dùng chung cho toàn bộ app điện thoại — thay thế các màu
/// Color(0xFF...) khai báo rời rạc ở từng màn hình trước đây (nhiều chỗ
/// cùng một ý nghĩa nhưng dùng mã hex khác nhau: xanh dương "thương hiệu"
/// từng có 4 mã khác nhau, đỏ "nguy hiểm" có 3 mã, xanh lá "thành công"
/// dùng lẫn lộn vai trò). Các giá trị dưới đây khớp 1:1 với bảng màu dùng
/// chung trên web (packages dùng chung không có Flutter nên khai báo lại
/// đúng hex ở đây — xem apps/web/src/lib/answerOptions.ts).
class AppColors {
  AppColors._();

  // ---- Thương hiệu: MÀU HÀNH ĐỘNG CHÍNH DUY NHẤT của cả app ----
  // Trùng với seedColor gốc trong main.dart (0xFF2563EB) — không đổi giá trị,
  // chỉ đặt tên để mọi màn hình dùng chung 1 nguồn thay vì tự khai báo lại.
  static const Color brand = Color(0xFF2563EB);

  // ---- Trạng thái ngữ nghĩa: CHỈ dùng cho đúng/sai/cảnh báo thật ----
  static const Color success = Color(0xFF10B981); // emerald-500: đáp án đúng
  static const Color danger = Color(0xFFF43F5E); // rose-500: đáp án sai, khóa, lỗi
  // Rose-500 có độ tương phản yếu với chữ trắng trên nền đặc (~2.3:1) nên nút
  // nền đặc màu đỏ (ví dụ "Khóa Câu") dùng riêng sắc đậm hơn này.
  static const Color dangerStrong = Color(0xFFBE123C); // rose-700
  static const Color warning = Color(0xFFF59E0B); // amber-500: cảnh báo (dự phòng)

  // ---- Đáp án A/B/C/D: NGOẠI LỆ DUY NHẤT được giữ màu bão hòa ----
  // Khớp đúng 4 mặt thẻ giấy in: A xanh dương, B vàng cam, C đỏ, D xanh lá.
  static const Color optionA = brand;
  static const Color optionB = warning;
  static const Color optionC = danger;
  static const Color optionD = success;

  static Color forOption(String letter) {
    switch (letter.toUpperCase()) {
      case 'A':
        return optionA;
      case 'B':
        return optionB;
      case 'C':
        return optionC;
      case 'D':
        return optionD;
      default:
        return textDisabled;
    }
  }

  // ---- Thang nền tối (tái dùng đúng các mã hex đã có sẵn trong code cũ) ----
  static const Color bg = Color(0xFF020617); // nền sâu nhất toàn app
  static const Color surface = Color(0xFF0F172A); // panel/card/app-bar/bottom-sheet
  static const Color surfaceAlt = Color(0xFF1E293B); // nền input, chip chưa chọn
  static const Color surfaceSubtle = Color(0xFF334155); // nút trung tính (ví dụ nút đóng)
  static const Color surfaceBorder = Color(0x1FFFFFFF); // viền mờ (Colors.white12 cũ)

  // ---- Chữ trên nền tối ----
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFFCBD5E1);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textDisabled = Color(0xFF64748B);
}
