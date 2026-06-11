import 'package:flutter/material.dart';
import '../../../../core/theme/nebula_colors.dart';

class StrategyScreen extends StatelessWidget {
  const StrategyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Strategy')),
      backgroundColor: NebulaColors.background,
      body: const Center(child: Text('Strategy Module Coming Soon', style: TextStyle(color: Colors.white))),
    );
  }
}
