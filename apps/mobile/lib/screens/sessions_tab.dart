import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../theme/app_colors.dart';
import '../widgets/common.dart';
import 'question_controller_screen.dart';

/// Tab "Phiên thi": các phiên của tài khoản đang đăng nhập, tạo phiên mới, mở màn điều khiển/quét.
class SessionsTab extends StatefulWidget {
  final List<CameraDescription> cameras;
  const SessionsTab({super.key, required this.cameras});

  @override
  State<SessionsTab> createState() => _SessionsTabState();
}

class _SessionsTabState extends State<SessionsTab> {
  List<dynamic> _sessions = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.get('/sessions');
      if (!mounted) return;
      setState(() {
        _sessions = data is List ? data : [];
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  void _open(Map s) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => QuestionControllerScreen(
          sessionId: s['id'].toString(),
          sessionTitle: (s['quiz_title'] ?? '').toString(),
          className: (s['classroom_name'] ?? '').toString(),
          cameras: widget.cameras,
        ),
      ),
    ).then((_) => _load());
  }

  Future<void> _create() async {
    final created = await showModalBottomSheet<Map>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _CreateSessionSheet(),
    );
    if (created != null && mounted) {
      await _load();
      if (mounted) _open(created);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        onPressed: _create,
        icon: const Icon(Icons.add),
        label: const Text('Phiên mới'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _sessions.isEmpty
                      ? ListView(children: [
                          SizedBox(
                            height: 400,
                            child: const EmptyState(
                              icon: Icons.event_note_outlined,
                              title: 'Chưa có phiên thi nào',
                              hint: 'Bấm "Phiên mới" để chọn lớp và đề thi rồi bắt đầu quét.',
                            ),
                          ),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                          itemCount: _sessions.length,
                          itemBuilder: (_, i) {
                            final s = _sessions[i] as Map;
                            final done = s['status'] == 'COMPLETED';
                            return AppCard(
                              onTap: () => _open(s),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text((s['quiz_title'] ?? 'Đề thi').toString(),
                                            maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                        const SizedBox(height: 4),
                                        Text('Lớp ${s['classroom_name']} • ${s['total_questions'] ?? 0} câu • ${s['total_students'] ?? 0} học sinh',
                                            maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  done ? const StatusPill('Hoàn thành', AppColors.textMuted) : const StatusPill('Đang mở', AppColors.success),
                                  const Icon(Icons.chevron_right, color: AppColors.textDisabled),
                                ],
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class _CreateSessionSheet extends StatefulWidget {
  const _CreateSessionSheet();

  @override
  State<_CreateSessionSheet> createState() => _CreateSessionSheetState();
}

class _CreateSessionSheetState extends State<_CreateSessionSheet> {
  List<dynamic> _classes = [];
  List<dynamic> _quizzes = [];
  String? _classId;
  String? _quizId;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await Future.wait([ApiClient.get('/classrooms'), ApiClient.get('/quizzes')]);
      if (!mounted) return;
      setState(() {
        _classes = r[0] is List ? r[0] : [];
        _quizzes = (r[1] is List ? r[1] : []).where((q) => (q['question_count'] ?? 0) > 0).toList();
        _loading = false;
      });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    }
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await ApiClient.post('/sessions', {'classroom_id': _classId, 'quiz_id': _quizId});
      final cls = _classes.firstWhere((c) => c['id'] == _classId);
      final quiz = _quizzes.firstWhere((q) => q['id'] == _quizId);
      if (!mounted) return;
      Navigator.pop(context, {
        'id': (data is Map ? data['id'] : null),
        'quiz_title': quiz['title'],
        'classroom_name': cls['name'],
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: _loading
          ? const SizedBox(height: 160, child: Center(child: CircularProgressIndicator()))
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Tạo phiên thi mới', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  if (_error != null) ...[
                    Text(_error!, style: const TextStyle(color: AppColors.danger)),
                    const SizedBox(height: 10),
                  ],
                  if (_classes.isEmpty || _quizzes.isEmpty)
                    Text(
                      _classes.isEmpty
                          ? 'Bạn chưa có lớp học nào. Hãy tạo lớp ở tab "Lớp học" trước.'
                          : 'Bạn chưa có đề thi nào có câu hỏi. Hãy tạo đề ở tab "Đề thi" trước.',
                      style: const TextStyle(color: AppColors.textMuted),
                    )
                  else ...[
                    DropdownButtonFormField<String>(
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Lớp học'),
                      dropdownColor: AppColors.surfaceAlt,
                      items: [for (final c in _classes) DropdownMenuItem(value: c['id'].toString(), child: Text(c['name'].toString(), overflow: TextOverflow.ellipsis))],
                      onChanged: (v) => setState(() => _classId = v),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Đề thi'),
                      dropdownColor: AppColors.surfaceAlt,
                      items: [
                        for (final q in _quizzes)
                          DropdownMenuItem(value: q['id'].toString(), child: Text('${q['title']} (${q['question_count']} câu)', overflow: TextOverflow.ellipsis))
                      ],
                      onChanged: (v) => setState(() => _quizId = v),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                      onPressed: (_classId == null || _quizId == null || _busy) ? null : _submit,
                      child: _busy
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Tạo và mở phiên', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
