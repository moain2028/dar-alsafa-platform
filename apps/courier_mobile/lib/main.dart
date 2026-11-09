import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3001/api');
final sar = NumberFormat.currency(locale: 'ar_SA', symbol: 'ر.س');
String money(int halalas) => sar.format(halalas / 100);

class CourierApi {
  String token = '';
  Future<void> login(String email, String password) async { final data = await _call('POST', '/auth/login', body: {'email': email, 'password': password}); token = data['accessToken']; }
  Future<List<dynamic>> tasks() async => await _call('GET', '/orders') as List<dynamic>;
  Future<void> deliver(String id, String otp) async => _call('POST', '/orders/$id/deliver', body: {'otp': otp});
  Future<dynamic> _call(String method, String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$apiUrl$path'), headers = {'Content-Type': 'application/json', if (token.isNotEmpty) 'Authorization': 'Bearer $token'};
    final response = await (method == 'GET' ? http.get(uri, headers: headers) : http.post(uri, headers: headers, body: jsonEncode(body)));
    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode >= 400) throw Exception(data['message']?.toString() ?? 'تعذر الاتصال بالخدمة');
    return data;
  }
}

void main() => runApp(const CourierApp());
class CourierApp extends StatelessWidget {
  const CourierApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(title: 'مندوب دار الصفاء', debugShowCheckedModeBanner: false, locale: const Locale('ar'), supportedLocales: const [Locale('ar')], localizationsDelegates: const [GlobalMaterialLocalizations.delegate, GlobalWidgetsLocalizations.delegate, GlobalCupertinoLocalizations.delegate], theme: ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff12372c))), home: const Directionality(textDirection: TextDirection.rtl, child: CourierLogin()));
}
class CourierLogin extends StatefulWidget { const CourierLogin({super.key}); @override State<CourierLogin> createState() => _CourierLoginState(); }
class _CourierLoginState extends State<CourierLogin> {
  final api = CourierApi(), email = TextEditingController(text: 'courier@daralsafa.local'), password = TextEditingController(text: 'DarAlsafa!2026'); bool busy = false; String error = '';
  Future<void> login() async { setState(() => busy = true); try { await api.login(email.text.trim(), password.text); if (!mounted) return; Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => TasksScreen(api: api))); } catch (e) { setState(() => error = e.toString()); } finally { if (mounted) setState(() => busy = false); } }
  @override Widget build(BuildContext context) => Scaffold(body: SafeArea(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [const SizedBox(height: 70), const Icon(Icons.delivery_dining, size: 72, color: Color(0xff12372c)), const SizedBox(height: 18), Text('مندوب دار الصفاء', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall), const SizedBox(height: 32), TextField(controller: email, decoration: const InputDecoration(labelText: 'البريد الإلكتروني', border: OutlineInputBorder())), const SizedBox(height: 14), TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'كلمة المرور', border: OutlineInputBorder())), const SizedBox(height: 20), if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)), FilledButton(onPressed: busy ? null : login, child: Text(busy ? 'جارٍ الدخول…' : 'عرض مهامي'))]))));
}
class TasksScreen extends StatefulWidget { final CourierApi api; const TasksScreen({super.key, required this.api}); @override State<TasksScreen> createState() => _TasksScreenState(); }
class _TasksScreenState extends State<TasksScreen> {
  List<dynamic> tasks = []; bool loading = true; String error = '';
  @override void initState() { super.initState(); load(); }
  Future<void> load() async { try { final rows = await widget.api.tasks(); if (!mounted) return; setState(() { tasks = rows; loading = false; error = ''; }); } catch (e) { if (mounted) setState(() { error = e.toString(); loading = false; }); } }
  Future<void> confirmDelivery(Map<String, dynamic> order) async {
    final controller = TextEditingController(); final otp = await showDialog<String>(context: context, builder: (_) => AlertDialog(title: const Text('إثبات التسليم'), content: TextField(controller: controller, keyboardType: TextInputType.number, maxLength: 4, textAlign: TextAlign.center, decoration: const InputDecoration(labelText: 'رمز العميل المكون من 4 أرقام')), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')), FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('تأكيد'))]));
    if (otp == null || otp.length != 4 || !mounted) return;
    try { await widget.api.deliver(order['id'], otp); if (!mounted) return; ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم توثيق التسليم بنجاح'))); await load(); } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()))); }
  }
  @override Widget build(BuildContext context) => Directionality(textDirection: TextDirection.rtl, child: Scaffold(appBar: AppBar(title: const Text('مهام التوصيل'), actions: [IconButton(onPressed: load, icon: const Icon(Icons.refresh))]), body: RefreshIndicator(onRefresh: load, child: loading ? const Center(child: CircularProgressIndicator()) : error.isNotEmpty ? Center(child: Text(error)) : ListView.builder(padding: const EdgeInsets.all(16), itemCount: tasks.length, itemBuilder: (context, index) {
    final order = tasks[index], status = order['status'] as String, active = !['DELIVERED', 'CANCELLED'].contains(status);
    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(order['orderNumber'], style: const TextStyle(fontWeight: FontWeight.bold)), Chip(label: Text(status))]), const SizedBox(height: 8), ListTile(contentPadding: EdgeInsets.zero, leading: const Icon(Icons.store), title: Text(order['branch']?['name'] ?? 'الفرع'), subtitle: Text(order['branch']?['address'] ?? '')), ListTile(contentPadding: EdgeInsets.zero, leading: const Icon(Icons.location_on), title: const Text('عنوان العميل'), subtitle: Text(order['address'] ?? '')), Text('الإجمالي: ${money(order['totalHalalas'])} · ${order['paymentMethod'] == 'CASH' ? 'تحصيل نقدي' : 'مدفوع'}'), if (active) SizedBox(width: double.infinity, child: FilledButton.icon(onPressed: status == 'OUT_FOR_DELIVERY' ? () => confirmDelivery(order) : null, icon: const Icon(Icons.check), label: Text(status == 'OUT_FOR_DELIVERY' ? 'إثبات التسليم برمز العميل' : 'بانتظار جاهزية الطلب')))])));
  }))));
}
