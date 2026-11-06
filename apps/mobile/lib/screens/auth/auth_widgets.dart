import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';

/// Logo LB HOUSE (ô vuông màu thương hiệu + chữ) giống trang đăng nhập web.
class LbLogo extends StatelessWidget {
  final double size;
  const LbLogo({super.key, this.size = 44});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(color: AppColors.brand, borderRadius: BorderRadius.circular(size * 0.28)),
          alignment: Alignment.center,
          child: Text('LB', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: size * 0.4)),
        ),
        const SizedBox(width: 12),
        Text('LB HOUSE',
            style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: size * 0.5, letterSpacing: 0.5)),
      ],
    );
  }
}

/// Khung chung của các màn đăng nhập / đăng ký / quên mật khẩu: nền tối, thẻ giữa màn hình,
/// cuộn được trên điện thoại nhỏ hoặc khi bàn phím mở.
class AuthShell extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget> children;
  final bool showBack;

  const AuthShell({super.key, required this.title, this.subtitle, required this.children, this.showBack = false});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: showBack ? AppBar(backgroundColor: AppColors.bg) : null,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(child: LbLogo()),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.surfaceBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        if (subtitle != null) ...[
                          const SizedBox(height: 4),
                          Text(subtitle!, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                        ],
                        const SizedBox(height: 18),
                        ...children,
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Khối chọn địa chỉ máy chủ (thu gọn mặc định) kèm các nút chọn nhanh.
class ServerAddressField extends StatefulWidget {
  final TextEditingController controller;
  const ServerAddressField({super.key, required this.controller});

  @override
  State<ServerAddressField> createState() => _ServerAddressFieldState();
}

class _ServerAddressFieldState extends State<ServerAddressField> {
  bool _open = false;

  static const _quick = <(String, String)>[
    ('WiFi PC', 'http://192.168.1.11:3001'),
    ('localhost', 'http://localhost:3001'),
    ('Android Emu', 'http://10.0.2.2:3001'),
  ];

  @override
  Widget build(BuildContext context) {
    final current = AuthService.normalizeUrl(widget.controller.text);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => setState(() => _open = !_open),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                const Icon(Icons.dns_outlined, size: 16, color: AppColors.textMuted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Máy chủ: $current',
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                ),
                Icon(_open ? Icons.expand_less : Icons.expand_more, size: 18, color: AppColors.textMuted),
              ],
            ),
          ),
        ),
        if (_open) ...[
          const SizedBox(height: 6),
          TextField(
            controller: widget.controller,
            keyboardType: TextInputType.url,
            autocorrect: false,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(isDense: true, hintText: 'http://<IP_LAN>:3001'),
            style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              for (final (label, url) in _quick)
                ChoiceChip(
                  label: Text(label, style: const TextStyle(fontSize: 12)),
                  selected: current == url,
                  selectedColor: AppColors.brand,
                  backgroundColor: AppColors.surfaceAlt,
                  side: BorderSide.none,
                  onSelected: (_) => setState(() => widget.controller.text = url),
                ),
            ],
          ),
          const SizedBox(height: 4),
          const Text('Dùng IP máy tính chạy server trong cùng mạng WiFi.',
              style: TextStyle(color: AppColors.textDisabled, fontSize: 11)),
        ],
      ],
    );
  }
}

/// Khối báo lỗi / thông báo trong thẻ đăng nhập.
class InlineNotice extends StatelessWidget {
  final String message;
  final bool error;
  const InlineNotice(this.message, {super.key, this.error = true});

  @override
  Widget build(BuildContext context) {
    final color = error ? AppColors.danger : AppColors.success;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(message, style: TextStyle(color: error ? const Color(0xFFFDA4AF) : const Color(0xFF6EE7B7), fontSize: 13)),
    );
  }
}

/// Quy tắc mật khẩu giống web: ≥ 8 ký tự, có cả chữ và số.
String? validatePassword(String? v) {
  final p = v ?? '';
  if (p.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
  if (!RegExp(r'[A-Za-z]').hasMatch(p) || !RegExp(r'\d').hasMatch(p)) return 'Mật khẩu cần có cả chữ và số';
  return null;
}

String? validateEmail(String? v) {
  final e = (v ?? '').trim();
  if (e.isEmpty) return 'Vui lòng nhập email';
  if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(e)) return 'Email không hợp lệ';
  return null;
}
