import 'package:flutter/material.dart';
import '../features/admin/admin_home.dart';
import '../features/manager/manager_home.dart';
import '../features/engineer/engineer_home.dart';

class AppRouter {
  static Widget routeByRole(List<String> roles) {
    if (roles.contains("Admin")) {
      return const AdminHome();
    }

    if (roles.contains("Manager")) {
      return const ManagerHome();
    }

    return const EngineerHome();
  }
}