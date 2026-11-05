import 'package:socket_io_client/socket_io_client.dart' as socket_io;

class SocketService {
  socket_io.Socket? _socket;
  bool isConnected = false;

  void connect(
    String serverUrl,
    String sessionId, {
    Function(Map<String, dynamic>)? onQuestionStarted,
    Function(Map<String, dynamic>)? onQuestionLocked,
    Function(Map<String, dynamic>)? onStudentsUpdated,
    Function()? onSessionEnded,
    Function(bool)? onConnectionChange,
    Function(Map<String, dynamic>)? onTimerSettings,
    Function(String)? onError,
  }) {
    _socket = socket_io.io(serverUrl, <String, dynamic>{
      'transports': ['websocket', 'polling'],
      'autoConnect': true,
    });

    _socket?.onConnect((_) {
      isConnected = true;
      onConnectionChange?.call(true);
      _socket?.emit('join_as_scanner', {'sessionId': sessionId});
    });

    _socket?.onDisconnect((_) {
      isConnected = false;
      onConnectionChange?.call(false);
    });

    _socket?.on('question_started', (data) {
      if (data is Map<String, dynamic>) {
        onQuestionStarted?.call(data);
      }
    });

    _socket?.on('update_submitted_students', (data) {
      if (data is Map<String, dynamic>) {
        onStudentsUpdated?.call(data);
      }
    });

    _socket?.on('question_locked', (data) {
      if (data is Map<String, dynamic>) {
        onQuestionLocked?.call(data);
      }
    });

    _socket?.on('session_ended', (_) {
      onSessionEnded?.call();
    });

    // Cài đặt hẹn giờ thay đổi (từ máy chiếu hoặc điện thoại khác) + trạng thái đồng hồ câu hiện tại
    _socket?.on('timer_settings', (data) {
      if (data is Map<String, dynamic>) {
        onTimerSettings?.call(data);
      }
    });

    _socket?.on('error', (data) {
      if (data is Map && data['message'] != null) {
        onError?.call(data['message'].toString());
      }
    });
  }

  void submitBatch(String sessionId, String questionId, List<Map<String, dynamic>> records) {
    if (_socket != null && isConnected) {
      _socket?.emit('submit_scanned_batch', {
        'sessionId': sessionId,
        'questionId': questionId,
        'records': records,
      });
    }
  }

  void lockQuestion(String sessionId) {
    _socket?.emit('lock_question', {'sessionId': sessionId});
  }

  /// Chuyển câu. Thời gian của câu do server tự tính theo cài đặt hẹn giờ của phiên.
  void nextQuestion(String sessionId, String questionId) {
    _socket?.emit('next_question', {
      'sessionId': sessionId,
      'questionId': questionId,
    });
  }

  /// Đổi cài đặt hẹn giờ. Chỉ gửi các trường cần đổi.
  /// - timerEnabled: bật/tắt đếm giờ cho cả phiên
  /// - setAll + timeLimitAll: thời gian cho tất cả câu (null = dùng thời gian từng câu)
  /// - questionId + questionTime: thời gian riêng 1 câu (null = dùng mặc định, 0 = không giới hạn)
  void updateTimerSettings(
    String sessionId, {
    bool? timerEnabled,
    bool setAll = false,
    int? timeLimitAll,
    String? questionId,
    int? questionTime,
  }) {
    final payload = <String, dynamic>{'sessionId': sessionId};
    if (timerEnabled != null) payload['timerEnabled'] = timerEnabled;
    if (setAll) payload['timeLimitAll'] = timeLimitAll;
    if (questionId != null) {
      payload['questionId'] = questionId;
      payload['questionTime'] = questionTime;
    }
    _socket?.emit('update_timer_settings', payload);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    isConnected = false;
  }
}
