import 'package:flutter/material.dart';

class AdminHome extends StatelessWidget {
  const AdminHome({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Admin Panel"),
      ),
      body: const Center(
        child: Text(
          "ADMIN DASHBOARD",
          style: TextStyle(fontSize: 22),
        ),
      ),
    );
  }
}