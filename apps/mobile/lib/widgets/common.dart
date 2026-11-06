import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Trạng thái rỗng (chưa có dữ liệu) dùng chung cho các tab.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? hint;
  const EmptyState({super.key, required this.icon, required this.title, this.hint});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: AppColors.textDisabled),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            if (hint != null) ...[
              const SizedBox(height: 6),
              Text(hint!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Trạng thái lỗi kèm nút Thử lại.
class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const ErrorState({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, size: 44, color: AppColors.danger),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 14),
            FilledButton(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }
}

/// Hộp thoại xác nhận (xóa...). Trả về true nếu người dùng đồng ý.
Future<bool> confirmDialog(BuildContext context, {required String title, required String message, String confirm = 'Xóa'}) async {
  final res = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
          style: TextButton.styleFrom(foregroundColor: AppColors.textSecondary),
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('Hủy'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.dangerStrong),
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirm),
        ),
      ],
    ),
  );
  return res ?? false;
}

/// Thẻ danh sách chuẩn: nền surface, viền mờ, nội dung bấm được.
class AppCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  const AppCard({super.key, required this.child, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12), child: child),
        ),
      ),
    );
  }
}

/// Pill trạng thái nhỏ (ví dụ "Đang mở", "Hoàn thành").
class StatusPill extends StatelessWidget {
  final String text;
  final Color color;
  const StatusPill(this.text, this.color, {super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}

/// Ô nhập chữ trong hộp thoại nhập liệu nhanh. Trả về null nếu hủy.
Future<String?> promptText(BuildContext context, {required String title, String? hint, String initial = '', String confirm = 'Lưu'}) {
  final ctrl = TextEditingController(text: initial);
  return showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: TextField(
        controller: ctrl,
        autofocus: true,
        decoration: InputDecoration(hintText: hint),
        onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
      ),
      actions: [
        TextButton(
          style: TextButton.styleFrom(foregroundColor: AppColors.textSecondary),
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Hủy'),
        ),
        FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text.trim()), child: Text(confirm)),
      ],
    ),
  );
}
