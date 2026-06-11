import 'package:flutter/material.dart';
import '../../../../core/theme/nebula_colors.dart';

class KpiScreen extends StatelessWidget {
  const KpiScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('KPI Dashboard')),
      backgroundColor: NebulaColors.background,
      body: const Center(child: Text('KPI Module Coming Soon', style: TextStyle(color: Colors.white))),
    );
  }
}
