import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import Colors from '../../constants/colors';

export default function ReportScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Female');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access in settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
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

  async function handleNext() {
    if (!name || !location) {
      Alert.alert('Missing fields', 'Please provide the name and last known location.');
      return;
    }
    setLoading(true);
    try {
      // Photo is kept locally only for now — Firebase Storage requires the
      // Blaze billing plan, which hasn't been enabled on this project yet.
      const docRef = await addDoc(collection(db, 'reports'), {
        name,
        age: age ? Number(age) : null,
        sex,
        location,
        description,
        photoUrl: null,
        reportedByUid: auth.currentUser.uid,
        reportedByName: auth.currentUser.displayName || 'Unknown',
        status: 'submitted',
        flagged: false,
        createdAt: serverTimestamp(),
      });

      router.push(`/case-status?id=${docRef.id}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Missing Person</Text>
        <Text style={styles.stepLabel}>Step 1 of 3 — Person Details</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Photo Upload */}
        <TouchableOpacity
          style={styles.photoUpload}
          onPress={photo ? undefined : pickFromGallery}
          activeOpacity={photo ? 1 : 0.7}
        >
          {photo ? (
            <>
              <Image source={{ uri: photo }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(null)}>
                <Text style={styles.removePhotoText}>✕ Remove</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.uploadIcon}>
                <Text style={styles.uploadIconText}>📷</Text>
              </View>
              <Text style={styles.uploadTitle}>Upload Recent Photo</Text>
              <Text style={styles.uploadSub}>Used for AI facial matching</Text>
              <View style={styles.uploadBtns}>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickFromGallery}>
                  <Text style={styles.uploadBtnText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadBtn} onPress={takeFromCamera}>
                  <Text style={styles.uploadBtnText}>Camera</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Name */}
        <Text style={styles.label}>Full Name of Missing Person</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={Colors.textGray}
          value={name}
          onChangeText={setName}
        />

        {/* Age + Gender */}
        <View style={styles.rowFields}>
          <View style={styles.rowFieldHalf}>
            <Text style={styles.label}>Age</Text>
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
            <Text style={styles.label}>Gender</Text>
            <View style={styles.sexRow}>
              {['Male', 'Female'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sexBtn, sex === s && styles.sexBtnActive]}
                  onPress={() => setSex(s)}
                >
                  <Text style={[styles.sexBtnText, sex === s && styles.sexBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Location */}
        <Text style={styles.label}>Last Known Location</Text>
        <TextInput
          style={styles.input}
          placeholder="📍 Brgy., Street, Cebu City"
          placeholderTextColor={Colors.textGray}
          value={location}
          onChangeText={setLocation}
        />

        {/* Description */}
        <Text style={styles.label}>Clothing Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="White blouse, blue jeans, wearing eyeglasses..."
          placeholderTextColor={Colors.textGray}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextBtnText}>
            {loading ? 'Submitting...' : 'Next: Last Seen Details →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 4 },
  backText: { fontSize: 26, color: Colors.white, fontWeight: '400' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  stepLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4, marginBottom: 10 },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '33%',
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  photoUpload: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 160,
    justifyContent: 'center',
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadIconText: { fontSize: 24 },
  uploadTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  uploadSub: { fontSize: 12, color: Colors.textGray, textAlign: 'center', marginBottom: 14 },
  uploadBtns: { flexDirection: 'row', gap: 10 },
  uploadBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  uploadBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  photoPreview: { width: 160, height: 200, borderRadius: 10 },
  removePhoto: { marginTop: 10 },
  removePhotoText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 14,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 12 },
  rowFieldHalf: { flex: 1 },
  sexRow: { flexDirection: 'row', gap: 8 },
  sexBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  sexBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  sexBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textGray },
  sexBtnTextActive: { color: Colors.primary },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
