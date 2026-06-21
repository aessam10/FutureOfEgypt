import 'package:flutter/material.dart';

class ManagerHome extends StatelessWidget {
  const ManagerHome({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Manager Panel"),
      ),
      body: const Center(
        child: Text(
          "MANAGER DASHBOARD",
          style: TextStyle(fontSize: 22),
        ),
      ),
    );
  }
}