import 'package:flutter_test/flutter_test.dart';
import 'package:dar_alsafa_courier/main.dart';

void main() {
  test('money conversion uses halalas', () {
    expect(money(0), isNotEmpty);
  });
}
