import 'dart:io';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/network/api_client.dart';
import '../tracking/background_service.dart';
import '../tracking/location_service.dart';
import '../tracking/tracking_config_service.dart';
import '../chat/chat_list_page.dart';

class EngineerHome extends StatefulWidget {
  final String engineerId;
  final String deviceId;
  final String token;

  const EngineerHome({
    super.key,
    required this.engineerId,
    required this.deviceId,
    required this.token,
  });

  @override
  State<EngineerHome> createState() => _EngineerHomeState();
}

class _EngineerHomeState extends State<EngineerHome> with WidgetsBindingObserver {
  String _appVersion = 'Loading...';
  bool _isLoading = true;

  // Status checks
  bool _hasInternet = false;
  bool _hasLocationPermission = false;
  bool _hasLocationService = false;
  bool _hasBackgroundPermission = false;
  bool _isAuthorized = true; // They passed the gate if they are here
  bool _isSendingLocation = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    LocationService.backendReasonNotifier.addListener(_onBackendReasonChanged);
    _loadDataAndCheckPermissions();
    _startBackgroundTasksIfReady();
  }

  @override
  void dispose() {
    LocationService.backendReasonNotifier.removeListener(_onBackendReasonChanged);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _onBackendReasonChanged() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkPermissions();
    }
  }

  Map<String, dynamic>? _profileData;

  Future<void> _fetchProfile() async {
    try {
      final url = ApiClient.baseUrl.replaceFirst('/api', '/api/Profile/me');
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer ${widget.token}',
        },
      );
      if (response.statusCode == 200) {
        setState(() {
          _profileData = jsonDecode(response.body);
        });
      }
    } catch (_) {
      // Ignore
    }
  }

  Future<void> _uploadPhoto() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
      maxWidth: 1024,
      maxHeight: 1024,
    );
    if (pickedFile == null) return;

    setState(() => _isLoading = true);
    try {
      final url = ApiClient.baseUrl.replaceFirst('/api', '/api/Profile/me/photo');
      final request = http.MultipartRequest('POST', Uri.parse(url));
      request.headers['Authorization'] = 'Bearer ${widget.token}';
      
      final fileBytes = await pickedFile.readAsBytes();
      final multipartFile = http.MultipartFile.fromBytes(
        'file',
        fileBytes,
        filename: pickedFile.name,
      );
      request.files.add(multipartFile);

      final response = await request.send();
      if (response.statusCode == 200) {
        await _fetchProfile();
      }
    } catch (_) {
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadDataAndCheckPermissions() async {
    setState(() => _isLoading = true);
    
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _appVersion = '${packageInfo.version}+${packageInfo.buildNumber}';
    } catch (_) {
      _appVersion = 'Unknown';
    }

    await _fetchProfile();
    await _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    // 1. Server Reachability Check
    bool serverReachable = false;
    try {
      final healthUrl = ApiClient.baseUrl.replaceFirst('/api', '/health');
      final response = await http.get(Uri.parse(healthUrl)).timeout(const Duration(seconds: 3));
      serverReachable = response.statusCode == 200;
    } catch (_) {
      serverReachable = false;
    }

    // 2. Location Permission Check
    final locStatus = await Permission.location.status;
    final hasLoc = locStatus.isGranted || locStatus.isLimited;

    // 3. Location Service Check (GPS)
    bool hasGps = false;
    try {
      hasGps = await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      hasGps = false;
    }

    // 4. Background Location Check (Required on Android 10+)
    bool hasBg = false;
    if (!kIsWeb && Platform.isAndroid) {
      final bgStatus = await Permission.locationAlways.status;
      hasBg = bgStatus.isGranted;
    } else {
      hasBg = true; // Assume true for iOS/Web for now
    }

    if (mounted) {
      setState(() {
        _hasInternet = serverReachable;
        _hasLocationPermission = hasLoc;
        _hasLocationService = hasGps;
        _hasBackgroundPermission = hasBg;
        _isLoading = false;
      });
    }
  }

  Future<void> _startBackgroundTasksIfReady() async {
    if (kIsWeb) {
      return;
    }

    if (widget.token.isEmpty || widget.deviceId.isEmpty) {
      return;
    }

    final installationId = await TrackingConfigService.getInstallationId();

    await LocationService.start(
      token: widget.token,
      devicePublicId: widget.deviceId,
      installationId: installationId,
    );

    await BackgroundTrackingService.startTracking(
      token: widget.token,
      devicePublicId: widget.deviceId,
      installationId: installationId,
    );
  }

  Future<void> _sendCurrentLocation() async {
    setState(() => _isSendingLocation = true);
    try {
      if (!_hasLocationPermission) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location permission required')),
        );
        return;
      }
      if (!_hasLocationService) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location service required (GPS is off)')),
        );
        return;
      }
      
      final installationId = await TrackingConfigService.getInstallationId();

      await LocationService.sendLocationOnce(
        token: widget.token,
        devicePublicId: widget.deviceId,
        installationId: installationId,
      );

      if (mounted) {
        if (LocationService.backendReasonNotifier.value != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed: ${LocationService.backendReasonNotifier.value}')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location sent successfully')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSendingLocation = false);
    }
  }

  List<String> _getMissingRequirements() {
    final missing = <String>[];
    if (!_hasInternet) missing.add('Server connection required');
    if (!_hasLocationPermission) missing.add('Location permission required');
    if (!_hasLocationService) missing.add('Location service required');
    if (!_hasBackgroundPermission && (!kIsWeb && Platform.isAndroid)) missing.add('Background permission required');
    if (!_isAuthorized) missing.add('Device approval required');
    
    final backendReason = LocationService.backendReasonNotifier.value;
    if (backendReason != null) {
      if (backendReason == 'OutsideWorkingHours') {
        missing.add('Outside working hours');
      } else {
        missing.add(backendReason);
      }
    }
    
    return missing;
  }

  @override
  Widget build(BuildContext context) {
    final missingReqs = _getMissingRequirements();
    final isOnline = missingReqs.isEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Engineer"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isLoading ? null : _checkPermissions,
          )
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_profileData != null) ...[
                      Card(
                        elevation: 2,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Row(
                            children: [
                              GestureDetector(
                                onTap: _uploadPhoto,
                                child: CircleAvatar(
                                  radius: 36,
                                  backgroundColor: Colors.blue.shade100,
                                  backgroundImage: _profileData!['profilePhotoUrl'] != null
                                      ? NetworkImage(
                                          _profileData!['profilePhotoUrl'],
                                          headers: {'Authorization': 'Bearer ${widget.token}'},
                                        )
                                      : null,
                                  child: _profileData!['profilePhotoUrl'] == null
                                      ? const Icon(Icons.camera_alt, color: Colors.blue, size: 30)
                                      : null,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _profileData!['fullName'] ?? 'Engineer',
                                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                                    ),
                                    if (_profileData!['phoneNumber'] != null)
                                      Text(
                                        _profileData!['phoneNumber'],
                                        style: const TextStyle(color: Colors.grey, fontSize: 14),
                                      ),
                                    if (_profileData!['email'] != null)
                                      Text(
                                        _profileData!['email'],
                                        style: const TextStyle(color: Colors.grey, fontSize: 14),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Current Status",
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Icon(
                                  isOnline ? Icons.check_circle : Icons.error,
                                  color: isOnline ? Colors.green : Colors.red,
                                  size: 28,
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  isOnline ? "Online" : "Offline",
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: isOnline ? Colors.green : Colors.red,
                                  ),
                                ),
                              ],
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16.0),
                              child: Divider(),
                            ),
                            const Text(
                              "Authorization",
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Icon(
                                  _isAuthorized ? Icons.verified_user : Icons.gpp_bad,
                                  color: _isAuthorized ? Colors.blue : Colors.red,
                                  size: 28,
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  _isAuthorized ? "Authorized" : "Not Authorized",
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: _isAuthorized ? Colors.blue : Colors.red,
                                  ),
                                ),
                              ],
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16.0),
                              child: Divider(),
                            ),
                            const Text(
                              "Communication",
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.chat),
                                label: const Text('Open Messages'),
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                                onPressed: _isAuthorized
                                    ? () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => ChatListPage(
                                              token: widget.token,
                                              engineerId: widget.engineerId,
                                            ),
                                          ),
                                        );
                                      }
                                    : null,
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16.0),
                              child: Divider(),
                            ),
                            const Text(
                              "Required permissions",
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
                            ),
                            const SizedBox(height: 8),
                            if (missingReqs.isEmpty)
                              const Row(
                                children: [
                                  Icon(Icons.check, color: Colors.green, size: 20),
                                  SizedBox(width: 8),
                                  Expanded(child: Text("All required permissions are enabled.")),
                                ],
                              )
                            else
                              ...missingReqs.map(
                                (req) => Padding(
                                  padding: const EdgeInsets.only(bottom: 6.0),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 20),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          "• $req",
                                          style: const TextStyle(color: Colors.black87, fontSize: 15),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: _isSendingLocation
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Icon(Icons.my_location),
                        label: Text(_isSendingLocation ? 'Sending...' : 'Send Current Location'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: Colors.blueAccent,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: _isSendingLocation ? null : _sendCurrentLocation,
                      ),
                    ),
                    const Spacer(),
                    Center(
                      child: Text(
                        "App version: $_appVersion",
                        style: const TextStyle(color: Colors.grey, fontSize: 14),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
      ),
    );
  }
}
