import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout, UrlTile } from 'react-native-maps';
import Colors from '../../constants/colors';

// Flip to true once a billed Google Maps API key is added in app.json
// (android.config.googleMaps.apiKey) — then the OSM tile overlay below
// is simply skipped and Google's own basemap renders instead.
const USE_GOOGLE_MAPS = false;

// Cebu City center coordinates
const CEBU_REGION = {
  latitude: 10.3157,
  longitude: 123.8854,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const SAMPLE_PINS = [
  {
    id: '1',
    type: 'missing',
    name: 'Juan Dela Cruz',
    location: 'Colon Street',
    latitude: 10.2944,
    longitude: 123.9029,
  },
  {
    id: '2',
    type: 'missing',
    name: 'Maria Santos',
    location: 'SM City Cebu',
    latitude: 10.3186,
    longitude: 123.9054,
  },
  {
    id: '3',
    type: 'sighting',
    name: 'Sighting: Juan Dela Cruz',
    location: 'Carbon Market',
    latitude: 10.2968,
    longitude: 123.8989,
  },
];

export default function MapScreen() {
  const [filter, setFilter] = useState('all');

  const pins = SAMPLE_PINS.filter((p) => {
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
        <MapView
          style={styles.map}
          initialRegion={CEBU_REGION}
          showsUserLocation
          showsMyLocationButton
        >
          {!USE_GOOGLE_MAPS && (
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
          )}
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              pinColor={pin.type === 'missing' ? Colors.danger : Colors.warning}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{pin.name}</Text>
                  <Text style={styles.calloutLocation}>{pin.location}</Text>
                  <Text style={[styles.calloutType, { color: pin.type === 'missing' ? Colors.danger : Colors.warning }]}>
                    {pin.type === 'missing' ? 'MISSING' : 'SIGHTING'}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {!USE_GOOGLE_MAPS && (
          <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
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
  attribution: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    fontSize: 9,
    color: Colors.textGray,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
  },
  callout: { padding: 8, minWidth: 140 },
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
