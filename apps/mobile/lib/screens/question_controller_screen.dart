import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/nav.dart';
import '../services/socket_service.dart';
import '../theme/app_colors.dart';
import '../utils/server_timer.dart';
import '../widgets/timer_settings_sheet.dart';
import 'scanner_screen.dart';

class QuestionControllerScreen extends StatefulWidget {
  final String sessionId;
  final String sessionTitle;
  final String className;
  final List<CameraDescription> cameras;

  const QuestionControllerScreen({
    super.key,
    required this.sessionId,
    required this.sessionTitle,
    required this.className,
    required this.cameras,
  });

  @override
  State<QuestionControllerScreen> createState() => _QuestionControllerScreenState();
}

class _QuestionControllerScreenState extends State<QuestionControllerScreen> {
  final SocketService _socketService = SocketService();

  List<dynamic> _questions = [];
  int _currentIndex = 0;
  bool _loading = true;
  String? _error;

  int _totalStudents = 0;
  bool _isLocked = false;
  bool _showCorrect = true; // GV thấy đáp án đúng ngay từ đầu, không cần đợi hết giờ

  // Đáp án & thống kê cho câu hỏi hiện tại
  Map<String, int> _distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0};
  Map<int, String> _answers = {}; // cardId -> answer
  String _correctOption = 'A';

  // Đồng hồ đồng bộ theo server + cài đặt hẹn giờ của phiên
  final ServerTimer _timer = ServerTimer();
  final ValueNotifier<TimerSettingsData> _timerSettings = ValueNotifier(TimerSettingsData());
  Timer? _ticker;
  int? _secondsLeft;
  bool _started = false; // phiên đã có câu đang chạy chưa (false = GV chưa bấm Bắt đầu)

  @override
  void initState() {
    super.initState();
    _loadSessionDetails();
    _initSocket();
    _ticker = Timer.periodic(const Duration(milliseconds: 250), (_) {
      final left = _timer.secondsLeft();
      if (left != _secondsLeft && mounted) setState(() => _secondsLeft = left);
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _timerSettings.dispose();
    _socketService.disconnect();
    super.dispose();
  }

  void _applyTimer(Map<dynamic, dynamic> data) {
    _timer.apply(data);
    _secondsLeft = _timer.secondsLeft();
  }

  void _initSocket() {
    _socketService.connect(
      AuthService.instance.serverUrl,
      widget.sessionId,
      token: AuthService.instance.token ?? '',
      onAuthError: () => AuthService.instance.sessionExpired(),
      onQuestionUnlocked: (data) {
        if (!mounted) return;
        setState(() {
          _isLocked = false;
          _applyTimer(data);
        });
      },
      onQuestionStarted: (data) {
        if (!mounted) return;
        setState(() {
          _started = true;
          _isLocked = false;
          _applyTimer(data);
          final qOrder = data['questionOrder'];
          if (qOrder != null && _questions.isNotEmpty) {
            final idx = _questions.indexWhere((q) => q['question_order'] == qOrder);
            if (idx != -1) _currentIndex = idx;
          }
          // Đáp án đúng: ưu tiên server gửi, nếu thiếu thì lấy từ danh sách câu hỏi đã tải
          _correctOption = data['correctOption'] ??
              _currentQuestion?['correct_option'] ??
              _correctOption;
          _distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0};
          _answers.clear();
        });
      },
      onStudentsUpdated: (data) {
        if (!mounted) return;
        setState(() {
          if (data['totalStudents'] != null) {
            _totalStudents = data['totalStudents'];
          }
          if (data['answerDistribution'] != null) {
            final dist = data['answerDistribution'];
            _distribution = {
              'A': dist['A'] ?? 0,
              'B': dist['B'] ?? 0,
              'C': dist['C'] ?? 0,
              'D': dist['D'] ?? 0,
            };
          }
          if (data['answers'] != null) {
            final Map<String, dynamic> rawAns = data['answers'];
            _answers = rawAns.map((k, v) => MapEntry(int.parse(k), v.toString()));
          }
        });
      },
      onQuestionLocked: (data) {
        if (!mounted) return;
        setState(() {
          _isLocked = true;
          _timer.stop();
          _secondsLeft = null;
          if (data['correctOption'] != null) {
            _correctOption = data['correctOption'];
          }
          if (data['answerDistribution'] != null) {
            final dist = data['answerDistribution'];
            _distribution = {
              'A': dist['A'] ?? 0,
              'B': dist['B'] ?? 0,
              'C': dist['C'] ?? 0,
              'D': dist['D'] ?? 0,
            };
          }
        });
      },
      onTimerSettings: (data) {
        if (!mounted) return;
        _timerSettings.value = TimerSettingsData.fromJson(data['settings']);
        final current = data['current'];
        if (current is Map) setState(() => _applyTimer(current));
      },
      onError: (message) {
        if (!mounted) return;
        showAppMessage(message, error: true);
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

  Future<void> _loadSessionDetails() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await ApiClient.get('/sessions/${widget.sessionId}');
      {
        final List<dynamic> qList = data['questions'] ?? [];
        final List<dynamic> stList = data['students'] ?? [];
        final currentOrder = data['current_question_order'] ?? 1;
        _timerSettings.value = TimerSettingsData.fromJson(data['timer_settings']);

        int initIndex = 0;
        if (qList.isNotEmpty) {
          final idx = qList.indexWhere((q) => q['question_order'] == currentOrder);
          if (idx != -1) initIndex = idx;
        }

        setState(() {
          _questions = qList;
          _totalStudents = stList.length;
          _currentIndex = initIndex;
          _correctOption = (qList.isNotEmpty ? qList[initIndex]['correct_option'] : null) ?? _correctOption;
          _loading = false;
        });

        // Lấy tiếp dữ liệu chi tiết của câu hiện tại
        await _fetchCurrentQuestionData();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _fetchCurrentQuestionData() async {
    try {
      final data = await ApiClient.get('/sessions/${widget.sessionId}/current-question');
      if (data is Map && mounted) {
        if (data['timerSettings'] != null) {
          _timerSettings.value = TimerSettingsData.fromJson(data['timerSettings']);
        }
        setState(() {
          _started = true;
          _isLocked = data['isLocked'] ?? false;
          _applyTimer(data);
          _correctOption = data['correctOption'] ?? _currentQuestion?['correct_option'] ?? 'A';
          if (data['totalStudents'] != null) {
            _totalStudents = data['totalStudents'];
          }
          if (data['answerDistribution'] != null) {
            final dist = data['answerDistribution'];
            _distribution = {
              'A': dist['A'] ?? 0,
              'B': dist['B'] ?? 0,
              'C': dist['C'] ?? 0,
              'D': dist['D'] ?? 0,
            };
          }
          if (data['answers'] != null) {
            final Map<String, dynamic> rawAns = data['answers'];
            _answers = rawAns.map((k, v) => MapEntry(int.parse(k), v.toString()));
          }
        });
      }
    } catch (_) {}
  }

  Map<String, dynamic>? get _currentQuestion {
    if (_questions.isEmpty || _currentIndex >= _questions.length) return null;
    return _questions[_currentIndex];
  }

  void _goToPreviousQuestion() {
    if (_currentIndex > 0) {
      _changeQuestion(_currentIndex - 1);
    }
  }

  void _goToNextQuestion() {
    if (_currentIndex < _questions.length - 1) {
      _changeQuestion(_currentIndex + 1);
    }
  }

  void _changeQuestion(int newIndex) {
    if (newIndex < 0 || newIndex >= _questions.length) return;
    final targetQ = _questions[newIndex];
    setState(() {
      _currentIndex = newIndex;
      _distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0};
      _answers.clear();
      _isLocked = false;
      _correctOption = targetQ['correct_option'] ?? 'A';
    });

    // Phát lệnh chuyển câu hỏi tới server và máy chiếu
    _socketService.nextQuestion(widget.sessionId, targetQ['id']);
  }

  void _openTimerSettings() {
    showTimerSettingsSheet(
      context: context,
      settings: _timerSettings,
      questions: _questions,
      currentQuestionId: _isLocked ? null : _currentQuestion?['id']?.toString(),
      onUpdate: ({bool? timerEnabled, bool setAll = false, int? timeLimitAll, String? questionId, int? questionTime}) {
        _socketService.updateTimerSettings(
          widget.sessionId,
          timerEnabled: timerEnabled,
          setAll: setAll,
          timeLimitAll: timeLimitAll,
          questionId: questionId,
          questionTime: questionTime,
        );
      },
    );
  }

  /// Chip đồng hồ trên thanh trên cùng: số giây còn lại (đồng bộ máy chiếu) hoặc ∞ khi không giới hạn.
  Widget _buildTimerChip() {
    final left = _secondsLeft;
    final String label;
    Color color;
    if (!_started) {
      label = 'Chưa bắt đầu';
      color = AppColors.textMuted;
    } else if (_isLocked) {
      label = 'Đã khóa';
      color = AppColors.textMuted;
    } else if (left == null) {
      label = '∞';
      color = AppColors.brand;
    } else {
      label = '${left}s';
      color = left <= 5 ? AppColors.danger : AppColors.brand;
    }
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: _openTimerSettings,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.5)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.timer_outlined, size: 16, color: color),
            const SizedBox(width: 4),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 14)),
            const SizedBox(width: 4),
            const Icon(Icons.settings, size: 14, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }

  /// Khóa câu: giữ nguyên câu hiện tại, ngừng nhận đáp án (có thể mở khóa lại).
  void _lock() {
    _socketService.lockQuestion(widget.sessionId);
    setState(() => _isLocked = true);
  }

  /// Mở khóa: cùng câu hỏi, giữ đáp án đã quét, đồng hồ đếm lại. Chờ server xác nhận (question_unlocked).
  void _unlock() {
    _socketService.unlockQuestion(widget.sessionId);
  }

  void _openCameraScanner() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ScannerScreen(
          sessionId: widget.sessionId,
          sessionTitle: widget.sessionTitle,
          className: widget.className,
          cameras: widget.cameras,
        ),
      ),
    );
    // Khi người dùng quét xong đóng Camera quay lại, nạp lại dữ liệu thống kê mới nhất
    _fetchCurrentQuestionData();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.bg,
        body: Center(child: CircularProgressIndicator(color: AppColors.brand)),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(backgroundColor: AppColors.bg),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.textSecondary), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(onPressed: _loadSessionDetails, child: const Text('Thử lại')),
              ],
            ),
          ),
        ),
      );
    }

    final q = _currentQuestion;
    final totalQ = _questions.length;
    final qOrder = q?['question_order'] ?? (_currentIndex + 1);

    // Tính toán số liệu
    final responsesCount = _answers.length;
    final missingCount = (_totalStudents - responsesCount) > 0 ? (_totalStudents - responsesCount) : 0;

    int correctCount = 0;
    _answers.forEach((_, ans) {
      if (ans.toUpperCase() == _correctOption.toUpperCase()) {
        correctCount++;
      }
    });

    final int avgPercent = responsesCount > 0 ? ((correctCount / responsesCount) * 100).round() : 0;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. THANH TRÊN: [1 / 5] ------- [đồng hồ] [Lớp] [X]
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                children: [
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '$qOrder ',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
                        ),
                        TextSpan(
                          text: '/ $totalQ',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Tên lớp dài thì cắt bằng dấu "…" thay vì tràn khỏi màn hình
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.brand.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        widget.className,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 12),
                      ),
                    ),
                  ),
                  const Spacer(),
                  _buildTimerChip(),
                  const SizedBox(width: 8),
                  InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(color: AppColors.surfaceAlt, shape: BoxShape.circle),
                      child: const Icon(Icons.close, size: 18, color: AppColors.textSecondary),
                    ),
                  ),
                ],
              ),
            ),

            // 2. NỘI DUNG CÂU HỎI
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      q != null ? 'Câu $qOrder. ${q['content']}' : 'Đang tải câu hỏi...',
                      style: const TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                        height: 1.3,
                      ),
                    ),
                    if (_showCorrect && q != null) ...[
                      const SizedBox(height: 12),
                      _buildCorrectChip(_correctOption),
                    ],
                    const SizedBox(height: 24),
                    _buildOptionRow('A', q?['option_a'] ?? ''),
                    const SizedBox(height: 16),
                    _buildOptionRow('B', q?['option_b'] ?? ''),
                    const SizedBox(height: 16),
                    _buildOptionRow('C', q?['option_c'] ?? ''),
                    const SizedBox(height: 16),
                    _buildOptionRow('D', q?['option_d'] ?? ''),
                    const SizedBox(height: 32),
                    const Divider(color: AppColors.surfaceBorder, height: 1),
                    const SizedBox(height: 18),

                    // 3. THỐNG KÊ: tỉ lệ đúng / đã trả lời / chưa trả lời
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatItem('$avgPercent%', 'đúng', isHighlight: true),
                        _buildStatItem('$responsesCount', 'đã trả lời'),
                        _buildStatItem('$missingCount', 'chưa trả lời'),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),

            // Phiên chưa bắt đầu: nút bắt đầu câu đang xem (đồng bộ máy chiếu)
            if (!_started && q != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.brand,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () => _changeQuestion(_currentIndex),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: Text('Bắt đầu câu $qOrder', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),

            // 4. NÚT PHỤ: [Ẩn/Hiện đáp án] ---------- [Khóa câu / Mở khóa]
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    style: TextButton.styleFrom(foregroundColor: AppColors.brand, padding: EdgeInsets.zero),
                    onPressed: () => setState(() => _showCorrect = !_showCorrect),
                    child: Text(
                      _showCorrect ? 'Ẩn đáp án' : 'Hiện đáp án',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: _isLocked ? AppColors.brand : AppColors.danger,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    onPressed: !_started ? null : (_isLocked ? _unlock : _lock),
                    icon: Icon(_isLocked ? Icons.lock_open_outlined : Icons.lock_outline, size: 18),
                    label: Text(
                      _isLocked ? 'Mở khóa' : 'Khóa câu',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            // 5. THANH ĐIỀU KHIỂN DƯỚI: [|◀] ---- [◯ CAMERA] ---- [▶|]
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.surfaceBorder)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    iconSize: 28,
                    color: AppColors.textPrimary,
                    disabledColor: AppColors.textDisabled,
                    icon: const Icon(Icons.skip_previous_rounded),
                    onPressed: _currentIndex > 0 ? _goToPreviousQuestion : null,
                  ),
                  GestureDetector(
                    onTap: _openCameraScanner,
                    child: Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.surface,
                        border: Border.all(color: AppColors.brand, width: 4),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.brand.withValues(alpha: 0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Center(child: Icon(Icons.camera_alt, color: AppColors.brand, size: 30)),
                    ),
                  ),
                  IconButton(
                    iconSize: 28,
                    color: AppColors.textPrimary,
                    disabledColor: AppColors.textDisabled,
                    icon: const Icon(Icons.skip_next_rounded),
                    onPressed: _currentIndex < totalQ - 1 ? _goToNextQuestion : null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Nhãn "Đáp án đúng: X" hiển thị ngay dưới nội dung câu hỏi
  Widget _buildCorrectChip(String option) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.success),
      ),
      child: Text(
        '✓ Đáp án đúng: ${option.toUpperCase()}',
        style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 15),
      ),
    );
  }

  // Khối dòng hiển thị 1 lựa chọn đáp án (A, B, C, D)
  Widget _buildOptionRow(String optKey, String optText) {
    final count = _distribution[optKey] ?? 0;
    final isCorrect = _correctOption.toUpperCase() == optKey.toUpperCase();
    final bool markCorrect = _showCorrect && isCorrect;

    // Ô chữ cái giữ màu riêng từng đáp án (khớp thẻ giấy); đáp án đúng thêm dấu ✓
    final Color letterColor = AppColors.forOption(optKey);
    final Color letterText = optKey.toUpperCase() == 'B' ? const Color(0xFF1C1917) : Colors.white;

    // Thanh tiến độ: xanh nếu là đáp án đúng, đỏ nếu có học sinh chọn đáp án sai
    Color barColor = Colors.transparent;
    if (_showCorrect) {
      if (isCorrect) {
        barColor = AppColors.success;
      } else if (count > 0) {
        barColor = AppColors.danger;
      }
    }

    final int responsesCount = _answers.length;
    final double fraction = responsesCount > 0 ? (count / responsesCount).clamp(0.0, 1.0) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(color: letterColor, borderRadius: BorderRadius.circular(8)),
                  alignment: Alignment.center,
                  child: Text(
                    optKey,
                    style: TextStyle(color: letterText, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                if (markCorrect)
                  Positioned(
                    right: -4,
                    bottom: -4,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.bg, width: 1.5),
                      ),
                      child: const Icon(Icons.check, size: 9, color: Colors.white),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                optText.isNotEmpty ? optText : '(Chưa có nội dung)',
                style: TextStyle(
                  fontSize: 16,
                  color: optText.isNotEmpty ? AppColors.textPrimary : AppColors.textDisabled,
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              '$count',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
          ],
        ),
        const SizedBox(height: 6),
        LayoutBuilder(
          builder: (context, constraints) {
            final double fullWidth = constraints.maxWidth;
            final double barWidth = fraction * fullWidth;
            return Stack(
              children: [
                Container(height: 4, width: fullWidth, decoration: BoxDecoration(color: AppColors.surfaceAlt, borderRadius: BorderRadius.circular(2))),
                if (barColor != Colors.transparent && barWidth > 0)
                  Container(
                    height: 4,
                    width: barWidth,
                    decoration: BoxDecoration(color: barColor, borderRadius: BorderRadius.circular(2)),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  // Khối số liệu thống kê
  Widget _buildStatItem(String value, String label, {bool isHighlight = false}) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: isHighlight ? AppColors.brand : AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
