import 'package:flutter/material.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_models.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_service.dart';
import 'package:open_filex/open_filex.dart';

class UpdatePromptSheet extends StatefulWidget {
  final AppUpdateCheckResponse updateInfo;

  const UpdatePromptSheet({Key? key, required this.updateInfo}) : super(key: key);

  static void show(BuildContext context, AppUpdateCheckResponse updateInfo) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: true, // Non-blocking
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => UpdatePromptSheet(updateInfo: updateInfo),
    );
  }

  @override
  State<UpdatePromptSheet> createState() => _UpdatePromptSheetState();
}

class _UpdatePromptSheetState extends State<UpdatePromptSheet> {
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String? _downloadedApkPath;
  String? _errorMessage;

  Future<void> _onUpdateNow() async {
    final downloadUrl = widget.updateInfo.downloadUrl;
    final expectedSha256 = widget.updateInfo.apkSha256;

    if (downloadUrl == null || expectedSha256 == null) {
      setState(() {
        _errorMessage = 'Update details are incomplete. Cannot download.';
      });
      return;
    }

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _errorMessage = null;
    });

    final apkPath = await AppUpdateService.downloadApk(
      downloadUrl: downloadUrl,
      expectedSha256: expectedSha256,
      onProgress: (progress) {
        setState(() {
          _downloadProgress = progress;
        });
      },
    );

    setState(() {
      _isDownloading = false;
      if (apkPath != null) {
        _downloadedApkPath = apkPath;
        _installApk();
      } else {
        _errorMessage = 'Download or verification failed.';
      }
    });
  }

  void _installApk() async {
    if (_downloadedApkPath != null) {
      final result = await OpenFilex.open(_downloadedApkPath!);
      if (result.type != ResultType.done) {
        setState(() {
          _errorMessage = 'Failed to open installer: ${result.message}';
        });
      }
    }
  }

  void _onLater() {
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final bool isRequired = widget.updateInfo.updateLevel == AppUpdateLevel.required;
    
    final title = isRequired ? 'Update Recommended' : 'Update Available';
    final message = isRequired 
        ? 'A new version is required soon. Please update as soon as possible.'
        : 'A new version is available.';

    return Padding(
      padding: EdgeInsets.only(
        left: 24, 
        right: 24, 
        top: 24, 
        bottom: MediaQuery.of(context).padding.bottom + 24
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(
            isRequired ? Icons.warning_amber_rounded : Icons.info_outline,
            size: 64,
            color: isRequired ? Colors.orange : Colors.blue,
          ),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16),
          ),
          if (widget.updateInfo.releaseNotes != null && widget.updateInfo.releaseNotes!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                widget.updateInfo.releaseNotes!,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
          const SizedBox(height: 24),
          
          if (_errorMessage != null) ...[
            Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
          ],

          if (_isDownloading) ...[
            const Text('Downloading Update...', textAlign: TextAlign.center),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: _downloadProgress),
            const SizedBox(height: 8),
            Text('${(_downloadProgress * 100).toStringAsFixed(1)}%', textAlign: TextAlign.center),
          ] else if (_downloadedApkPath != null) ...[
            ElevatedButton(
              onPressed: _installApk,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
              ),
              child: const Text('Install Now', style: TextStyle(fontSize: 16)),
            ),
          ] else ...[
            ElevatedButton(
              onPressed: _onUpdateNow,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: isRequired ? Colors.orange : Colors.blue,
                foregroundColor: Colors.white,
              ),
              child: Text(_errorMessage != null ? 'Retry' : 'Update Now', style: const TextStyle(fontSize: 16)),
            ),
          ],
          
          const SizedBox(height: 8),
          if (!_isDownloading && _downloadedApkPath == null)
            TextButton(
              onPressed: _onLater,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Later', style: TextStyle(fontSize: 16, color: Colors.grey)),
            ),
        ],
      ),
    );
  }
}
