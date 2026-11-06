import 'dart:async';
import 'dart:io' show File;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/nav.dart';
import '../services/socket_service.dart';
import '../theme/app_colors.dart';
import '../utils/server_timer.dart';

class ScannerScreen extends StatefulWidget {
  final String sessionId;
  final String sessionTitle;
  final String className;
  final List<CameraDescription> cameras;

  const ScannerScreen({
    super.key,
    required this.sessionId,
    required this.sessionTitle,
    required this.className,
    required this.cameras,
  });

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  CameraController? _cameraController;
  final SocketService _socketService = SocketService();

  Map<String, dynamic>? _currentQuestion;
  bool _isLocked = false;
  int _scannedCount = 0;
  final Set<int> _scannedCardIds = {};
  // Đồng hồ đồng bộ theo server (cùng số giây với máy chiếu); null = không giới hạn thời gian
  final ServerTimer _timer = ServerTimer();
  Timer? _countdownTimer;
  int? _secondsLeft;

  bool _isScanningLoopActive = false;
  bool _isProcessingFrame = false;
  String _lastDetectedInfo = '';

  @override
  void initState() {
    super.initState();
    _initCamera();
    _initSocket();
    _fetchCurrentQuestion();
  }

  Future<void> _fetchCurrentQuestion() async {
    try {
      final data = await ApiClient.get('/sessions/${widget.sessionId}/current-question');
      if (data is Map && mounted) {
        setState(() {
          _currentQuestion = Map<String, dynamic>.from(data);
          _isLocked = data['isLocked'] ?? false;
          _timer.apply(data);
          _secondsLeft = _timer.secondsLeft();
          if (data['submittedCardIds'] != null) {
            final List<dynamic> list = data['submittedCardIds'];
            for (var id in list) {
              _scannedCardIds.add(id as int);
            }
            _scannedCount = _scannedCardIds.length;
          }
        });
        _startTimer();
      }
    } catch (e) {
      debugPrint("Error fetching current question: $e");
    }
  }

  Future<void> _initCamera() async {
    List<CameraDescription> available = widget.cameras;
    if (available.isEmpty) {
      try {
        available = await availableCameras();
      } catch (e) {
        debugPrint("Error loading cameras on iOS/Android: $e");
      }
    }

    if (available.isEmpty) {
      debugPrint("Không tìm thấy camera khả dụng.");
      return;
    }

    final backCamera = available.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.back,
      orElse: () => available.first,
    );

    _cameraController = CameraController(
      backCamera,
      ResolutionPreset.medium, // Medium giúp chụp nhanh 100-150ms và độ phân giải đủ sắc nét cho ArUco
      enableAudio: false,
    );

