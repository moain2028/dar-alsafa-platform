import 'package:flutter_test/flutter_test.dart';
import 'package:dar_alsafa_customer/main.dart';

void main() {
  test('calculates Saudi VAT in integer halalas', () {
    expect(calculateVat(10000), 1500);
    expect(calculateVat(0), 0);
  });
}
