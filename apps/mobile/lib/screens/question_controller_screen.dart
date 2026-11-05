import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import '../services/socket_service.dart';
import 'scanner_screen.dart';

class QuestionControllerScreen extends StatefulWidget {
  final String serverUrl;
  final String sessionId;
  final String sessionTitle;
  final String className;
  final List<CameraDescription> cameras;

  const QuestionControllerScreen({
    super.key,
    required this.serverUrl,
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
  bool _showCorrect = false;

  // Đáp án & thống kê cho câu hỏi hiện tại
  Map<String, int> _distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0};
  Map<int, String> _answers = {}; // cardId -> answer
  String _correctOption = 'A';

  @override
  void initState() {
    super.initState();
    _loadSessionDetails();
    _initSocket();
  }

  @override
  void dispose() {
    _socketService.disconnect();
    super.dispose();
  }

  void _initSocket() {
    _socketService.connect(
      widget.serverUrl,
      widget.sessionId,
      onQuestionStarted: (data) {
        if (!mounted) return;
        setState(() {
          _isLocked = false;
          final qOrder = data['questionOrder'];
          if (qOrder != null && _questions.isNotEmpty) {
            final idx = _questions.indexWhere((q) => q['question_order'] == qOrder);
            if (idx != -1) _currentIndex = idx;
          }
          if (data['correctOption'] != null) {
            _correctOption = data['correctOption'];
          }
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
      final res = await http
          .get(Uri.parse('${widget.serverUrl}/api/sessions/${widget.sessionId}'))
          .timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final List<dynamic> qList = data['questions'] ?? [];
        final List<dynamic> stList = data['students'] ?? [];
        final currentOrder = data['current_question_order'] ?? 1;

        int initIndex = 0;
        if (qList.isNotEmpty) {
          final idx = qList.indexWhere((q) => q['question_order'] == currentOrder);
          if (idx != -1) initIndex = idx;
        }

        setState(() {
          _questions = qList;
          _totalStudents = stList.length;
          _currentIndex = initIndex;
          _loading = false;
        });

        // Lấy tiếp dữ liệu chi tiết của câu hiện tại
        await _fetchCurrentQuestionData();
      } else {
        setState(() {
          _error = 'Lỗi máy chủ: ${res.statusCode}';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Không thể kết nối đến máy chủ: $e';
        _loading = false;
      });
    }
  }

  Future<void> _fetchCurrentQuestionData() async {
    try {
      final res = await http.get(
        Uri.parse('${widget.serverUrl}/api/sessions/${widget.sessionId}/current-question'),
      );
      if (res.statusCode == 200 && mounted) {
        final data = jsonDecode(res.body);
        setState(() {
          _isLocked = data['isLocked'] ?? false;
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
    _socketService.nextQuestion(
      widget.sessionId,
      targetQ['id'],
      timeLimit: targetQ['time_limit'] ?? 30,
    );
  }

  void _toggleLock() {
    _socketService.lockQuestion(widget.sessionId);
    setState(() {
      _isLocked = true;
    });
  }

  void _openCameraScanner() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ScannerScreen(
          serverUrl: widget.serverUrl,
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
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator(color: Color(0xFF0284C7))),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: Colors.black87), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _loadSessionDetails,
                  child: const Text('Thử lại'),
                ),
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
      backgroundColor: const Color(0xFFF8FAFC), // Nền sáng sạch sẽ chuẩn phong cách Plickers
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. TOP BAR: [1  5] ------- [8A1] [X]
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                children: [
                  // Số thứ tự câu hỏi: 1  5
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '$qOrder ',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        TextSpan(
                          text: '$totalQ',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const Spacer(),

                  // Badge tên lớp (Ví dụ: 8A1)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF38BDF8),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      widget.className,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),

                  const SizedBox(width: 10),

                  // Nút đóng thoát về trang chủ
                  InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Color(0xFFE2E8F0),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close, size: 18, color: Color(0xFF475569)),
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
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                        height: 1.3,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // 4 LỰA CHỌN ĐÁP ÁN: A, B, C, D
                    _buildOptionRow('A', q?['option_a'] ?? ''),
                    const SizedBox(height: 16),
                    _buildOptionRow('B', q?['option_b'] ?? ''),
                    const SizedBox(height: 16),
                    _buildOptionRow('C', q?['option_c'] ?? ''),
                    const SizedBox(height: 16),
                    _buildOptionRow('D', q?['option_d'] ?? ''),

                    const SizedBox(height: 32),
                    const Divider(color: Color(0xFFE2E8F0), height: 1),
                    const SizedBox(height: 18),

                    // 3. THỐNG KÊ (KPIs): [• 27% average] [11 responses] [35 missing]
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatItem('• $avgPercent%', 'average', isBullet: true),
                        _buildStatItem('$responsesCount', 'responses'),
                        _buildStatItem('$missingCount', 'missing'),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 4. ACTION TOGGLES: [Show Correct] ---------- [Show Graph / Khóa câu]
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF0284C7),
                      padding: EdgeInsets.zero,
                    ),
                    onPressed: () {
                      setState(() {
                        _showCorrect = !_showCorrect;
                      });
                    },
                    child: Text(
                      _showCorrect ? 'Hide Correct' : 'Show Correct',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: _isLocked ? Colors.redAccent : const Color(0xFF0284C7),
                      padding: EdgeInsets.zero,
                    ),
                    onPressed: _isLocked ? null : _toggleLock,
                    icon: Icon(_isLocked ? Icons.lock : Icons.lock_open, size: 16),
                    label: Text(
                      _isLocked ? 'Đã khóa' : 'Khóa câu',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            // 5. BOTTOM CONTROL BAR: [|◀] ---- [◯ CAMERA] ---- [▶|]
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Nút Câu trước: |◀
                  IconButton(
                    iconSize: 28,
                    color: _currentIndex > 0 ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
                    icon: const Icon(Icons.skip_previous_rounded),
                    onPressed: _currentIndex > 0 ? _goToPreviousQuestion : null,
                  ),

                  // NÚT TRÒN TO QUÉT CAMERA: ◯
                  GestureDetector(
                    onTap: _openCameraScanner,
                    child: Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                        border: Border.all(color: const Color(0xFF0EA5E9), width: 4.5),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF0EA5E9).withValues(alpha: 0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.camera_alt, color: Color(0xFF0EA5E9), size: 30),
                      ),
                    ),
                  ),

                  // Nút Câu tiếp theo: ▶|
                  IconButton(
                    iconSize: 28,
                    color: _currentIndex < totalQ - 1 ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
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

  // Khối dòng hiển thị 1 lựa chọn đáp án (A, B, C, D)
  Widget _buildOptionRow(String optKey, String optText) {
    final count = _distribution[optKey] ?? 0;
    final isCorrect = _correctOption.toUpperCase() == optKey.toUpperCase();

    // Màu sắc theo trạng thái Show Correct
    Color badgeColor = const Color(0xFFE2E8F0);
    Color badgeTextColor = const Color(0xFF64748B);
    Color barColor = Colors.transparent;

    if (_showCorrect) {
      if (isCorrect) {
        badgeColor = const Color(0xFF10B981);
        badgeTextColor = Colors.white;
        barColor = const Color(0xFF10B981);
      } else {
        badgeColor = const Color(0xFFF1F5F9);
        badgeTextColor = const Color(0xFF64748B);
        if (count > 0) {
          barColor = const Color(0xFFF43F5E); // Màu đỏ nếu có học sinh chọn đáp án sai
        }
      }
    }

    // Tính độ dài thanh tiến độ dựa trên tỷ lệ phản hồi
    final int responsesCount = _answers.length;
    final double fraction = responsesCount > 0 ? (count / responsesCount).clamp(0.0, 1.0) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Badge chữ cái (A, B, C, D)
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(6),
              ),
              alignment: Alignment.center,
              child: Text(
                optKey,
                style: TextStyle(
                  color: badgeTextColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Nội dung đáp án
            Expanded(
              child: Text(
                optText.isNotEmpty ? optText : '(Chưa có nội dung)',
                style: const TextStyle(
                  fontSize: 16,
                  color: Color(0xFF0F172A),
                  fontWeight: FontWeight.w600,
                  height: 1.25,
                ),
              ),
            ),

            const SizedBox(width: 12),

            // Số lượng học sinh chọn đáp án này
            Text(
              '$count',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
          ],
        ),

        const SizedBox(height: 6),

        // Thanh tiến độ màu bên dưới đáp án
        LayoutBuilder(
          builder: (context, constraints) {
            final double fullWidth = constraints.maxWidth;
            final double barWidth = fraction * fullWidth;

            return Stack(
              children: [
                // Đường viền nền mờ
                Container(
                  height: 3.5,
                  width: fullWidth,
                  color: const Color(0xFFF1F5F9),
                ),
                // Thanh màu thực tế
                if (barColor != Colors.transparent && barWidth > 0)
                  Container(
                    height: 3.5,
                    width: barWidth,
                    decoration: BoxDecoration(
                      color: barColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  // Khối số liệu thống kê (average, responses, missing)
  Widget _buildStatItem(String value, String label, {bool isBullet = false}) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isBullet ? const Color(0xFFF43F5E) : const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF94A3B8),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