    try {
      await _cameraController!.initialize();
      // Khóa hướng chụp ảnh đứng (Portrait) chuẩn cho iOS và Android
      try {
        await _cameraController!.lockCaptureOrientation(DeviceOrientation.portraitUp);
      } catch (_) {}

      if (mounted) {
        setState(() {});
        _startAutoScanLoop();
      }
    } catch (e) {
      debugPrint("Camera error: $e");
    }
  }

  void _startAutoScanLoop() {
    _isScanningLoopActive = true;
    _runScanCycle();
  }

  Future<void> _runScanCycle() async {
    while (_isScanningLoopActive && mounted) {
      if (_cameraController != null &&
          _cameraController!.value.isInitialized &&
          !_isProcessingFrame &&
          !_isLocked &&
          _currentQuestion != null) {
        _isProcessingFrame = true;
        try {
          final XFile file = await _cameraController!.takePicture();
          final bytes = await file.readAsBytes();
          if (!kIsWeb) {
            try {
              await File(file.path).delete();
            } catch (_) {}
          }

          // Gửi frame tới server để nhận diện ArUco OpenCV
          final data = await ApiClient.postBytes('/sessions/${widget.sessionId}/scan-frame', bytes);

          if (data is Map && mounted) {
            final List<dynamic> accepted = data['accepted'] ?? [];
            if (accepted.isNotEmpty) {
              final newNames = <String>[];
              for (var item in accepted) {
                final cardId = item['cardId'] as int;
                final name = item['studentName'] as String;
                final ans = item['answer'] as String;
                _scannedCardIds.add(cardId);
                newNames.add('#$cardId $name ($ans)');
              }

              setState(() {
                _scannedCount = _scannedCardIds.length;
                _lastDetectedInfo = '✅ Đã nhận: ${newNames.join(', ')}';
              });
            }
          }
        } catch (e) {
          debugPrint("Scan cycle error: $e");
        } finally {
          _isProcessingFrame = false;
        }
      }

      await Future.delayed(const Duration(milliseconds: 350));
    }
  }

  void _initSocket() {
    _socketService.connect(
      AuthService.instance.serverUrl,
      widget.sessionId,
      token: AuthService.instance.token ?? '',
      onAuthError: () => AuthService.instance.sessionExpired(),
      onError: (msg) => showAppMessage(msg, error: true),
      onQuestionUnlocked: (data) {
        if (!mounted) return;
        setState(() {
          _isLocked = false;
          _timer.apply(data);
          _secondsLeft = _timer.secondsLeft();
          _lastDetectedInfo = '🔓 Đã mở khóa, tiếp tục quét';
        });
        _startTimer();
      },
      onQuestionStarted: (data) {
        if (!mounted) return;
        setState(() {
          _currentQuestion = data;
          _isLocked = false;
          _scannedCardIds.clear();
          _scannedCount = 0;
          _timer.apply(data);
          _secondsLeft = _timer.secondsLeft();
          _lastDetectedInfo = '';
        });
        _startTimer();
      },
      onQuestionLocked: (data) {
        if (!mounted) return;
        setState(() {
          _isLocked = true;
          _timer.stop();
          _secondsLeft = null;
          _lastDetectedInfo = '🔒 Câu hỏi đã khóa!';
        });
      },
      // Cài đặt thời gian đổi (từ máy chiếu hoặc màn điều khiển) -> cập nhật đồng hồ câu đang chạy
      onTimerSettings: (data) {
        if (!mounted) return;
        final current = data['current'];
        if (current is Map) {
          setState(() {
            _timer.apply(current);
            _secondsLeft = _timer.secondsLeft();
          });
        }
      },
      onSessionEnded: () {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Phiên thi đã kết thúc!')),
        );
        Navigator.pop(context);
      },
    );
  }

  /// Cập nhật số giây còn lại theo đồng hồ server. Hết giờ thì ngừng quét (server cũng tự khóa câu).
  void _startTimer() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (!mounted) return;
      final left = _timer.secondsLeft();
      if (left != _secondsLeft) {
        setState(() {
          _secondsLeft = left;
          if (left == 0) _isLocked = true;
        });
      }
    });
  }

  void _submitCardAnswer(int cardId, String answer) {
    if (_currentQuestion == null || _isLocked) return;

    if (!_scannedCardIds.contains(cardId)) {
      _scannedCardIds.add(cardId);
      setState(() {
        _scannedCount = _scannedCardIds.length;
      });

      _socketService.submitBatch(
        widget.sessionId,
        _currentQuestion!['questionId'],
        [
          {'cardId': cardId, 'answer': answer}
        ],
      );
    }
  }

  @override
  void dispose() {
    _isScanningLoopActive = false;
    _countdownTimer?.cancel();
    _cameraController?.dispose();
    _socketService.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool timeWarning = _secondsLeft != null && _secondsLeft! <= 5;
    final String timeLabel = _isLocked ? 'Khóa' : (_secondsLeft == null ? '∞' : '${_secondsLeft}s');
    final questionOrder = _currentQuestion?['questionOrder'] ?? '?';
    final totalQ = _currentQuestion?['totalQuestions'] ?? '?';
    final questionContent = _currentQuestion?['content'] ?? 'Chờ giáo viên bắt đầu câu hỏi...';
    final String? correctOption = _currentQuestion?['correctOption']?.toString().toUpperCase();

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Camera Feed or Loading
            if (_cameraController != null && _cameraController!.value.isInitialized)
              Positioned.fill(
                child: CameraPreview(_cameraController!),
              )
            else
              const Center(
                child: Text(
                  'Đang khởi động Camera...',
                  style: TextStyle(color: Colors.white70),
                ),
              ),

            // Top Header Bar
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.surface.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white12),
                  boxShadow: const [
                    BoxShadow(color: Colors.black45, blurRadius: 15, offset: Offset(0, 4))
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.brand.withValues(alpha: 0.3),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'CÂU $questionOrder/$totalQ',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  widget.className,
                                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  questionContent,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              // Đáp án đúng hiển thị ngay từ đầu cho GV
                              if (correctOption != null) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.forOption(correctOption),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'ĐÁP ÁN: $correctOption',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Countdown Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: timeWarning
                            ? AppColors.danger.withValues(alpha: 0.3)
                            : AppColors.brand.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: timeWarning ? AppColors.danger : AppColors.brand,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.timer_outlined,
                            size: 16,
                            color: timeWarning ? AppColors.danger : AppColors.brand,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            timeLabel,
                            style: TextStyle(
                              color: timeWarning ? AppColors.danger : AppColors.brand,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Live Crosshair & Scanning status
            Center(
              child: Container(
                width: 270,
                height: 270,
                decoration: BoxDecoration(
                  border: Border.all(
                    color: _isProcessingFrame ? AppColors.brand : AppColors.success.withValues(alpha: 0.6),
                    width: _isProcessingFrame ? 3 : 2,
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.qr_code_scanner,
                            color: Colors.white.withValues(alpha: 0.4),
                            size: 48,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isProcessingFrame ? 'Đang nhận diện...' : 'Quét thẻ ArUco học sinh',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                              fontSize: 12,
                              backgroundColor: Colors.black54,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Detection Notification Toast
            if (_lastDetectedInfo.isNotEmpty)
              Positioned(
                top: 90,
                left: 20,
                right: 20,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.success,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: const [
                      BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 4))
                    ],
                  ),
                  child: Text(
                    _lastDetectedInfo,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),

            // Bottom Control Sheet
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface.withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white12),
                  boxShadow: const [
                    BoxShadow(color: Colors.black45, blurRadius: 20, offset: Offset(0, 8))
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Stats Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.check_circle_outline, color: AppColors.success, size: 20),
                            const SizedBox(width: 6),
                            Text(
                              'Đã nhận: $_scannedCount học sinh',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        if (_isLocked)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.danger.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'ĐÃ KHÓA',
                              style: TextStyle(color: AppColors.danger, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          )
                        else
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppColors.success,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'Tự động quét',
                                style: TextStyle(color: AppColors.success, fontSize: 11),
                              ),
                            ],
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Actions
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _isLocked ? AppColors.brand : AppColors.dangerStrong,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            onPressed: _currentQuestion == null
                                ? null
                                : _isLocked
                                    ? () => _socketService.unlockQuestion(widget.sessionId)
                                    : () => _socketService.lockQuestion(widget.sessionId),
                            icon: Icon(_isLocked ? Icons.lock_open_outlined : Icons.lock_outline, size: 18),
                            label: Text(_isLocked ? 'Mở khóa' : 'Khóa câu'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.surfaceSubtle,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: _isLocked
                              ? null
                              : () {
                                  final nextCardId = _scannedCardIds.length + 1;
                                  if (nextCardId <= 15) {
                                    final options = ['A', 'B', 'C', 'D'];
                                    _submitCardAnswer(nextCardId, options[nextCardId % 4]);
                                  }
                                },
                          icon: const Icon(Icons.flash_on, size: 16),
                          label: const Text('Quét Test'),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.surfaceSubtle,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: () {
                            Navigator.pop(context);
                          },
                          child: const Icon(Icons.close, size: 18),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
