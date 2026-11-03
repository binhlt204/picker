import 'dart:math';

/// Tính đáp án A, B, C, D từ 4 đỉnh corner của ArUco marker
/// [corners] chứa 4 điểm [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] theo chiều kim đồng hồ
String calculateAnswer(List<List<double>> corners) {
  if (corners.length < 2) return 'A';

  // corners[0] = top-left, corners[1] = top-right (theo chiều kim đồng hồ của marker gốc)
  final p0 = corners[0];
  final p1 = corners[1];

  final dx = p1[0] - p0[0];
  final dy = p1[1] - p0[1];

  // atan2 trả về radian, convert sang degree
  final angle = (dx == 0 && dy == 0) ? 0.0 : _radToDeg(atan2(dy, dx));

  // Trong hệ tọa độ hình ảnh camera: trục X sang phải (+X), trục Y hướng xuống (+Y)
  // • A (cạnh trên A hướng lên): Cạnh A nằm ngang -> angle ~ 0°     [-45°, 45°]
  // • B (cạnh phải B hướng lên): Xoay ngược chiều kim đồng hồ -> dy < 0, angle ~ -90° [-135°, -45°]
  // • C (cạnh dưới C hướng lên): Lộn ngược 180° -> angle ~ 180° / -180° [>135° hoặc <= -135°]
  // • D (cạnh trái D hướng lên): Xoay theo chiều kim đồng hồ  -> dy > 0, angle ~ +90° [45°, 135°]
  if (angle >= -45 && angle <= 45) return 'A';
  if (angle > -135 && angle < -45) return 'B';
  if (angle > 135 || angle <= -135) return 'C';
  return 'D';
}

double _radToDeg(double rad) => rad * 180.0 / pi;
