import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../providers/auth_state.dart';
import '../../../../core/theme/nebula_colors.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _emailController;
  late TextEditingController _passwordController;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(
      text: kDebugMode ? 'admin@internalx.com' : '',
    );
    _passwordController = TextEditingController(
      text: kDebugMode ? 'password123' : '',
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      ref.read(authProvider.notifier).login(
            _emailController.text.trim(),
            _passwordController.text,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isSmallScreen = MediaQuery.of(context).size.height < 700;

    // Listen for errors
    ref.listen<AuthState>(authProvider, (previous, next) {
      next.maybeWhen(
        error: (message) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor: NebulaColors.critical,
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
        orElse: () {},
      );
    });

    final isLoading = authState.maybeWhen(
      loading: () => true,
      orElse: () => false,
    );

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF080C14), // Dark navy
              Color(0xFF12103A), // Deep purple
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Top Logo Section
                    if (!isSmallScreen)
                      Column(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: NebulaColors.primary,
                              boxShadow: [
                                BoxShadow(
                                  color:
                                      NebulaColors.primary.withValues(alpha: 0.6),
                                  blurRadius: 15,
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.hexagon_outlined,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'InternalX',
                            style: GoogleFonts.inter(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: NebulaColors.textPrimary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    // Form Container with Glassmorphism
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.05),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.1),
                          width: 1,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Sign In',
                            style: GoogleFonts.inter(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: NebulaColors.textPrimary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          // Email Field
                          TextFormField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              labelText: 'Email Address',
                              labelStyle: GoogleFonts.inter(
                                color: NebulaColors.textSecondary,
                                fontSize: 14,
                              ),
                              filled: true,
                              fillColor: Colors.white.withValues(alpha: 0.05),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: Colors.white.withValues(alpha: 0.1),
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: Colors.white.withValues(alpha: 0.1),
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: NebulaColors.primary,
                                  width: 2,
                                ),
                              ),
                              prefixIcon: const Icon(
                                Icons.email_outlined,
                                color: NebulaColors.textSecondary,
                                size: 20,
                              ),
                              errorStyle: GoogleFonts.inter(
                                color: NebulaColors.critical,
                                fontSize: 12,
                              ),
                            ),
                            style: GoogleFonts.inter(
                              color: NebulaColors.textPrimary,
                              fontSize: 14,
                            ),
                            keyboardType: TextInputType.emailAddress,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Email is required';
                              }
                              if (!value.contains('@')) {
                                return 'Enter a valid email';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          // Password Field
                          TextFormField(
                            controller: _passwordController,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              labelStyle: GoogleFonts.inter(
                                color: NebulaColors.textSecondary,
                                fontSize: 14,
                              ),
                              filled: true,
                              fillColor: Colors.white.withValues(alpha: 0.05),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: Colors.white.withValues(alpha: 0.1),
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: Colors.white.withValues(alpha: 0.1),
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: NebulaColors.primary,
                                  width: 2,
                                ),
                              ),
                              prefixIcon: const Icon(
                                Icons.lock_outlined,
                                color: NebulaColors.textSecondary,
                                size: 20,
                              ),
                              errorStyle: GoogleFonts.inter(
                                color: NebulaColors.critical,
                                fontSize: 12,
                              ),
                            ),
                            style: GoogleFonts.inter(
                              color: NebulaColors.textPrimary,
                              fontSize: 14,
                            ),
                            obscureText: true,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Password is required';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          // Forgot Password Link
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () => context.push('/forgot-password'),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                              ),
                              child: Text(
                                'Forgot Password?',
                                style: GoogleFonts.inter(
                                  color: NebulaColors.primary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          // Sign In Button
                          ElevatedButton(
                            onPressed: isLoading ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: NebulaColors.primary,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor:
                                  NebulaColors.primary.withValues(alpha: 0.5),
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              elevation: 0,
                            ),
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      valueColor:
                                          AlwaysStoppedAnimation<Color>(
                                              Colors.white),
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text(
                                    'Sign In',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                          ),
                          const SizedBox(height: 16),
                          // Sign Up Link
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Don't have an account? ",
                                style: GoogleFonts.inter(
                                  color: NebulaColors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.push('/signup'),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                ),
                                child: Text(
                                  'Sign Up',
                                  style: GoogleFonts.inter(
                                    color: NebulaColors.primary,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    // Powered by text
                    Text(
                      'Powered by Dropwing Groups',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: NebulaColors.textSecondary.withValues(alpha: 0.7),
                        fontWeight: FontWeight.w400,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    // Quick Access (Debug Mode Only)
                    if (kDebugMode) ...[
                      const SizedBox(height: 24),
                      Text(
                        'QUICK ACCESS LOGINS',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: NebulaColors.textSecondary,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 40,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            _buildTestChip('Super Admin',
                                'sa@dropwinggroups.com', Icons.shield),
                            const SizedBox(width: 8),
                            _buildTestChip('MD', 'md@dropwinggroups.com',
                                Icons.account_balance),
                            const SizedBox(width: 8),
                            _buildTestChip(
                                'Dropwing Admin', 'ad@dropwing.in', Icons.settings),
                            const SizedBox(width: 8),
                            _buildTestChip('Fenixa Admin', 'ad@fenixa.com',
                                Icons.settings),
                            const SizedBox(width: 8),
                            _buildTestChip('PerSyniX Admin',
                                'ad@persynix.com', Icons.settings),
                            const SizedBox(width: 8),
                            _buildTestChip(
                                'Grovia Admin', 'ad@grovia.in', Icons.settings),
                            const SizedBox(width: 8),
                            _buildTestChip('Dropwing Staff', 'st@dropwing.in',
                                Icons.person),
                            const SizedBox(width: 8),
                            _buildTestChip('Fenixa Staff', 'st@fenixa.com',
                                Icons.person),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTestChip(String label, String email, IconData icon) {
    return ActionChip(
      label: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 12,
          color: NebulaColors.textPrimary,
        ),
      ),
      avatar: Icon(
        icon,
        size: 16,
        color: NebulaColors.primary,
      ),
      backgroundColor: Colors.white.withValues(alpha: 0.05),
      side: BorderSide(
        color: Colors.white.withValues(alpha: 0.1),
      ),
      onPressed: () {
        _emailController.text = email;
        _passwordController.text = 'Test@1234';
        _submit();
      },
    );
  }
}
