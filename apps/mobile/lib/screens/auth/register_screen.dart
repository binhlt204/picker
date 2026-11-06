import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import 'auth_widgets.dart';

class RegisterScreen extends StatefulWidget {
  final String server;
  const RegisterScreen({super.key, required this.server});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  late final TextEditingController _server;
  bool _busy = false;
  String? _error;
  String? _pendingMessage;

  @override
  void initState() {
    super.initState();
    _server = TextEditingController(text: widget.server);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    _server.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await AuthService.instance.register(
        fullName: _name.text,
        email: _email.text,
        password: _password.text,
        serverInput: _server.text,
      );
      if (!mounted) return;
      if (result.pending) {
        setState(() => _pendingMessage = result.message);
      } else {
        // Đã đăng nhập luôn (tài khoản đầu tiên = quản trị viên): về màn đầu để AuthGate hiện màn chính
        Navigator.of(context).popUntil((r) => r.isFirst);
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_pendingMessage != null) {
      return AuthShell(
        title: 'Đăng ký thành công',
        showBack: true,
        children: [
          InlineNotice(_pendingMessage!, error: false),
          const Text('Tài khoản đang chờ quản trị viên duyệt. Sau khi được duyệt bạn có thể đăng nhập.',
              style: TextStyle(fontSize: 13)),
          const SizedBox(height: 16),
          FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Về đăng nhập')),
        ],
      );
    }

    return AuthShell(
      title: 'Tạo tài khoản',
      subtitle: 'Mỗi tài khoản có lớp học, học sinh và đề thi riêng.',
      showBack: true,
      children: [
        if (_error != null) InlineNotice(_error!),
        Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _name,
                textInputAction: TextInputAction.next,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Họ và tên', prefixIcon: Icon(Icons.person_outline)),
                validator: (v) => (v ?? '').trim().isEmpty ? 'Vui lòng nhập họ và tên' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
                validator: validateEmail,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _password,
                obscureText: true,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                    labelText: 'Mật khẩu', helperText: 'Tối thiểu 8 ký tự, gồm chữ và số', prefixIcon: Icon(Icons.lock_outline)),
                validator: validatePassword,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _confirm,
                obscureText: true,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
                decoration: const InputDecoration(labelText: 'Nhập lại mật khẩu', prefixIcon: Icon(Icons.lock_outline)),
                validator: (v) => v != _password.text ? 'Mật khẩu nhập lại không khớp' : null,
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        ServerAddressField(controller: _server),
        const SizedBox(height: 12),
        FilledButton(
          style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Đăng ký', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
