import 'dart:math';

/// Đồng hồ của câu hỏi hiện tại, đồng bộ theo server.
/// Server gửi: timeLimit (giây, null = không giới hạn), endsAt (ms, null = không đếm giờ),
/// serverNow (ms) để bù chênh lệch giữa đồng hồ điện thoại và máy chủ.
/// Nhờ vậy điện thoại và máy chiếu luôn hiện cùng một số giây còn lại.
class ServerTimer {
  int? timeLimit;
  int? endsAt;
  int clockOffset = 0;

  static int? _asInt(dynamic v) => v is num ? v.toInt() : null;

  void apply(Map<dynamic, dynamic> data) {
    timeLimit = _asInt(data['timeLimit']);
    endsAt = _asInt(data['endsAt']);
    final serverNow = _asInt(data['serverNow']);
    if (serverNow != null) {
      clockOffset = serverNow - DateTime.now().millisecondsSinceEpoch;
    }
  }

  void stop() {
    endsAt = null;
  }

  /// Số giây còn lại; null nếu câu không giới hạn thời gian hoặc đã khóa.
  int? secondsLeft() {
    final end = endsAt;
    if (end == null) return null;
    final now = DateTime.now().millisecondsSinceEpoch + clockOffset;
    return max(0, ((end - now) / 1000).ceil());
  }
}

/// Cài đặt hẹn giờ của phiên thi (đồng bộ với máy chiếu).
class TimerSettingsData {
  bool timerEnabled;
  int? timeLimitAll; // null = dùng thời gian riêng từng câu
  Map<String, int> questionTimes; // questionId -> giây (0 = không giới hạn)

  TimerSettingsData({this.timerEnabled = true, this.timeLimitAll, Map<String, int>? questionTimes})
      : questionTimes = questionTimes ?? {};

  factory TimerSettingsData.fromJson(dynamic json) {
    if (json is! Map) return TimerSettingsData();
    final qt = <String, int>{};
    final raw = json['questionTimes'];
    if (raw is Map) {
      raw.forEach((k, v) {
        if (v is num) qt[k.toString()] = v.toInt();
      });
    }
    final all = json['timeLimitAll'];
    return TimerSettingsData(
      timerEnabled: json['timerEnabled'] != false,
      timeLimitAll: all is num ? all.toInt() : null,
      questionTimes: qt,
    );
  }

  /// Thời gian thực tế của 1 câu (null = không giới hạn), cùng quy tắc với server.
  int? effectiveFor(String questionId, int bankTime) {
    if (!timerEnabled) return null;
    final own = questionTimes[questionId];
    if (own != null) return own > 0 ? own : null;
    if (timeLimitAll != null) return timeLimitAll! > 0 ? timeLimitAll : null;
    return bankTime > 0 ? bankTime : null;
  }
}
