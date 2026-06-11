import 'package:flutter/material.dart';
import '../../../../core/theme/nebula_colors.dart';

class TimesheetScreen extends StatelessWidget {
  const TimesheetScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Timesheets')),
      backgroundColor: NebulaColors.background,
      body: const Center(child: Text('Timesheets Module Coming Soon', style: TextStyle(color: Colors.white))),
    );
  }
}
