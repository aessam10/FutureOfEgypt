import 'package:flutter/material.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_service.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_models.dart';
import 'package:future_of_egypt_mobile/features/app_update/forced_update_page.dart';
import 'package:future_of_egypt_mobile/features/app_update/update_prompt_sheet.dart';
import 'package:shared_preferences/shared_preferences.dart';

class UpdateGate extends StatefulWidget {
  final Widget child;

  const UpdateGate({Key? key, required this.child}) : super(key: key);

  @override
  State<UpdateGate> createState() => _UpdateGateState();
}

class _UpdateGateState extends State<UpdateGate> {
  bool _isChecking = true;
  AppUpdateCheckResponse? _mandatoryUpdateResponse;

  @override
  void initState() {
    super.initState();
    print('[FOE_APP_UPDATE_DEBUG] UpdateGate mounted, state: checking');
    _performUpdateCheck();
  }

  Future<void> _performUpdateCheck() async {
    try {
      final updateInfo = await AppUpdateService.checkUpdate();
      
      // Fire and forget the report status, no need to await
      AppUpdateService.reportAppStatus();

      if (updateInfo != null) {
        final bool isMandatoryBlocked = updateInfo.isBlocking || updateInfo.updateLevel == AppUpdateLevel.mandatory;
        
        print('[FOE_APP_UPDATE_DEBUG] parsed updateLevel: ${updateInfo.updateLevel}');
        print('[FOE_APP_UPDATE_DEBUG] isBlocking: ${updateInfo.isBlocking}');
        print('[FOE_APP_UPDATE_DEBUG] selected UpdateGate state: ${isMandatoryBlocked ? 'mandatory' : 'allowed'}');

        setState(() {
          if (isMandatoryBlocked) {
            _mandatoryUpdateResponse = updateInfo;
          }
          _isChecking = false;
        });

        _cacheMandatoryStatus(isMandatoryBlocked);

        if (!isMandatoryBlocked && (updateInfo.updateLevel == AppUpdateLevel.optional || updateInfo.updateLevel == AppUpdateLevel.required)) {
          // Show prompt after rendering completes
          WidgetsBinding.instance.addPostFrameCallback((_) {
            UpdatePromptSheet.show(context, updateInfo);
          });
        }
      } else {
        // Fallback if check fails
        _handleCheckFailure();
      }
    } catch (e) {
      _handleCheckFailure();
    }
  }

  Future<void> _handleCheckFailure() async {
    final isCachedBlocked = await _getCachedMandatoryStatus();
    
    print('[FOE_APP_UPDATE_DEBUG] Check failed. Cached mandatory block: $isCachedBlocked');
    print('[FOE_APP_UPDATE_DEBUG] selected UpdateGate state: ${isCachedBlocked ? 'mandatory' : 'allowed'}');

    setState(() {
      if (isCachedBlocked) {
        // We set a fake response so it triggers the fallback forced update UI
        _mandatoryUpdateResponse = AppUpdateCheckResponse(
            isUpdateAvailable: true,
            updateLevel: AppUpdateLevel.mandatory,
            isBlocking: true,
            latestVersionCode: 0,
            fileSizeBytes: 0
        );
      }
      _isChecking = false;
    });

    if (!isCachedBlocked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to check for updates. Proceeding normally.')),
      );
    }
  }

  Future<void> _cacheMandatoryStatus(bool isBlocked) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('cached_mandatory_update_block', isBlocked);
  }

  Future<bool> _getCachedMandatoryStatus() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('cached_mandatory_update_block') ?? false;
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_mandatoryUpdateResponse != null) {
      // If latestVersionCode is 0, it's our fake offline cached response
      if (_mandatoryUpdateResponse!.latestVersionCode == 0) {
        return const Scaffold(
          body: Center(
            child: Padding(
              padding: EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.system_update, size: 80, color: Colors.red),
                  SizedBox(height: 24),
                  Text(
                    'A new version of FutureOfEgypt is required, but we could not connect to the server. Please check your internet connection.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 18),
                  ),
                ],
              ),
            ),
          ),
        );
      }
      return ForcedUpdatePage(updateInfo: _mandatoryUpdateResponse!);
    }

    return widget.child;
  }
}
