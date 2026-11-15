import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Image, Alert, Modal, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { uploadPhoto } from '../../services/cloudinary';
import { triggerAutoMatchForReport } from '../../services/aiService';
import Colors from '../../constants/colors';
import {
  CEBU_CITY_BARANGAYS,
  CEBU_CITY_CENTER,
  getBarangayCoords,
  inferBarangay,
} from '../../constants/barangays';

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

function formatNowDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatNowTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

export default function ReportScreen() {
  const { type: typeParam, missingId: missingIdParam } = useLocalSearchParams();
  const [reportType, setReportType] = useState(
    typeParam === 'sighting' ? 'sighting' : 'missing'
  );
  const isSighting = reportType === 'sighting';

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Female');
  const [barangay, setBarangay] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);
  const [lastSeenDate, setLastSeenDate] = useState(formatNowDate());
  const [lastSeenTime, setLastSeenTime] = useState(formatNowTime());
  const [description, setDescription] = useState('');
  const [circumstances, setCircumstances] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [photo, setPhoto] = useState(null);

  const [barangayModalVisible, setBarangayModalVisible] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [tempCoords, setTempCoords] = useState({
    latitude: CEBU_CITY_CENTER.latitude,
    longitude: CEBU_CITY_CENTER.longitude,
  });

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setReportType(typeParam === 'sighting' ? 'sighting' : 'missing');
  }, [typeParam]);

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.contactNumber) setReporterContact(data.contactNumber);
          if (data.barangay && !barangay) {
            setBarangay(data.barangay);
          }
        }
      } catch {
        // non-blocking
      }
    })();
  }, []);

  const filteredBarangays = CEBU_CITY_BARANGAYS.filter((b) =>
    b.toLowerCase().includes(barangaySearch.trim().toLowerCase())
  );

  function handleSelectBarangay(selectedBrgy) {
    setBarangay(selectedBrgy);
    const brgyCenter = getBarangayCoords(selectedBrgy);
    if (!coords) {
      setCoords(brgyCenter);
      setTempCoords(brgyCenter);
    }
    if (!location.trim()) {
      setLocation(`Brgy. ${selectedBrgy}, Cebu City`);
    }
    setBarangayModalVisible(false);
  }

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow location access in settings.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const nextCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoords(nextCoords);
      setTempCoords(nextCoords);

      const inferred = inferBarangay({
        latitude: nextCoords.latitude,
        longitude: nextCoords.longitude,
      });
      if (inferred) setBarangay(inferred);

      const [place] = await Location.reverseGeocodeAsync(nextCoords);
      if (place) {
        const parts = [place.street, place.district || place.subregion || (inferred ? `Brgy. ${inferred}` : null), 'Cebu City'].filter(Boolean);
        setLocation(parts.join(', ') || `Brgy. ${inferred || 'Cebu City'}`);
      } else {
        setLocation(
          inferred
            ? `Brgy. ${inferred} (${nextCoords.latitude.toFixed(4)}, ${nextCoords.longitude.toFixed(4)})`
            : `${nextCoords.latitude.toFixed(5)}, ${nextCoords.longitude.toFixed(5)}`
        );
      }
    } catch {
      Alert.alert('Error', 'Could not get your current location. You can pick on the map instead.');
    } finally {
      setLocating(false);
    }
  }

  function handleOpenMapPicker() {
    const startCoords = coords || (barangay ? getBarangayCoords(barangay) : CEBU_CITY_CENTER);
    setTempCoords(startCoords);
    setMapModalVisible(true);
  }

  function handleMapPress(event) {
    // MapLibre onPress event may pass coordinates in geometry.coordinates or lngLat
    const rawCoords =
      event?.geometry?.coordinates ||
      event?.nativeEvent?.geometry?.coordinates ||
      event?.lngLat;
    if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
      const [lng, lat] = rawCoords;
      if (typeof lat === 'number' && typeof lng === 'number') {
        setTempCoords({ latitude: lat, longitude: lng });
      }
    }
  }

  function confirmMapPin() {
    setCoords(tempCoords);
    const inferred = inferBarangay({
      latitude: tempCoords.latitude,
      longitude: tempCoords.longitude,
    });
    if (inferred) {
      setBarangay(inferred);
      if (!location.trim() || location.startsWith('Brgy.')) {
        setLocation(`Brgy. ${inferred}, Cebu City`);
      }
    } else if (!location.trim()) {
      setLocation(`${tempCoords.latitude.toFixed(5)}, ${tempCoords.longitude.toFixed(5)}`);
    }
    setMapModalVisible(false);
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access in settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function takeFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function handleSubmit() {
    const finalLocation =
      location.trim() || (barangay ? `Brgy. ${barangay}, Cebu City` : '');
    if (!finalLocation || (!isSighting && !name.trim())) {
      Alert.alert(
        'Missing Required Fields',
        isSighting
          ? 'Please select the Barangay or location where the person was sighted.'
          : 'Please provide the missing person’s full name and last known location/barangay.'
      );
      return;
    }

    setLoading(true);
    try {
      let photoUrl = null;
      if (photo) {
        try {
          photoUrl = await uploadPhoto(photo);
        } catch {
          Alert.alert(
            'Photo Upload Notice',
            'Your report will be saved immediately while the photo upload retries.'
          );
        }
      }

      const resolvedBrgy =
        barangay ||
        inferBarangay({
          location: finalLocation,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        });
      const resolvedCoords = coords || getBarangayCoords(resolvedBrgy);

      const payload = {
        type: isSighting ? 'sighting' : 'missing',
        name: name.trim() || 'Unidentified Person',
        age: age ? Number(age) : null,
        sex,
        barangay: resolvedBrgy,
        location: finalLocation,
        latitude: resolvedCoords.latitude,
        longitude: resolvedCoords.longitude,
        lastSeenDate: lastSeenDate.trim(),
        lastSeenTime: lastSeenTime.trim(),
        description: description.trim(),
        circumstances: circumstances.trim(),
        reporterContact: reporterContact.trim(),
        linkedMissingReportId: missingIdParam || null,
        photoUrl,
        reportedByUid: auth.currentUser?.uid || null,
        reportedByName: auth.currentUser?.displayName || 'Citizen Reporter',
        status: 'submitted',
        flagged: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'reports'), payload);

      // Run 80/20 AI Matching against active opposite-type reports in the background
      const createdMatches = await triggerAutoMatchForReport({
        id: docRef.id,
        ...payload,
      });

      if (createdMatches.length > 0) {
        Alert.alert(
          '🤖 Potential 80/20 AI Match Detected!',
          `Your ${isSighting ? 'sighting' : 'missing person'} report matched an active Cebu City record (${createdMatches[0].overallConfidence.toFixed(1)}% confidence).`,
          [
            {
              text: 'View AI Match Alert',
              onPress: () => router.replace(`/match-alert?id=${createdMatches[0].id}`),
            },
            {
              text: 'View Case Status',
              onPress: () => router.replace(`/case-status?id=${docRef.id}`),
            },
          ]
        );
      } else {
        router.replace(`/case-status?id=${docRef.id}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSighting ? 'Report a Sighting / Found Person' : 'Report Missing Person'}
        </Text>
        <Text style={styles.stepLabel}>
          {isSighting
            ? 'Geo-tagged Sighting Submission (Manuscript Fig. 17)'
            : 'Official Cebu City Missing Person Intake (Manuscript Fig. 16)'}
        </Text>

        {/* Segmented Mode Switcher */}
        <View style={styles.modeSwitchRow}>
          <TouchableOpacity
            style={[styles.modeTab, !isSighting && styles.modeTabActive]}
            onPress={() => setReportType('missing')}
          >
            <Text style={[styles.modeTabText, !isSighting && styles.modeTabTextActive]}>
              📋 Missing Person
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, isSighting && styles.modeTabActive]}
            onPress={() => setReportType('sighting')}
          >
            <Text style={[styles.modeTabText, isSighting && styles.modeTabTextActive]}>
              🧍 Found / Sighting
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Photo Upload Card */}
        <TouchableOpacity
          style={styles.photoUpload}
          onPress={photo ? undefined : pickFromGallery}
          activeOpacity={photo ? 1 : 0.75}
        >
          {photo ? (
            <>
              <Image source={{ uri: photo }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(null)}>
                <Text style={styles.removePhotoText}>✕ Remove / Replace Photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.uploadIcon}>
                <Text style={styles.uploadIconText}>📷</Text>
              </View>
              <Text style={styles.uploadTitle}>
                {isSighting ? 'Upload Sighting Photo' : 'Upload Clear Front-Facing Photo'}
              </Text>
              <Text style={styles.uploadSub}>
                Used by TraceNet’s 80% Facial Recognition (FaceNet 512-d) + 20% NLP Matching Engine
              </Text>
              <View style={styles.uploadBtns}>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickFromGallery}>
                  <Text style={styles.uploadBtnText}>🖼️ Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadBtn} onPress={takeFromCamera}>
                  <Text style={styles.uploadBtnText}>📸 Camera</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Person Details Card */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>1. Subject Identification</Text>

          <Text style={styles.label}>
            {isSighting ? 'Name of Person Seen (if known)' : 'Full Name of Missing Person *'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isSighting ? 'Leave blank if unidentified' : 'e.g. Maria Santos'}
            placeholderTextColor={Colors.textGray}
            value={name}
            onChangeText={setName}
          />

          <View style={styles.rowFields}>
            <View style={styles.rowFieldHalf}>
              <Text style={styles.label}>{isSighting ? 'Estimated Age' : 'Age *'}</Text>
              <TextInput
                style={styles.input}
                placeholder="34"
                placeholderTextColor={Colors.textGray}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowFieldHalf}>
              <Text style={styles.label}>Gender *</Text>
              <View style={styles.sexRow}>
                {['Male', 'Female'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sexBtn, sex === s && styles.sexBtnActive]}
                    onPress={() => setSex(s)}
                  >
                    <Text style={[styles.sexBtnText, sex === s && styles.sexBtnTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.rowFields}>
            <View style={styles.rowFieldHalf}>
              <Text style={styles.label}>
                {isSighting ? 'Date Sighted' : 'Date Last Seen'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textGray}
                value={lastSeenDate}
                onChangeText={setLastSeenDate}
              />
            </View>
            <View style={styles.rowFieldHalf}>
              <Text style={styles.label}>
                {isSighting ? 'Time Sighted' : 'Time Last Seen'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={Colors.textGray}
                value={lastSeenTime}
                onChangeText={setLastSeenTime}
              />
            </View>
          </View>
        </View>

        {/* Geolocation & Pin-Drop Card (Manuscript Figures 16 & 17) */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>2. Cebu City Location & Pin-Drop</Text>

          <Text style={styles.label}>Barangay (80 Official Cebu City Barangays) *</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => {
              setBarangaySearch('');
              setBarangayModalVisible(true);
            }}
          >
            <Text style={[styles.selectorText, !barangay && { color: Colors.textGray }]}>
              {barangay ? `Brgy. ${barangay}, Cebu City` : 'Select Barangay...'}
            </Text>
            <Text style={styles.selectorChevron}>▾</Text>
          </TouchableOpacity>

          <Text style={styles.label}>
            {isSighting ? 'Specific Landmark / Street Seen *' : 'Last Known Street / Landmark *'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Near Gaisano Country Mall, Banilad, Cebu City"
            placeholderTextColor={Colors.textGray}
            value={location}
            onChangeText={setLocation}
          />

          <View style={styles.geoActionRow}>
            <TouchableOpacity
              style={styles.geoActionBtn}
              onPress={useCurrentLocation}
              disabled={locating}
            >
              <Text style={styles.geoActionText}>
                {locating ? 'Locating GPS...' : '📍 Use My GPS'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.geoActionBtn, styles.geoActionBtnPrimary]}
              onPress={handleOpenMapPicker}
            >
              <Text style={styles.geoActionTextPrimary}>🗺️ Drop Pin on Map</Text>
            </TouchableOpacity>
          </View>

          {coords ? (
            <View style={styles.coordChip}>
              <Text style={styles.coordChipText}>
                ✓ Geo-Tagged: {coords.latitude.toFixed(5)}° N, {coords.longitude.toFixed(5)}° E
                {barangay ? ` • Brgy. ${barangay}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Clothing & Distinguishing Marks Card (20% NLP Engine) */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>3. Clothing & Distinguishing Marks (20% AI Weight)</Text>

          <Text style={styles.label}>
            {isSighting
              ? 'Clothing & Physical Condition Observed *'
              : 'Clothing & Distinguishing Features (Scars, Eyeglasses, etc.) *'}
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="e.g. White blouse (puti nga sinina), blue maong jeans, wearing eyeglasses..."
            placeholderTextColor={Colors.textGray}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Additional Circumstances / Context (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder={
              isSighting
                ? 'e.g. Appeared disoriented near pharmacy, heading toward Mabolo church'
                : 'e.g. Left home at 8:00 AM heading to Carbon Market'
            }
            placeholderTextColor={Colors.textGray}
            value={circumstances}
            onChangeText={setCircumstances}
          />

          <Text style={styles.label}>Reporter Contact Number</Text>
          <TextInput
            style={styles.input}
            placeholder="09XX-XXX-XXXX"
            placeholderTextColor={Colors.textGray}
            value={reporterContact}
            onChangeText={setReporterContact}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.nextBtnText}>
            {loading
              ? 'Submitting & Running 80/20 AI Match...'
              : isSighting
              ? 'Submit Sighting & Run AI Match →'
              : 'Submit Missing Person Report →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Searchable 80-Barangay Modal */}
      <Modal
        visible={barangayModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBarangayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Cebu City Barangay</Text>
                <Text style={styles.modalSub}>Auto-sets map coordinates & barangay desk routing</Text>
              </View>
              <TouchableOpacity
                onPress={() => setBarangayModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search barangay (e.g. Labangon, Mabolo, Lahug)..."
                placeholderTextColor={Colors.textGray}
                value={barangaySearch}
                onChangeText={setBarangaySearch}
              />
            </View>

            <FlatList
              data={filteredBarangays}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item === barangay;
                return (
                  <TouchableOpacity
                    style={[styles.barangayItem, selected && styles.barangayItemActive]}
                    onPress={() => handleSelectBarangay(item)}
                  >
                    <Text
                      style={[
                        styles.barangayItemText,
                        selected && styles.barangayItemTextActive,
                      ]}
                    >
                      Brgy. {item}
                    </Text>
                    {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Interactive MapLibre Pin-Drop Modal (Manuscript Fig 16 & 17) */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <View>
              <Text style={styles.mapModalTitle}>Drop Pin on Location</Text>
              <Text style={styles.mapModalSub}>
                Tap anywhere on the Cebu City map or select a Barangay preset
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setMapModalVisible(false)}
              style={styles.mapCloseBtn}
            >
              <Text style={styles.mapCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapCanvasWrap}>
            <Map style={styles.mapCanvas} mapStyle={OSM_STYLE} onPress={handleMapPress}>
              <Camera
                initialViewState={{
                  center: [tempCoords.longitude, tempCoords.latitude],
                  zoom: 13.5,
                }}
              />
              <Marker lngLat={[tempCoords.longitude, tempCoords.latitude]}>
                <View style={styles.droppedPin}>
                  <Text style={styles.droppedPinText}>📍</Text>
                </View>
              </Marker>
            </Map>

            {/* Quick Nudge Controls & Coordinate Readout */}
            <View style={styles.mapCoordFloating}>
              <Text style={styles.mapCoordFloatingText}>
                📌 {tempCoords.latitude.toFixed(5)}° N, {tempCoords.longitude.toFixed(5)}° E • Brgy.{' '}
                {inferBarangay(tempCoords)}
              </Text>
            </View>
          </View>

          <View style={styles.mapModalFooter}>
            <TouchableOpacity style={styles.confirmPinBtn} onPress={confirmMapPin}>
              <Text style={styles.confirmPinBtnText}>
                ✓ Confirm Pin Location (Brgy. {inferBarangay(tempCoords)})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: Colors.primaryLight, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  stepLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 3, marginBottom: 12 },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeTabActive: { backgroundColor: Colors.white },
  modeTabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  modeTabTextActive: { color: Colors.primary, fontWeight: '800' },

  scroll: { padding: 16, paddingBottom: 44, gap: 14 },
  photoUpload: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 18,
    alignItems: 'center',
    minHeight: 155,
    justifyContent: 'center',
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadIconText: { fontSize: 24 },
  uploadTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark, marginBottom: 4 },
  uploadSub: {
    fontSize: 11,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
    lineHeight: 16,
  },
  uploadBtns: { flexDirection: 'row', gap: 10 },
  uploadBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: Colors.primaryLight,
  },
  uploadBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  photoPreview: { width: 150, height: 190, borderRadius: 12 },
  removePhoto: { marginTop: 10 },
  removePhotoText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },

  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textDark, marginBottom: 6 },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 12,
  },
  selectorButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectorText: { fontSize: 14, color: Colors.textDark, fontWeight: '600' },
  selectorChevron: { fontSize: 15, color: Colors.textGray },
  textarea: { height: 92, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 10 },
  rowFieldHalf: { flex: 1 },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  sexBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  sexBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textGray },
  sexBtnTextActive: { color: Colors.primary },

  geoActionRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  geoActionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  geoActionBtnPrimary: { backgroundColor: Colors.primary },
  geoActionText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  geoActionTextPrimary: { fontSize: 12, fontWeight: '800', color: Colors.white },
  coordChip: {
    marginTop: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  coordChipText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    elevation: 2,
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { color: Colors.white, fontSize: 15, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  modalSub: { fontSize: 11, color: Colors.textGray, marginTop: 2 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 15, color: Colors.textDark, fontWeight: '700' },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: Colors.textDark },
  barangayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderRadius: 8,
  },
  barangayItemActive: { backgroundColor: Colors.primaryLight },
  barangayItemText: { fontSize: 14, color: Colors.textDark, fontWeight: '500' },
  barangayItemTextActive: { color: Colors.primary, fontWeight: '700' },
  checkMark: { fontSize: 16, color: Colors.primary, fontWeight: '800' },

  mapModalContainer: { flex: 1, backgroundColor: Colors.white },
  mapModalHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapModalTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  mapModalSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  mapCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCloseText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  mapCanvasWrap: { flex: 1 },
  mapCanvas: { flex: 1 },
  droppedPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  droppedPinText: { fontSize: 20 },
  mapCoordFloating: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  mapCoordFloatingText: { color: Colors.white, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  mapModalFooter: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmPinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmPinBtnText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
});
