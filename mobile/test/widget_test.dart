import 'package:flutter_test/flutter_test.dart';
import 'package:mangafriq_reader/main.dart';
import 'package:mangafriq_reader/src/router.dart';
import 'package:mangafriq_reader/src/startup.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({kOnboardingDoneKey: true});
  });

  testWidgets('Shell shows reader brand after startup', (WidgetTester tester) async {
    await tester.pumpWidget(MangafriqReaderApp(router: createRouter(appStartup)));
    await tester.pumpAndSettle(const Duration(seconds: 5));
    expect(find.text('Accueil'), findsOneWidget);
    expect(find.text('Explorer'), findsOneWidget);
  });
}
