import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/nav.dart';
import '../theme/app_colors.dart';
import '../widgets/common.dart';

/// Tab "Đề thi": danh sách đề của tài khoản, thêm / xóa đề, mở chi tiết để quản lý câu hỏi.
class QuizzesTab extends StatefulWidget {
  const QuizzesTab({super.key});

  @override
  State<QuizzesTab> createState() => _QuizzesTabState();
}

class _QuizzesTabState extends State<QuizzesTab> {
  List<dynamic> _items = [];
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
      final data = await ApiClient.get('/quizzes');
      if (!mounted) return;
      setState(() {
        _items = data is List ? data : [];
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

  Future<void> _add() async {
    final title = await promptText(context, title: 'Thêm đề thi', hint: 'Tên đề thi', confirm: 'Thêm');
    if (title == null || title.isEmpty) return;
    try {
      await ApiClient.post('/quizzes', {'title': title});
      _load();
    } on ApiException catch (e) {
      showAppMessage(e.message, error: true);
    }
  }

  Future<void> _delete(Map q) async {
    final ok = await confirmDialog(
      context,
      title: 'Xóa đề "${q['title']}"?',
      message: 'Toàn bộ câu hỏi và phiên thi dùng đề này sẽ bị xóa vĩnh viễn.',
    );
    if (!ok) return;
    try {
      await ApiClient.delete('/quizzes/${q['id']}');
      _load();
    } on ApiException catch (e) {
      showAppMessage(e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        onPressed: _add,
        icon: const Icon(Icons.add),
        label: const Text('Thêm đề'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          SizedBox(
                            height: 400,
                            child: EmptyState(
                              icon: Icons.quiz_outlined,
                              title: 'Chưa có đề thi nào',
                              hint: 'Bấm "Thêm đề" để tạo đề. Nhập đề từ file Word hiện chỉ có trên web.',
                            ),
                          ),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                          itemCount: _items.length,
                          itemBuilder: (_, i) {
                            final q = _items[i] as Map;
                            return AppCard(
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => QuizDetailScreen(quizId: q['id'].toString(), title: q['title'].toString())),
                              ).then((_) => _load()),
                              child: Row(
                                children: [
                                  const Icon(Icons.quiz_outlined, color: AppColors.brand),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(q['title'].toString(), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                        const SizedBox(height: 2),
                                        Text('${q['question_count'] ?? 0} câu hỏi', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    tooltip: 'Xóa đề',
                                    icon: const Icon(Icons.delete_outline, color: AppColors.textMuted),
                                    onPressed: () => _delete(q),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class QuizDetailScreen extends StatefulWidget {
  final String quizId;
  final String title;
  const QuizDetailScreen({super.key, required this.quizId, required this.title});

  @override
  State<QuizDetailScreen> createState() => _QuizDetailScreenState();
}

class _QuizDetailScreenState extends State<QuizDetailScreen> {
  List<dynamic> _questions = [];
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
      final data = await ApiClient.get('/quizzes/${widget.quizId}');
      if (!mounted) return;
      setState(() {
        _questions = (data is Map ? data['questions'] : null) ?? [];
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

  Future<void> _add() async {
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _QuestionForm(quizId: widget.quizId),
    );
    if (added == true) _load();
  }

  Future<void> _delete(Map q) async {
    final ok = await confirmDialog(context, title: 'Xóa câu hỏi?', message: 'Câu ${q['question_order']}: ${q['content']}');
    if (!ok) return;
    try {
      await ApiClient.delete('/questions/${q['id']}');
      _load();
    } on ApiException catch (e) {
      showAppMessage(e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title, overflow: TextOverflow.ellipsis)),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        onPressed: _add,
        icon: const Icon(Icons.add),
        label: const Text('Thêm câu hỏi'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _questions.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 400, child: EmptyState(icon: Icons.help_outline, title: 'Đề chưa có câu hỏi', hint: 'Bấm "Thêm câu hỏi" để soạn câu trắc nghiệm A/B/C/D.')),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                          itemCount: _questions.length,
                          itemBuilder: (_, i) {
                            final q = _questions[i] as Map;
                            final correct = (q['correct_option'] ?? '').toString().toUpperCase();
                            return AppCard(
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Câu ${q['question_order']}. ${q['content']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                                        const SizedBox(height: 8),
                                        for (final k in ['A', 'B', 'C', 'D'])
                                          Padding(
                                            padding: const EdgeInsets.only(bottom: 2),
                                            child: Text(
                                              '$k. ${q['option_${k.toLowerCase()}']}',
                                              style: TextStyle(
                                                fontSize: 13,
                                                color: k == correct ? AppColors.success : AppColors.textSecondary,
                                                fontWeight: k == correct ? FontWeight.bold : FontWeight.normal,
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    tooltip: 'Xóa câu hỏi',
                                    icon: const Icon(Icons.delete_outline, color: AppColors.textMuted),
                                    onPressed: () => _delete(q),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class _QuestionForm extends StatefulWidget {
  final String quizId;
  const _QuestionForm({required this.quizId});

  @override
  State<_QuestionForm> createState() => _QuestionFormState();
}

class _QuestionFormState extends State<_QuestionForm> {
  final _formKey = GlobalKey<FormState>();
  final _content = TextEditingController();
  final _opts = {for (final k in ['A', 'B', 'C', 'D']) k: TextEditingController()};
  final _time = TextEditingController(text: '30');
  String _correct = 'A';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _content.dispose();
    _time.dispose();
    for (final c in _opts.values) {
      c.dispose();
    }
    super.dispose();
  }

  String? _required(String? v) => (v ?? '').trim().isEmpty ? 'Không được để trống' : null;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final time = int.tryParse(_time.text.trim());
    if (time == null || time < 5 || time > 180) {
      setState(() => _error = 'Thời gian phải từ 5 đến 180 giây');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ApiClient.post('/quizzes/${widget.quizId}/questions', {
        'content': _content.text.trim(),
        'option_a': _opts['A']!.text.trim(),
        'option_b': _opts['B']!.text.trim(),
        'option_c': _opts['C']!.text.trim(),
        'option_d': _opts['D']!.text.trim(),
        'correct_option': _correct,
        'time_limit': time,
      });
      if (mounted) Navigator.pop(context, true);
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
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Thêm câu hỏi', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 14),
              if (_error != null) ...[
                Text(_error!, style: const TextStyle(color: AppColors.danger)),
                const SizedBox(height: 10),
              ],
              TextFormField(controller: _content, maxLines: 3, minLines: 2, decoration: const InputDecoration(labelText: 'Nội dung câu hỏi'), validator: _required),
              for (final k in ['A', 'B', 'C', 'D']) ...[
                const SizedBox(height: 10),
                TextFormField(
                  controller: _opts[k],
                  decoration: InputDecoration(
                    labelText: 'Đáp án $k',
                    prefixIcon: Padding(
                      padding: const EdgeInsets.all(10),
                      child: CircleAvatar(
                        radius: 10,
                        backgroundColor: AppColors.forOption(k),
                        child: Text(k, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: k == 'B' ? const Color(0xFF1C1917) : Colors.white)),
                      ),
                    ),
                  ),
                  validator: _required,
                ),
              ],
              const SizedBox(height: 14),
              const Text('Đáp án đúng', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                children: [
                  for (final k in ['A', 'B', 'C', 'D'])
                    ChoiceChip(
                      label: Text(k),
                      selected: _correct == k,
                      selectedColor: AppColors.success,
                      labelStyle: TextStyle(color: _correct == k ? Colors.white : AppColors.textSecondary, fontWeight: FontWeight.bold),
                      backgroundColor: AppColors.surfaceAlt,
                      side: BorderSide.none,
                      onSelected: (_) => setState(() => _correct = k),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _time,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Thời gian (giây, 5–180)'),
              ),
              const SizedBox(height: 16),
              FilledButton(
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Lưu câu hỏi', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
