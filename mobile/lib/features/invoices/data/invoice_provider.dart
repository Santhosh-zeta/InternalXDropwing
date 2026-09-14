import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'invoice_data_source.dart';
import 'invoice_model.dart';

final invoicesProvider =
    FutureProvider.autoDispose<List<InvoiceSummary>>((ref) async {
  final dataSource = ref.watch(invoiceDataSourceProvider);
  return dataSource.getInvoices();
});

final invoiceDetailProvider =
    FutureProvider.autoDispose.family<InvoiceDetail, String>((ref, id) async {
  final dataSource = ref.watch(invoiceDataSourceProvider);
  return dataSource.getInvoice(id);
});
