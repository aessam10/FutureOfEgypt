import 'package:flutter/material.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_models.dart';
import 'package:future_of_egypt_mobile/features/app_update/app_update_service.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:open_filex/open_filex.dart';

class ForcedUpdatePage extends StatefulWidget {
  final AppUpdateCheckResponse updateInfo;

  const ForcedUpdatePage({Key? key, required this.updateInfo}) : super(key: key);

  @override
  State<ForcedUpdatePage> createState() => _ForcedUpdatePageState();
}

class _ForcedUpdatePageState extends State<ForcedUpdatePage> {
  String _currentVersion = '';
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String? _downloadedApkPath;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadCurrentVersion();
  }

  Future<void> _loadCurrentVersion() async {
    final info = await PackageInfo.fromPlatform();
    setState(() {
      _currentVersion = '${info.version} (${info.buildNumber})';
    });
  }

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
        _errorMessage = 'Download or verification failed. Please try again.';
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

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Update Required'),
          automaticallyImplyLeading: false, // No back button
          centerTitle: true,
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 40),
                const Icon(Icons.system_update, size: 80, color: Colors.red),
                const SizedBox(height: 24),
                const Text(
                  'A new version of FutureOfEgypt is required to continue. Please update the app first.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 18),
                ),
                const SizedBox(height: 32),
                if (_currentVersion.isNotEmpty)
                  Text('Current Version: $_currentVersion', textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text('Latest Version: ${widget.updateInfo.latestVersionName ?? 'Unknown'} (${widget.updateInfo.latestVersionCode})', textAlign: TextAlign.center),
                if (widget.updateInfo.fileSizeBytes > 0) ...[
                  const SizedBox(height: 8),
                  Text('Download Size: ${(widget.updateInfo.fileSizeBytes / 1024 / 1024).toStringAsFixed(2)} MB', textAlign: TextAlign.center),
                ],
                if (widget.updateInfo.releaseNotes != null && widget.updateInfo.releaseNotes!.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const Text('Release Notes:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(widget.updateInfo.releaseNotes!),
                  ),
                ],
                const SizedBox(height: 32),
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
                    child: const Text('Install Now', style: TextStyle(fontSize: 18)),
                  ),
                ] else ...[
                  ElevatedButton(
                    onPressed: _onUpdateNow,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                    ),
                    child: Text(_errorMessage != null ? 'Retry Update' : 'Update Now', style: const TextStyle(fontSize: 18)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
