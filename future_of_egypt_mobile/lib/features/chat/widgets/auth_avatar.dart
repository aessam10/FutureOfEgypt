import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';

class AuthAvatar extends StatefulWidget {
  final String? url;
  final String name;
  final double radius;
  final String token;
  final String? role;

  const AuthAvatar({
    super.key,
    this.url,
    required this.name,
    required this.token,
    this.radius = 20,
    this.role,
  });

  @override
  State<AuthAvatar> createState() => _AuthAvatarState();
}

class _AuthAvatarState extends State<AuthAvatar> {
  bool _imageFailed = false;

  bool get _hasImage =>
      widget.url != null && widget.url!.trim().isNotEmpty && !_imageFailed;

  String get _fullUrl {
    final raw = widget.url?.trim() ?? '';
    return ApiClient.resolveApiFileUrl(raw);
  }

  Map<String, String> get _headers {
    return ApiClient.getAuthenticatedImageHeaders(widget.token);
  }

  @override
  Widget build(BuildContext context) {
    if (!_hasImage) {
      return _buildInitialsAvatar();
    }

    return GestureDetector(
      onTap: () => _showImagePreview(context),
      child: CircleAvatar(
        radius: widget.radius,
        backgroundColor: Colors.blue.shade100,
        backgroundImage: NetworkImage(
          _fullUrl,
          headers: _headers,
        ),
        onBackgroundImageError: (exception, stackTrace) {
          if (!mounted) return;
          setState(() {
            _imageFailed = true;
          });
        },
        child: null,
      ),
    );
  }

  Widget _buildInitialsAvatar() {
    return GestureDetector(
      onTap: () => _showImagePreview(context),
      child: CircleAvatar(
        radius: widget.radius,
        backgroundColor: Colors.blue.shade100,
        child: Text(
          _getInitials(widget.name),
          style: TextStyle(
            color: Colors.blue.shade900,
            fontWeight: FontWeight.bold,
            fontSize: widget.radius * 0.8,
          ),
        ),
      ),
    );
  }

  void _showImagePreview(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(24),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
            ),
            padding: const EdgeInsets.all(18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_hasImage)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(120),
                    child: Image.network(
                      _fullUrl,
                      headers: _headers,
                      width: 170,
                      height: 170,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _largeInitialsFallback();
                      },
                    ),
                  )
                else
                  _largeInitialsFallback(),
                const SizedBox(height: 16),
                Text(
                  widget.name,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (widget.role != null && widget.role!.trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    widget.role!,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Close'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _largeInitialsFallback() {
    return CircleAvatar(
      radius: 85,
      backgroundColor: Colors.blue.shade100,
      child: Text(
        _getInitials(widget.name),
        style: TextStyle(
          color: Colors.blue.shade900,
          fontWeight: FontWeight.bold,
          fontSize: 42,
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '?';

    final parts = trimmed.split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';

    if (parts.length == 1) {
      final first = parts.first;
      return first.substring(0, first.length >= 2 ? 2 : 1).toUpperCase();
    }

    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}