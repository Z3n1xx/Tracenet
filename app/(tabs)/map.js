import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Colors from '../../constants/colors';

// Cebu City center — MapLibre uses [longitude, latitude] order
const CEBU_CENTER = [123.8854, 10.3157];

// Free OpenStreetMap raster tiles — no API key, no billing, no signup.
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

export default function MapScreen() {
  const [filter, setFilter] = useState('all');
  const [selectedPin, setSelectedPin] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        const withCoords = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number');
        setReports(withCoords);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        if (error.code !== 'permission-denied') console.warn('Map listener error:', error);
      }
    );
    return unsubscribe;
  }, []);

  const pins = reports.filter((p) => {
    if (filter === 'all') return true;
    return p.type === filter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sightings Map</Text>
        <Text style={styles.headerSub}>Cebu City — Live Reports</Text>
      </View>

      <View style={styles.filterRow}>
        {['all', 'missing', 'sighting'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'missing' ? 'Missing' : 'Sightings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mapWrap}>
        <Map style={styles.map} mapStyle={OSM_STYLE} onPress={() => setSelectedPin(null)}>
          <Camera initialViewState={{ center: CEBU_CENTER, zoom: 12 }} />
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              lngLat={[pin.longitude, pin.latitude]}
              onPress={() => setSelectedPin(pin)}
            >
              <View
                style={[
                  styles.pin,
                  { backgroundColor: pin.type === 'missing' ? Colors.danger : Colors.warning },
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
              No {filter === 'all' ? '' : filter + ' '}reports with a location yet.{'\n'}
              Use "Use current location" when submitting a report.
            </Text>
          </View>
        )}

        {selectedPin && (
          <View style={styles.calloutCard}>
            <Text style={styles.calloutName}>{selectedPin.name}</Text>
            <Text style={styles.calloutLocation}>{selectedPin.location}</Text>
            <Text
              style={[
                styles.calloutType,
                { color: selectedPin.type === 'missing' ? Colors.danger : Colors.warning },
              ]}
            >
              {selectedPin.type === 'missing' ? 'MISSING' : 'SIGHTING'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
          <Text style={styles.legendText}>Missing</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Colors.warning }]} />
          <Text style={styles.legendText}>Sighting</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: Colors.primaryLight, marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, color: Colors.textGray, fontWeight: '600' },
  filterTextActive: { color: Colors.white },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  emptyText: { fontSize: 13, color: Colors.textGray, textAlign: 'center', lineHeight: 19 },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    elevation: 3,
  },
  pinText: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  calloutCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    elevation: 4,
  },
  calloutName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  calloutLocation: { fontSize: 12, color: Colors.textGray, marginTop: 2 },
  calloutType: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: Colors.textGray, fontWeight: '600' },
});
