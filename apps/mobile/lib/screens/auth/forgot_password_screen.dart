import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import 'auth_widgets.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final String server;
  const ForgotPasswordScreen({super.key, required this.server});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _done;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final msg = await AuthService.instance.forgotPassword(_email.text, serverInput: widget.server);
      if (mounted) setState(() => _done = msg);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthShell(
      title: 'Quên mật khẩu',
      subtitle: 'Nhập email tài khoản, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.',
      showBack: true,
      children: [
        if (_error != null) InlineNotice(_error!),
        if (_done != null) InlineNotice(_done!, error: false),
        Form(
          key: _formKey,
          child: TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
            validator: validateEmail,
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Gửi hướng dẫn', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
