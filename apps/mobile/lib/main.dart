import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'screens/question_controller_screen.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';

List<CameraDescription> cameras = [];

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    cameras = await availableCameras();
  } catch (e) {
    debugPrint("Lỗi tải cameras: $e");
  }
  runApp(const PickballMobileApp());
}

class PickballMobileApp extends StatelessWidget {
  const PickballMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pickball Scanner',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final TextEditingController _urlController;
  List<dynamic> _sessions = [];
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    String defaultUrl = 'http://192.168.1.11:3001';
    if (!kIsWeb && Platform.isAndroid) {
      defaultUrl = 'http://192.168.1.11:3001';
    }
    _urlController = TextEditingController(text: defaultUrl);
    _fetchSessions();
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _fetchSessions() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final serverUrl = _urlController.text.trim();
    try {
      final response = await http
          .get(Uri.parse('$serverUrl/api/sessions'))
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        setState(() {
          _sessions = jsonDecode(response.body);
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Lỗi máy chủ: ${response.statusCode}';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Không thể kết nối đến máy chủ: $serverUrl';
        _loading = false;
      });
    }
  }

  Widget _buildQuickChip(String label, String url) {
    final isSelected = _urlController.text.trim() == url;
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: () {
        setState(() {
          _urlController.text = url;
        });
        _fetchSessions();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.brand : AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.brand : Colors.white12,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isSelected ? Colors.white : Colors.white70,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  void _openSession(dynamic s) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => QuestionControllerScreen(
          serverUrl: _urlController.text.trim(),
          sessionId: s['id'],
          sessionTitle: s['quiz_title'] ?? '',
          className: s['classroom_name'] ?? '',
          cameras: cameras,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Row(
          children: [
            Icon(Icons.qr_code_scanner, color: AppColors.brand),
            SizedBox(width: 8),
            Text(
              'Pickball Scanner',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchSessions,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Server URL configuration card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Địa chỉ Backend Server:',
                    style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _urlController,
                          decoration: InputDecoration(
                            isDense: true,
                            hintText: 'http://<IP_LAN>:3001',
                            filled: true,
                            fillColor: AppColors.surfaceAlt,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                          style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brand,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _fetchSessions,
                        child: const Text('Kết nối'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _buildQuickChip('WiFi PC (192.168.1.11)', 'http://192.168.1.11:3001'),
                      _buildQuickChip('Simulator (localhost)', 'http://localhost:3001'),
                      _buildQuickChip('Android Emu (10.0.2.2)', 'http://10.0.2.2:3001'),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Dùng IP máy tính trong mạng WiFi để iPhone/Android kết nối được máy chủ.',
                    style: TextStyle(color: Colors.white38, fontSize: 10),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Sessions Header
            const Text(
              'Chọn phiên kiểm tra để quét:',
              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),

            // Sessions List
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.wifi_off, size: 48, color: AppColors.danger),
                              const SizedBox(height: 8),
                              Text(_error!, style: const TextStyle(color: Colors.white70), textAlign: TextAlign.center),
                              const SizedBox(height: 12),
                              ElevatedButton(
                                onPressed: _fetchSessions,
                                child: const Text('Thử lại'),
                              ),
                            ],
                          ),
                        )
                      : _sessions.isEmpty
                          ? const Center(
                              child: Text('Chưa có phiên kiểm tra nào đang mở.'),
                            )
                          : ListView.builder(
                              itemCount: _sessions.length,
                              itemBuilder: (context, index) {
                                final s = _sessions[index];
                                final isCompleted = s['status'] == 'COMPLETED';

                                return Card(
                                  color: AppColors.surface,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    side: BorderSide(
                                      color: isCompleted
                                          ? Colors.white10
                                          : AppColors.brand.withValues(alpha: 0.4),
                                    ),
                                  ),
                                  margin: const EdgeInsets.only(bottom: 12),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    onTap: () => _openSession(s),
                                    title: Text(
                                      s['quiz_title'] ?? 'Đề thi',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                    subtitle: Text(
                                      'Lớp: ${s['classroom_name']} • ${s['total_questions'] ?? 0} câu',
                                      style: const TextStyle(color: Colors.white54, fontSize: 12),
                                    ),
                                    trailing: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.brand,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      icon: const Icon(Icons.play_arrow_rounded, size: 18),
                                      label: const Text('Bắt đầu'),
                                      onPressed: () => _openSession(s),
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }
}
