import 'package:flutter/material.dart';
import '../../../../core/theme/nebula_colors.dart';

class AuditScreen extends StatelessWidget {
  const AuditScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Audit Logs')),
      backgroundColor: NebulaColors.background,
      body: const Center(child: Text('Audit Logs Module Coming Soon', style: TextStyle(color: Colors.white))),
    );
  }
}
