import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../services/socket_service.dart';

class ScannerScreen extends StatefulWidget {
  final String serverUrl;
  final String sessionId;
  final String sessionTitle;
  final String className;
  final List<CameraDescription> cameras;

  const ScannerScreen({
    Key? key,
    required this.serverUrl,
    required this.sessionId,
    required this.sessionTitle,
    required this.className,
    required this.cameras,
  }) : super(key: key);

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
  Timer? _countdownTimer;
  int _secondsLeft = 0;

  @override
  void initState() {
    super.initState();
    _initCamera();
    _initSocket();
  }

  Future<void> _initCamera() async {
    if (widget.cameras.isEmpty) return;

    // Use back camera
    final backCamera = widget.cameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.back,
      orElse: () => widget.cameras.first,
    );

    _cameraController = CameraController(
      backCamera,
      ResolutionPreset.high,
      enableAudio: false,
    );

    try {
      await _cameraController!.initialize();
      if (mounted) setState(() {});
    } catch (e) {
      debugPrint("Camera error: $e");
    }
  }

  void _initSocket() {
    _socketService.connect(
      widget.serverUrl,
      widget.sessionId,
      onQuestionStarted: (data) {
        if (!mounted) return;
        setState(() {
          _currentQuestion = data;
          _isLocked = false;
          _scannedCardIds.clear();
          _scannedCount = 0;
          _secondsLeft = data['timeLimit'] ?? 30;
        });
        _startTimer();
      },
      onQuestionLocked: (data) {
        if (!mounted) return;
        setState(() {
          _isLocked = true;
        });
        _countdownTimer?.cancel();
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

  void _startTimer() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft <= 1) {
        timer.cancel();
        if (mounted) {
          setState(() {
            _secondsLeft = 0;
            _isLocked = true;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _secondsLeft--;
          });
        }
      }
    });
  }

  // Submit mock card for demonstration or testing when physical cards are scanned
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
    _countdownTimer?.cancel();
    _cameraController?.dispose();
    _socketService.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Camera Feed or Placeholder
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

            // Top Header Overlay
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _currentQuestion != null
                                ? 'Câu ${_currentQuestion!['questionOrder']}/${_currentQuestion!['totalQuestions']}'
                                : 'Đang chờ bắt đầu...',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            '${widget.className} • ${widget.sessionTitle}',
                            style: const TextStyle(color: Colors.white54, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    // Countdown Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _secondsLeft <= 5 ? Colors.red.withOpacity(0.3) : Colors.blue.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _secondsLeft <= 5 ? Colors.redAccent : Colors.blueAccent,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.timer_outlined,
                            size: 16,
                            color: _secondsLeft <= 5 ? Colors.redAccent : Colors.blueAccent,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${_secondsLeft}s',
                            style: TextStyle(
                              color: _secondsLeft <= 5 ? Colors.redAccent : Colors.blueAccent,
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

            // Center Target Crosshair
            Center(
              child: Container(
                width: 260,
                height: 260,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.greenAccent.withOpacity(0.5), width: 2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Center(
                  child: Text(
                    'Hướng camera về phía học sinh',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 12,
                      backgroundColor: Colors.black45,
                    ),
                  ),
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
                  color: const Color(0xFF0F172A).withOpacity(0.95),
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
                            const Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 20),
                            const SizedBox(width: 6),
                            Text(
                              'Đã quét: $_scannedCount học sinh',
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
                              color: Colors.red.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'ĐÃ KHÓA',
                              style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
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
                              backgroundColor: Colors.red.shade900,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            onPressed: _isLocked ? null : () => _socketService.lockQuestion(widget.sessionId),
                            icon: const Icon(Icons.lock_outline, size: 18),
                            label: const Text('Khóa Câu'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.indigo.shade600,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: _isLocked
                              ? null
                              : () {
                                  // Quét mẫu thẻ ngẫu nhiên để test
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
                            backgroundColor: const Color(0xFF334155),
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
