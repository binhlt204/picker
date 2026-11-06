import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';
import 'package:mobile/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('Chưa đăng nhập thì hiện màn đăng nhập LB HOUSE', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.instance.init();

    await tester.pumpWidget(const LbHouseApp());
    await tester.pumpAndSettle();

    expect(find.text('LB HOUSE'), findsOneWidget);
    expect(find.text('Đăng nhập'), findsWidgets);
    expect(find.text('Đăng ký'), findsOneWidget);
  });

  test('normalizeUrl chuẩn hóa địa chỉ máy chủ', () {
    expect(AuthService.normalizeUrl('192.168.1.5:3001/'), 'http://192.168.1.5:3001');
    expect(AuthService.normalizeUrl('https://x.example.com/api'), 'https://x.example.com');
  });
}
