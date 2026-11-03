import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  IO.Socket? _socket;
  bool isConnected = false;

  void connect(
    String serverUrl,
    String sessionId, {
    Function(Map<String, dynamic>)? onQuestionStarted,
    Function(Map<String, dynamic>)? onQuestionLocked,
    Function()? onSessionEnded,
    Function(bool)? onConnectionChange,
  }) {
    _socket = IO.io(serverUrl, <String, dynamic>{
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

    _socket?.on('question_locked', (data) {
      if (data is Map<String, dynamic>) {
        onQuestionLocked?.call(data);
      }
    });

    _socket?.on('session_ended', (_) {
      onSessionEnded?.call();
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

  void nextQuestion(String sessionId, String questionId, int timeLimit) {
    _socket?.emit('next_question', {
      'sessionId': sessionId,
      'questionId': questionId,
      'timeLimit': timeLimit,
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    isConnected = false;
  }
}
