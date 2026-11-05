import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../utils/server_timer.dart';

/// Gửi thay đổi cài đặt hẹn giờ lên server (chỉ các trường được truyền).
typedef TimerUpdate = void Function({
  bool? timerEnabled,
  bool setAll,
  int? timeLimitAll,
  String? questionId,
  int? questionTime,
});

const int _minSeconds = 5;
const int _maxSeconds = 600;

String _describe(int? seconds) => seconds == null ? 'Không giới hạn' : '$seconds giây';

/// Kết quả hộp thoại nhập thời gian: value = null nghĩa là "dùng mặc định".
class _SecondsResult {
  final int? value;
  const _SecondsResult(this.value);
}

/// Bảng cài đặt thời gian trên điện thoại. Đồng bộ với máy chiếu qua server:
/// bật/tắt đếm giờ, thời gian cho tất cả câu, thời gian riêng từng câu.
Future<void> showTimerSettingsSheet({
  required BuildContext context,
  required ValueNotifier<TimerSettingsData> settings,
  required List<dynamic> questions,
  String? currentQuestionId,
  required TimerUpdate onUpdate,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    // Không đặt backgroundColor: lấy từ bottomSheetTheme (AppTheme.dark) để nền tối
    // nhất quán với toàn app thay vì nền trắng kiểu Plickers trước đây.
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetContext) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (ctx, scrollController) => ValueListenableBuilder<TimerSettingsData>(
        valueListenable: settings,
        builder: (ctx, s, _) {
          return ListView(
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(color: AppColors.textDisabled, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const Text(
                'Cài đặt thời gian',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 4),
              const Text(
                'Đồng bộ ngay với máy chiếu. Sửa thời gian của câu đang chạy sẽ đếm lại câu đó từ đầu.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: s.timerEnabled,
                onChanged: (v) => onUpdate(timerEnabled: v),
                title: const Text('Đếm giờ cho câu hỏi', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(
                  s.timerEnabled
                      ? 'Hết giờ hệ thống tự khóa câu'
                      : 'Không giới hạn thời gian, giáo viên tự bấm Khóa câu',
                ),
              ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                enabled: s.timerEnabled,
                leading: const Icon(Icons.timer_outlined),
                title: const Text('Thời gian cho tất cả câu', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(s.timeLimitAll == null ? 'Theo thời gian từng câu trong đề' : _describe(s.timeLimitAll! > 0 ? s.timeLimitAll : null)),
                trailing: const Icon(Icons.edit),
                onTap: () async {
                  final r = await _askSeconds(
                    ctx,
                    title: 'Thời gian cho tất cả câu',
                    current: s.timeLimitAll,
                    defaultLabel: 'Theo từng câu',
                  );
                  if (r != null) onUpdate(setAll: true, timeLimitAll: r.value);
                },
              ),
              const Divider(),
              const Padding(
                padding: EdgeInsets.only(top: 4, bottom: 4),
                child: Text('Thời gian từng câu', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              ),
              ...questions.map((q) {
                final id = q['id'].toString();
                final order = q['question_order'];
                final bank = (q['time_limit'] is num) ? (q['time_limit'] as num).toInt() : 30;
                final own = s.questionTimes[id];
                final isCurrent = id == currentQuestionId;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  enabled: s.timerEnabled,
                  tileColor: isCurrent ? AppColors.brand.withValues(alpha: 0.15) : null,
                  leading: CircleAvatar(
                    radius: 14,
                    backgroundColor: isCurrent ? AppColors.brand : AppColors.surfaceAlt,
                    child: Text(
                      '$order',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isCurrent ? Colors.white : AppColors.textSecondary),
                    ),
                  ),
                  title: Text(q['content']?.toString() ?? '', maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text(
                    'Đang áp dụng: ${_describe(s.effectiveFor(id, bank))}'
                    '${own != null ? ' (riêng)' : ''}${isCurrent ? ' • đang chạy' : ''}',
                  ),
                  trailing: const Icon(Icons.edit, size: 18),
                  onTap: () async {
                    final r = await _askSeconds(
                      ctx,
                      title: 'Thời gian câu $order',
                      current: own,
                      defaultLabel: 'Mặc định',
                    );
                    if (r != null) onUpdate(questionId: id, questionTime: r.value);
                  },
                );
              }),
            ],
          );
        },
      ),
    ),
  );
}

/// Hộp thoại nhập số giây. Trả về null nếu bấm Hủy.
Future<_SecondsResult?> _askSeconds(
  BuildContext context, {
  required String title,
  required int? current,
  required String defaultLabel,
}) async {
  final controller = TextEditingController(text: current != null && current > 0 ? '$current' : '');
  String? error;
  final result = await showDialog<_SecondsResult>(
    context: context,
    builder: (dialogContext) => StatefulBuilder(
      builder: (dialogContext, setLocal) {
        void save() {
          final n = int.tryParse(controller.text.trim());
          if (n == null || n < _minSeconds || n > _maxSeconds) {
            setLocal(() => error = 'Nhập từ $_minSeconds đến $_maxSeconds giây');
            return;
          }
          Navigator.pop(dialogContext, _SecondsResult(n));
        }

        return AlertDialog(
          title: Text(title),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: controller,
                autofocus: true,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(suffixText: 'giây', errorText: error, hintText: 'Ví dụ: 30'),
                onSubmitted: (_) => save(),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [15, 30, 45, 60, 90]
                    .map((v) => ActionChip(
                          label: Text('${v}s'),
                          onPressed: () => Navigator.pop(dialogContext, _SecondsResult(v)),
                        ))
                    .toList(),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, const _SecondsResult(null)),
              child: Text(defaultLabel),
            ),
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, const _SecondsResult(0)),
              child: const Text('Không giới hạn'),
            ),
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Hủy')),
            FilledButton(onPressed: save, child: const Text('Lưu')),
          ],
        );
      },
    ),
  );
  controller.dispose();
  return result;
}
