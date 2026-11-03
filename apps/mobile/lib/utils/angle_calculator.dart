import 'dart:math';

/// Tính đáp án A, B, C, D từ 4 đỉnh corner của ArUco marker
/// [corners] chứa 4 điểm [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] theo chiều kim đồng hồ
String calculateAnswer(List<List<double>> corners) {
  if (corners.length < 2) return 'A';

  // corners[0] = top-left, corners[1] = top-right (theo chiều kim đồng hồ)
  final p0 = corners[0];
  final p1 = corners[1];

  final dx = p1[0] - p0[0];
  final dy = p1[1] - p0[1];

  // atan2 trả về radian, convert sang degree
  final angle = (dx == 0 && dy == 0) ? 0.0 : _radToDeg(atan2(dy, dx));

  // Quy ước đáp án theo góc xoay:
  // A: 0°   (cạnh trên hướng phải / ngang)  -> -45° đến 45°
  // B: 90°  (cạnh trên hướng xuống)         -> 45° đến 135°
  // C: 180° (cạnh trên hướng trái)          -> >135° hoặc <= -135°
  // D: 270° (cạnh trên hướng lên)           -> -135° đến -45°
  if (angle >= -45 && angle <= 45) return 'A';
  if (angle > 45 && angle <= 135) return 'B';
  if (angle > 135 || angle <= -135) return 'C';
  return 'D';
}

double _radToDeg(double rad) => rad * 180.0 / pi;
