import 'package:flutter/material.dart';
import '../../../../core/theme/nebula_colors.dart';

class TeamScreen extends StatelessWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Team Management')),
      backgroundColor: NebulaColors.background,
      body: const Center(child: Text('Team Management Module Coming Soon', style: TextStyle(color: Colors.white))),
    );
  }
}
