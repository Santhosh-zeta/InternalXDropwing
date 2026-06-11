import 'package:flutter/material.dart';

class NebulaAnimations {
  // Durations
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
  static const Duration verySlow = Duration(milliseconds: 1500);
  static const Duration ambient = Duration(seconds: 10);
  
  // Curves
  static const Curve smooth = Curves.easeInOutQuart;
  static const Curve bouncy = Curves.elasticOut;
  static const Curve entrance = Curves.easeOutCubic;
}
