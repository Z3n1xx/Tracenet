import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Colors from '../../constants/colors';
import {
  CEBU_CITY_CENTER,
  resolveReportCoords,
  inferBarangay,
  haversineKm,
  computeHotspots,
} from '../../constants/barangays';

// Cebu City center — MapLibre uses [longitude, latitude] order
const CEBU_CENTER = [CEBU_CITY_CENTER.longitude, CEBU_CITY_CENTER.latitude];

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm',
    },
  ],
};

const RADIUS_OPTIONS = [
  { label: 'All Cebu', km: null },
  { label: '1 km', km: 1 },
  { label: '3 km', km: 3 },
  { label: '5 km', km: 5 },
  { label: '10 km', km: 10 },
];

export default function MapScreen() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [radiusKm, setRadiusKm] = useState(null);
  const [userCoords, setUserCoords] = useState(CEBU_CITY_CENTER);
  const [hasGpsFix, setHasGpsFix] = useState(false);

  const [selectedPin, setSelectedPin] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setHasGpsFix(true);
        }
      } catch {
        // Default to Cebu City Center
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r.status !== 'cancelled');
        setReports(rows);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        if (error.code !== 'permission-denied') console.warn('Map listener error:', error);
      }
    );
    return unsubscribe;
  }, []);

  const enrichedReports = useMemo(() => {
    return reports.map((r) => {
      const resolved = resolveReportCoords(r);
      const distanceKm =
        Math.round(
          haversineKm(
            userCoords.latitude,
            userCoords.longitude,
            resolved.latitude,
            resolved.longitude
          ) * 10
        ) / 10;
      return {
        ...r,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        barangay: r.barangay || inferBarangay(r),
        distanceKm,
      };
    });
  }, [reports, userCoords]);

  const pins = useMemo(() => {
    return enrichedReports.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (radiusKm !== null && p.distanceKm > radiusKm) return false;
      return true;
    });
  }, [enrichedReports, typeFilter, radiusKm]);

  const hotspots = useMemo(() => computeHotspots(enrichedReports).slice(0, 4), [enrichedReports]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Cebu City Sightings Map</Text>
            <Text style={styles.headerSub}>
              {pins.length} active pin{pins.length === 1 ? '' : 's'} •{' '}
              {hasGpsFix ? 'GPS Distance Active' : 'Centered on Cebu City'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.reportSightingBtn}
            onPress={() => router.push('/(tabs)/report?type=sighting')}
          >
            <Text style={styles.reportSightingBtnText}>+ Sighting</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Type + Geolocation Radius Filter Bar (Manuscript Fig 20 & IT-C5) */}
      <View style={styles.controlsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            { key: 'all', label: 'All Pins' },
            { key: 'missing', label: '🔴 Missing' },
            { key: 'sighting', label: '🟡 Sightings' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, typeFilter === f.key && styles.filterBtnActive]}
              onPress={() => setTypeFilter(f.key)}
            >
              <Text style={[styles.filterText, typeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.filterDivider} />

          {RADIUS_OPTIONS.map((opt) => {
            const active = radiusKm === opt.km;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.radiusPill, active && styles.radiusPillActive]}
                onPress={() => setRadiusKm(opt.km)}
              >
                <Text style={[styles.radiusPillText, active && styles.radiusPillTextActive]}>
                  📍 {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.mapWrap}>
        <Map style={styles.map} mapStyle={OSM_STYLE} onPress={() => setSelectedPin(null)}>
          <Camera initialViewState={{ center: CEBU_CENTER, zoom: 12.2 }} />
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              lngLat={[pin.longitude, pin.latitude]}
              onPress={() => setSelectedPin(pin)}
            >
              <View
                style={[
                  styles.pin,
                  {
                    backgroundColor:
                      pin.status === 'resolved'
                        ? Colors.success
                        : pin.type === 'missing'
                        ? Colors.danger
                        : Colors.warning,
                  },
                ]}
              >
                <Text style={styles.pinText}>{pin.type === 'missing' ? '!' : '?'}</Text>
              </View>
            </Marker>
          ))}
        </Map>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        )}

        {!loading && pins.length === 0 && (
          <View style={styles.emptyOverlay}>
            <Text style={styles.emptyText}>
              No {typeFilter === 'all' ? '' : typeFilter + ' '}reports within{' '}
              {radiusKm ? `${radiusKm} km` : 'Cebu City'}.{'\n'}
              Try expanding the distance radius filter above.
            </Text>
          </View>
        )}

        {/* Selected Pin Callout Card with Distance & Action Links */}
        {selectedPin && (
          <View style={styles.calloutCard}>
            <View style={styles.calloutHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.calloutBadgeRow}>
                  <View
                    style={[
                      styles.calloutTypeBadge,
                      {
                        backgroundColor:
                          selectedPin.type === 'missing' ? '#FEE2E2' : '#FEF3C7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calloutTypeText,
                        {
                          color:
                            selectedPin.type === 'missing' ? Colors.danger : '#B45309',
                        },
                      ]}
                    >
                      {selectedPin.type === 'missing' ? 'MISSING PERSON' : 'SIGHTING / FOUND'}
                    </Text>
                  </View>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceBadgeText}>
                      📍 {selectedPin.distanceKm} km away
                    </Text>
                  </View>
                </View>

                <Text style={styles.calloutName}>
                  {selectedPin.name}
                  {selectedPin.age ? `, ${selectedPin.age}` : ''}
                </Text>
                <Text style={styles.calloutLocation}>
                  {selectedPin.location || `Brgy. ${selectedPin.barangay}, Cebu City`}
                </Text>
                {selectedPin.description ? (
                  <Text style={styles.calloutDesc} numberOfLines={2}>
                    {selectedPin.description}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => setSelectedPin(null)}
                style={styles.calloutCloseBtn}
              >
                <Text style={styles.calloutCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calloutActions}>
              <TouchableOpacity
                style={styles.calloutPrimaryBtn}
                onPress={() => router.push(`/case-status?id=${selectedPin.id}`)}
              >
                <Text style={styles.calloutPrimaryBtnText}>View Case Timeline →</Text>
              </TouchableOpacity>

              {selectedPin.type === 'missing' && (
                <TouchableOpacity
                  style={styles.calloutSecondaryBtn}
                  onPress={() =>
                    router.push(`/(tabs)/report?type=sighting&missingId=${selectedPin.id}`)
                  }
                >
                  <Text style={styles.calloutSecondaryBtnText}>🧍 Report Sighting</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Bottom Legend + Top Barangay Hotspots Strip */}
      <View style={styles.bottomBar}>
        {hotspots.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hotspotStrip}
          >
            <Text style={styles.hotspotLabel}>🔥 Barangay Density:</Text>
            {hotspots.map((h) => (
              <View key={h.name} style={styles.hotspotChip}>
                <Text style={styles.hotspotChipText}>
                  Brgy. {h.name} ({h.cases})
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.legendText}>Missing</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.legendText}>Sighting</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>Resolved</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: Colors.primaryLight, marginTop: 3 },
  reportSightingBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  reportSightingBtnText: { fontSize: 12, fontWeight: '800', color: Colors.primary },

  controlsWrap: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textGray, fontWeight: '700' },
  filterTextActive: { color: Colors.white },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  radiusPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  radiusPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  radiusPillText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  radiusPillTextActive: { color: Colors.white },

  mapWrap: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  emptyText: { fontSize: 13, color: Colors.textGray, textAlign: 'center', lineHeight: 19 },
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
    elevation: 4,
  },
  pinText: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  calloutCard: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 15,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  calloutBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  calloutTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  calloutTypeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  distanceBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  calloutName: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  calloutLocation: { fontSize: 12, color: Colors.textGray, marginTop: 2 },
  calloutDesc: { fontSize: 12, color: Colors.textDark, marginTop: 4, lineHeight: 17 },
  calloutCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutCloseText: { fontSize: 13, color: Colors.textGray, fontWeight: '800' },
  calloutActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  calloutPrimaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  calloutPrimaryBtnText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  calloutSecondaryBtn: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  calloutSecondaryBtnText: { color: '#92400E', fontSize: 12, fontWeight: '800' },

  bottomBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  hotspotStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  hotspotLabel: { fontSize: 11, fontWeight: '800', color: Colors.textDark },
  hotspotChip: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  hotspotChipText: { fontSize: 10, fontWeight: '700', color: Colors.textGray },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 9,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: Colors.textGray, fontWeight: '700' },
});
