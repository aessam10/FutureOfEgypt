import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import 'package:flutter/foundation.dart';

class OfflineLocationPoint {
  final String localId;
  final String engineerPublicId;
  final String devicePublicId;
  final String dayKey;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? speed;
  final bool isMocked;
  final DateTime recordedAtUtc;
  final DateTime createdAtUtc;

  OfflineLocationPoint({
    required this.localId,
    required this.engineerPublicId,
    required this.devicePublicId,
    required this.dayKey,
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.speed,
    required this.isMocked,
    required this.recordedAtUtc,
    required this.createdAtUtc,
  });

  Map<String, dynamic> toMap() {
    return {
      'localId': localId,
      'engineerPublicId': engineerPublicId,
      'devicePublicId': devicePublicId,
      'dayKey': dayKey,
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'speed': speed,
      'isMocked': isMocked ? 1 : 0,
      'recordedAtUtc': recordedAtUtc.toIso8601String(),
      'createdAtUtc': createdAtUtc.toIso8601String(),
    };
  }

  factory OfflineLocationPoint.fromMap(Map<String, dynamic> map) {
    return OfflineLocationPoint(
      localId: map['localId'] as String,
      engineerPublicId: map['engineerPublicId'] as String,
      devicePublicId: map['devicePublicId'] as String,
      dayKey: map['dayKey'] as String,
      latitude: map['latitude'] as double,
      longitude: map['longitude'] as double,
      accuracy: map['accuracy'] as double?,
      speed: map['speed'] as double?,
      isMocked: (map['isMocked'] as int) == 1,
      recordedAtUtc: DateTime.parse(map['recordedAtUtc'] as String),
      createdAtUtc: DateTime.parse(map['createdAtUtc'] as String),
    );
  }
}

class OfflineQueueHelper {
  static final OfflineQueueHelper _instance = OfflineQueueHelper._internal();
  factory OfflineQueueHelper() => _instance;
  OfflineQueueHelper._internal();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final pathString = join(dbPath, 'foe_offline_queue.db');

    return await openDatabase(
      pathString,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE offline_locations (
            localId TEXT PRIMARY KEY,
            engineerPublicId TEXT NOT NULL,
            devicePublicId TEXT NOT NULL,
            dayKey TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            accuracy REAL,
            speed REAL,
            isMocked INTEGER NOT NULL,
            recordedAtUtc TEXT NOT NULL,
            createdAtUtc TEXT NOT NULL
          )
        ''');
        await db.execute('CREATE INDEX idx_offline_locations_dayKey ON offline_locations(dayKey)');
        await db.execute('CREATE INDEX idx_offline_locations_recordedAt ON offline_locations(recordedAtUtc)');
      },
    );
  }

  /// Inserts a point into the queue.
  /// Returns [true] if saved, or [false] if rejected due to the 3-day limit.
  Future<bool> insertPoint(OfflineLocationPoint point) async {
    try {
      final db = await database;

      // Check the 3-day limit
      final List<Map<String, dynamic>> distinctDays = await db.rawQuery(
        'SELECT DISTINCT dayKey FROM offline_locations'
      );

      final existingDays = distinctDays.map((m) => m['dayKey'] as String).toList();

      if (existingDays.length >= 3 && !existingDays.contains(point.dayKey)) {
        debugPrint('[FOE_QUEUE] Warning: 3 distinct days already cached. Dropping point for new day: ${point.dayKey}');
        return false;
      }

      await db.insert(
        'offline_locations',
        point.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      return true;
    } catch (e) {
      debugPrint('[FOE_QUEUE] Error inserting point: $e');
      return false;
    }
  }

  Future<List<String>> getDistinctDayKeys() async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> maps = await db.rawQuery(
        'SELECT DISTINCT dayKey FROM offline_locations ORDER BY dayKey ASC'
      );
      return maps.map((m) => m['dayKey'] as String).toList();
    } catch (e) {
      debugPrint('[FOE_QUEUE] Error getting distinct dayKeys: $e');
      return [];
    }
  }

  Future<List<OfflineLocationPoint>> getPointsForDayKey(String dayKey, int limit) async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> maps = await db.query(
        'offline_locations',
        where: 'dayKey = ?',
        whereArgs: [dayKey],
        orderBy: 'recordedAtUtc ASC',
        limit: limit,
      );
      return maps.map((m) => OfflineLocationPoint.fromMap(m)).toList();
    } catch (e) {
      debugPrint('[FOE_QUEUE] Error getting points: $e');
      return [];
    }
  }

  Future<void> deletePoints(List<String> localIds) async {
    if (localIds.isEmpty) return;
    try {
      final db = await database;
      final placeholders = List.filled(localIds.length, '?').join(', ');
      await db.delete(
        'offline_locations',
        where: 'localId IN ($placeholders)',
        whereArgs: localIds,
      );
    } catch (e) {
      debugPrint('[FOE_QUEUE] Error deleting points: $e');
    }
  }

  Future<int> getQueueCount() async {
    try {
      final db = await database;
      final count = Sqflite.firstIntValue(
        await db.rawQuery('SELECT COUNT(*) FROM offline_locations')
      );
      return count ?? 0;
    } catch (e) {
      debugPrint('[FOE_QUEUE] Error getting queue count: $e');
      return 0;
    }
  }
}
