import 'package:flutter_test/flutter_test.dart';
import 'package:mangafriq_creator/main.dart';

void main() {
  testWidgets('Creator app loads', (WidgetTester tester) async {
    await tester.pumpWidget(const MangafriqCreatorApp());
    expect(find.text('Séries'), findsOneWidget);
  });
}
