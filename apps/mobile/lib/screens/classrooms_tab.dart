import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/nav.dart';
import '../theme/app_colors.dart';
import '../widgets/common.dart';

/// Tab "Lớp học": danh sách lớp của tài khoản, thêm / xóa lớp, mở chi tiết để quản lý học sinh.
class ClassroomsTab extends StatefulWidget {
  const ClassroomsTab({super.key});

  @override
  State<ClassroomsTab> createState() => _ClassroomsTabState();
}

class _ClassroomsTabState extends State<ClassroomsTab> {
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
      final data = await ApiClient.get('/classrooms');
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
    final name = await promptText(context, title: 'Thêm lớp học', hint: 'Tên lớp, ví dụ 8A1', confirm: 'Thêm');
    if (name == null || name.isEmpty) return;
    try {
      await ApiClient.post('/classrooms', {'name': name});
      _load();
    } on ApiException catch (e) {
      showAppMessage(e.message, error: true);
    }
  }

  Future<void> _delete(Map c) async {
    final ok = await confirmDialog(
      context,
      title: 'Xóa lớp "${c['name']}"?',
      message: 'Toàn bộ học sinh, phiên thi và kết quả của lớp này sẽ bị xóa vĩnh viễn.',
    );
    if (!ok) return;
    try {
      await ApiClient.delete('/classrooms/${c['id']}');
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
        label: const Text('Thêm lớp'),
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
                              icon: Icons.groups_outlined,
                              title: 'Chưa có lớp học nào',
                              hint: 'Bấm "Thêm lớp" để tạo lớp đầu tiên của bạn.',
                            ),
                          ),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                          itemCount: _items.length,
                          itemBuilder: (_, i) {
                            final c = _items[i] as Map;
                            return AppCard(
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => ClassroomDetailScreen(classId: c['id'].toString(), name: c['name'].toString())),
                              ).then((_) => _load()),
                              child: Row(
                                children: [
                                  const Icon(Icons.groups_outlined, color: AppColors.brand),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(c['name'].toString(),
                                        maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                  ),
                                  IconButton(
                                    tooltip: 'Xóa lớp',
                                    icon: const Icon(Icons.delete_outline, color: AppColors.textMuted),
                                    onPressed: () => _delete(c),
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

class ClassroomDetailScreen extends StatefulWidget {
  final String classId;
  final String name;
  const ClassroomDetailScreen({super.key, required this.classId, required this.name});

  @override
  State<ClassroomDetailScreen> createState() => _ClassroomDetailScreenState();
}

class _ClassroomDetailScreenState extends State<ClassroomDetailScreen> {
  List<dynamic> _students = [];
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
      final data = await ApiClient.get('/classrooms/${widget.classId}');
      if (!mounted) return;
      setState(() {
        _students = (data is Map ? data['students'] : null) ?? [];
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

  int get _nextFreeCard {
    final used = _students.map((s) => s['card_id']).toSet();
    for (var i = 1; i <= 50; i++) {
      if (!used.contains(i)) return i;
    }
    return 50;
  }

  Future<void> _addStudent() async {
    final nameCtrl = TextEditingController();
    final cardCtrl = TextEditingController(text: '$_nextFreeCard');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Thêm học sinh'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, autofocus: true, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Họ và tên')),
            const SizedBox(height: 12),
            TextField(
              controller: cardCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Số thẻ (1–50)', helperText: 'Đã gợi ý số thẻ còn trống nhỏ nhất'),
            ),
          ],
        ),
        actions: [
          TextButton(style: TextButton.styleFrom(foregroundColor: AppColors.textSecondary), onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Thêm')),
        ],
      ),
    );
    if (ok != true || nameCtrl.text.trim().isEmpty) return;
    final card = int.tryParse(cardCtrl.text.trim());
    if (card == null || card < 1 || card > 50) {
      showAppMessage('Số thẻ phải từ 1 đến 50', error: true);
      return;
    }
    try {
      await ApiClient.post('/classrooms/${widget.classId}/students', {'full_name': nameCtrl.text.trim(), 'card_id': card});
      _load();
    } on ApiException catch (e) {
      showAppMessage(e.message, error: true);
    }
  }

  Future<void> _bulkAdd() async {
    final ctrl = TextEditingController();
    bool sortAz = true;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Dán danh sách học sinh'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Mỗi dòng một học sinh. Số thẻ được gán tự động vào các số còn trống.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                const SizedBox(height: 10),
                TextField(controller: ctrl, maxLines: 8, minLines: 5, decoration: const InputDecoration(hintText: 'Nguyễn Văn An\nTrần Thị Bình\n...')),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Sắp xếp A–Z theo tên', style: TextStyle(fontSize: 14)),
                  value: sortAz,
                  onChanged: (v) => setD(() => sortAz = v),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(style: TextButton.styleFrom(foregroundColor: AppColors.textSecondary), onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Thêm')),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final names = ctrl.text.split('\n').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    if (names.isEmpty) return;
    try {
      await ApiClient.post('/classrooms/${widget.classId}/students/bulk', {
        'students': [for (final n in names) {'full_name': n}],
        'sort_az': sortAz,
      });
      _load();
    } on ApiException catch (e) {
      showAppMessage(e.message, error: true);
    }
  }

  Future<void> _delete(Map s) async {
    final ok = await confirmDialog(context, title: 'Xóa học sinh?', message: 'Xóa "${s['full_name']}" (thẻ #${s['card_id']}) khỏi lớp.');
    if (!ok) return;
    try {
      await ApiClient.delete('/students/${s['id']}');
      _load();
    } on ApiException catch (e) {
      showAppMessage(e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.name, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(tooltip: 'Dán danh sách', icon: const Icon(Icons.playlist_add), onPressed: _bulkAdd),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        onPressed: _addStudent,
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Thêm học sinh'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _students.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 400, child: EmptyState(icon: Icons.person_outline, title: 'Lớp chưa có học sinh', hint: 'Thêm từng em, hoặc dán cả danh sách bằng nút ở góc trên.')),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                          itemCount: _students.length,
                          itemBuilder: (_, i) {
                            final s = _students[i] as Map;
                            return AppCard(
                              child: Row(
                                children: [
                                  Container(
                                    width: 38,
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    decoration: BoxDecoration(color: AppColors.surfaceAlt, borderRadius: BorderRadius.circular(8)),
                                    alignment: Alignment.center,
                                    child: Text('#${s['card_id']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(child: Text(s['full_name'].toString(), maxLines: 2, overflow: TextOverflow.ellipsis)),
                                  IconButton(
                                    tooltip: 'Xóa học sinh',
                                    icon: const Icon(Icons.delete_outline, color: AppColors.textMuted),
                                    onPressed: () => _delete(s),
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
