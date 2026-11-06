import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'screens/auth/auth_widgets.dart';
import 'screens/auth/login_screen.dart';
import 'screens/classrooms_tab.dart';
import 'screens/quizzes_tab.dart';
import 'screens/sessions_tab.dart';
import 'services/auth_service.dart';
import 'services/nav.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'widgets/common.dart';

List<CameraDescription> cameras = [];

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    cameras = await availableCameras();
  } catch (e) {
    debugPrint("Lỗi tải cameras: $e");
  }
  await AuthService.instance.init();
  runApp(const LbHouseApp());
}

class LbHouseApp extends StatelessWidget {
  const LbHouseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LB HOUSE',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      navigatorKey: navigatorKey,
      scaffoldMessengerKey: messengerKey,
      home: const AuthGate(),
    );
  }
}

/// Chưa đăng nhập -> màn đăng nhập; đã đăng nhập -> màn chính. Tự đổi khi đăng nhập/đăng xuất/hết phiên.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AuthService.instance,
      builder: (context, _) {
        final auth = AuthService.instance;
        if (!auth.initialized) {
          return const Scaffold(body: Center(child: LbLogo()));
        }
        return auth.isLoggedIn ? HomeShell(key: ValueKey(auth.token)) : const LoginScreen();
      },
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _titles = ['Phiên thi', 'Lớp học', 'Đề thi'];

  Future<void> _changeServer() async {
    final url = await promptText(
      context,
      title: 'Địa chỉ máy chủ',
      hint: 'http://192.168.1.11:3001',
      initial: AuthService.instance.serverUrl,
    );
    if (url == null || url.isEmpty) return;
    await AuthService.instance.setServerUrl(url);
    // Địa chỉ mới có thể là máy chủ khác -> đăng nhập lại cho đúng tài khoản trên máy chủ đó
    await AuthService.instance.logout();
    showAppMessage('Đã đổi máy chủ, vui lòng đăng nhập lại');
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthService.instance;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            const LbLogo(size: 28),
            const SizedBox(width: 10),
            Expanded(
              child: Text(_titles[_index],
                  maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Tài khoản',
            icon: const Icon(Icons.account_circle_outlined),
            color: AppColors.surfaceAlt,
            onSelected: (v) {
              if (v == 'server') _changeServer();
              if (v == 'logout') auth.logout();
            },
            itemBuilder: (_) => [
              PopupMenuItem<String>(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(auth.displayName, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    if (auth.email.isNotEmpty && auth.email != auth.displayName)
                      Text(auth.email, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'server', child: Text('Đổi máy chủ')),
              const PopupMenuItem(value: 'logout', child: Text('Đăng xuất')),
            ],
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          SessionsTab(cameras: cameras),
          const ClassroomsTab(),
          const QuizzesTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.brand.withValues(alpha: 0.25),
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.event_note_outlined), selectedIcon: Icon(Icons.event_note), label: 'Phiên thi'),
          NavigationDestination(icon: Icon(Icons.groups_outlined), selectedIcon: Icon(Icons.groups), label: 'Lớp học'),
          NavigationDestination(icon: Icon(Icons.quiz_outlined), selectedIcon: Icon(Icons.quiz), label: 'Đề thi'),
        ],
      ),
    );
  }
}
