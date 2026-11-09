import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3001/api');
final sar = NumberFormat.currency(locale: 'ar_SA', symbol: 'ر.س');
String money(int halalas) => sar.format(halalas / 100);
int calculateVat(int taxableHalalas) => (taxableHalalas * 0.15).round();

class Api {
  String token = '';
  Future<void> login(String email, String password) async {
    final data = await _call('POST', '/auth/login', body: {'email': email, 'password': password}, authenticated: false);
    token = data['accessToken'] as String;
  }
  Future<List<dynamic>> products() async => (await _call('GET', '/products')) as List<dynamic>;
  Future<Map<String, dynamic>> order(List<Map<String, dynamic>> items, String address) async =>
      (await _call('POST', '/orders', body: {'type': 'DELIVERY', 'paymentMethod': 'CASH', 'address': address, 'latitude': 24.7064, 'longitude': 46.6839, 'items': items})) as Map<String, dynamic>;
  Future<dynamic> _call(String method, String path, {Map<String, dynamic>? body, bool authenticated = true}) async {
    final uri = Uri.parse('$apiUrl$path');
    final headers = {'Content-Type': 'application/json', if (authenticated && token.isNotEmpty) 'Authorization': 'Bearer $token'};
    final response = await (method == 'GET' ? http.get(uri, headers: headers) : http.post(uri, headers: headers, body: jsonEncode(body)));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode >= 400) throw Exception(data['message']?.toString() ?? 'تعذر الاتصال بالخدمة');
    return data;
  }
}

void main() => runApp(const CustomerApp());
class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'دار الصفاء', debugShowCheckedModeBanner: false, locale: const Locale('ar'),
    supportedLocales: const [Locale('ar'), Locale('en')],
    localizationsDelegates: const [GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate],
    theme: ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff12372c)), scaffoldBackgroundColor: const Color(0xfff5f7f4)),
    home: const Directionality(textDirection: TextDirection.rtl, child: LoginScreen()),
  );
}

class LoginScreen extends StatefulWidget { const LoginScreen({super.key}); @override State<LoginScreen> createState() => _LoginScreenState(); }
class _LoginScreenState extends State<LoginScreen> {
  final api = Api(), email = TextEditingController(text: 'customer@daralsafa.local'), password = TextEditingController(text: 'DarAlsafa!2026'), address = TextEditingController(text: 'الرياض، العليا، شارع موسى بن نصير');
  bool busy = false; String error = '';
  Future<void> login() async { setState(() => busy = true); try { await api.login(email.text.trim(), password.text); if (!mounted) return; Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => MenuScreen(api: api, address: address.text))); } catch (e) { setState(() => error = e.toString()); } finally { if (mounted) setState(() => busy = false); } }
  @override
  Widget build(BuildContext context) => Scaffold(body: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 430), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const Icon(Icons.restaurant_menu, size: 64, color: Color(0xff12372c)), const SizedBox(height: 20), Text('دار الصفاء', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)), const SizedBox(height: 8), const Text('اطلب ضيافتك المفضلة وتتبعها حتى بابك', textAlign: TextAlign.center), const SizedBox(height: 32),
    TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'البريد الإلكتروني', border: OutlineInputBorder())), const SizedBox(height: 14),
    TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'كلمة المرور', border: OutlineInputBorder())), const SizedBox(height: 14),
    TextField(controller: address, maxLines: 2, decoration: const InputDecoration(labelText: 'عنوان التوصيل', border: OutlineInputBorder())), const SizedBox(height: 14),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)), const SizedBox(height: 8), FilledButton(onPressed: busy ? null : login, child: Text(busy ? 'جارٍ الدخول…' : 'دخول وطلب')),
  ]))))));
}

class MenuScreen extends StatefulWidget { final Api api; final String address; const MenuScreen({super.key, required this.api, required this.address}); @override State<MenuScreen> createState() => _MenuScreenState(); }
class _MenuScreenState extends State<MenuScreen> {
  List<dynamic> products = []; final Map<String, int> cart = {}; bool loading = true, checkingOut = false; String error = '';
  @override void initState() { super.initState(); _load(); }
  Future<void> _load() async { try { final rows = await widget.api.products(); setState(() { products = rows.where((p) => p['active'] == true).toList(); loading = false; }); } catch (e) { setState(() { error = e.toString(); loading = false; }); } }
  int get total => cart.entries.fold(0, (sum, entry) { final p = products.firstWhere((p) => p['id'] == entry.key); return sum + (p['priceHalalas'] as int) * entry.value; });
  Future<void> checkout() async {
    if (cart.isEmpty) return; setState(() => checkingOut = true);
    try { final result = await widget.api.order(cart.entries.map((e) => {'productId': e.key, 'quantity': e.value}).toList(), widget.address); if (!mounted) return;
      await showDialog(context: context, builder: (_) => AlertDialog(icon: const Icon(Icons.check_circle, color: Colors.green, size: 50), title: Text('تم استلام الطلب ${result['orderNumber']}'), content: Text('الإجمالي: ${money(result['totalHalalas'])}\nرمز التسليم: ${result['deliveryCode']}\nاحتفظ بالرمز ولا تشاركه إلا عند الاستلام.'), actions: [FilledButton(onPressed: () => Navigator.pop(context), child: const Text('حسناً'))]));
      setState(() => cart.clear());
    } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()))); } finally { if (mounted) setState(() => checkingOut = false); }
  }
  @override
  Widget build(BuildContext context) => Directionality(textDirection: TextDirection.rtl, child: Scaffold(appBar: AppBar(title: const Text('قائمة دار الصفاء')), body: loading ? const Center(child: CircularProgressIndicator()) : error.isNotEmpty ? Center(child: Text(error)) : ListView.separated(padding: const EdgeInsets.all(16), itemCount: products.length, separatorBuilder: (_, __) => const SizedBox(height: 10), itemBuilder: (context, index) {
    final p = products[index], quantity = cart[p['id']] ?? 0;
    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(p['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)), const SizedBox(height: 6), Text(p['description'] ?? ''), const SizedBox(height: 12), Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(money(p['priceHalalas']), style: const TextStyle(fontWeight: FontWeight.bold)), quantity == 0 ? FilledButton.tonal(onPressed: () => setState(() => cart[p['id']] = 1), child: const Text('إضافة')) : Row(children: [IconButton(onPressed: () => setState(() { if (quantity == 1) cart.remove(p['id']); else cart[p['id']] = quantity - 1; }), icon: const Icon(Icons.remove_circle_outline)), Text('$quantity'), IconButton(onPressed: () => setState(() => cart[p['id']] = quantity + 1), icon: const Icon(Icons.add_circle_outline))])])])));
  }), bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: FilledButton.icon(onPressed: checkingOut || cart.isEmpty ? null : checkout, icon: const Icon(Icons.shopping_bag), label: Text(checkingOut ? 'جارٍ تأكيد الطلب…' : 'تأكيد السلة · ${money(total)}'))))));
}
