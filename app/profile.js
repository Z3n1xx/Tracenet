import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Switch, Linking, Modal, FlatList, Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import {
  signOut, updateProfile, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { uploadPhoto } from '../services/cloudinary';
import Colors from '../constants/colors';
import { CEBU_CITY_BARANGAYS } from '../constants/barangays';
import PasswordInput from '../components/PasswordInput';
import AvatarPicker from '../components/AvatarPicker';
import DateField from '../components/DateField';
import { sanitizeName, sanitizeAge } from '../utils/sanitize';
import { isAgeConsistentWithBirthday } from '../utils/age';

const PASSWORD_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Current password is incorrect.',
  'auth/wrong-password': 'Current password is incorrect.',
  'auth/weak-password': 'New password must be at least 8 characters and include a letter and a number.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
};

const EMERGENCY_HOTLINES = [
  {
    id: 'ccpo',
    name: 'CCPO Command Center',
    subtitle: 'Cebu City Police Office — Missing Persons Desk',
    number: '(032) 233-6793',
    tel: '0322336793',
    badge: 'POLICE',
    color: '#1E40AF',
    bg: '#EFF6FF',
  },
  {
    id: '911',
    name: 'Cebu City Emergency 911 / 166',
    subtitle: '24/7 Immediate Dispatch & Patrol',
    number: '911',
    tel: '911',
    badge: '24/7',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    id: 'barangay',
    name: 'Cebu City Barangay Peace & Order Desk',
    subtitle: 'Association of Barangay Councils (ABC) Cebu',
    number: '(032) 261-4021',
    tel: '0322614021',
    badge: 'BARANGAY',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'dswd',
    name: 'DSWD Region VII Crisis Intervention',
    subtitle: 'Child & Vulnerable Person Protection Desk',
    number: '(032) 232-9505',
    tel: '0322329505',
    badge: 'WELFARE',
    color: '#059669',
    bg: '#ECFDF5',
  },
];

const SAFETY_TIPS = [
  {
    title: 'No 24-Hour Waiting Period Required',
    body: 'Under Philippine PNP guidelines, you can report a missing family member immediately—especially children, seniors, or vulnerable individuals.',
  },
  {
    title: 'Upload a Clear Front-Facing Photo',
    body: 'TraceNet’s 80/20 AI Matching Engine relies 80% on facial embeddings and 20% on clothing & distinguishing descriptors for accurate candidate ranking.',
  },
  {
    title: 'Never Confront Suspicious Situations Alone',
    body: 'If you spot a missing person in a high-risk area, submit a geo-tagged sighting in TraceNet and coordinate directly with Barangay Tanods or CCPO.',
  },
];

export default function ProfileScreen() {
  const [photo, setPhoto] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('Female');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [barangay, setBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('Citizen / Family Member');
  const [original, setOriginal] = useState({});

  const [pushEnabled, setPushEnabled] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [nearbySightings, setNearbySightings] = useState(true);

  const [barangayModalVisible, setBarangayModalVisible] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  const filteredBarangays = CEBU_CITY_BARANGAYS.filter((b) =>
    b.toLowerCase().includes(barangaySearch.trim().toLowerCase())
  );

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const data = snap.data();
          setPhoto(data.photoUrl || null);
          setName(data.name || auth.currentUser.displayName || '');
          setAge(data.age ? String(data.age) : '');
          setBirthday(data.birthday || '');
          setGender(data.gender || 'Female');
          setAddress(data.address || '');
          setContactNumber(data.contactNumber || '');
          setBarangay(data.barangay || '');
          setEmail(data.email || auth.currentUser.email || '');
          setRoleLabel(data.roleLabel || 'Citizen / Family Member');
          if (data.notificationPrefs) {
            setPushEnabled(data.notificationPrefs.pushEnabled ?? true);
            setMatchAlerts(data.notificationPrefs.matchAlerts ?? true);
            setNearbySightings(data.notificationPrefs.nearbySightings ?? true);
          }
          setOriginal({
            photoUrl: data.photoUrl || null,
            name: data.name || '',
            age: data.age ? String(data.age) : '',
            birthday: data.birthday || '',
            gender: data.gender || 'Female',
            address: data.address || '',
            contactNumber: data.contactNumber || '',
            barangay: data.barangay || '',
          });
        } else {
          setName(auth.currentUser.displayName || '');
          setEmail(auth.currentUser.email || '');
        }
      } catch {
        setEmail(auth.currentUser?.email || '');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    if (!name.trim()) {
      setError('Full name cannot be empty.');
      return;
    }
    if (birthday && !/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
      setError('Please enter a valid birthday (MM/DD/YYYY).');
      return;
    }
    if (age && birthday && !isAgeConsistentWithBirthday(age, birthday)) {
      setError("The age you entered doesn't match your birthday. Please check both.");
      return;
    }
    const unchanged =
      photo === original.photoUrl &&
      name === original.name &&
      age === original.age &&
      birthday === original.birthday &&
      gender === original.gender &&
      address === original.address &&
      contactNumber === original.contactNumber &&
      barangay === original.barangay;
    if (unchanged) {
      setError('No changes to save.');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const uid = auth.currentUser.uid;
      let photoUrl = original.photoUrl || null;
      if (photo && photo !== original.photoUrl) {
        photoUrl = await uploadPhoto(photo);
      }
      await setDoc(
        doc(db, 'users', uid),
        {
          name: name.trim(),
          age: age ? Number(age) : null,
          birthday,
          gender,
          address: address.trim(),
          contactNumber: contactNumber.trim(),
          barangay,
          city: 'Cebu City',
          photoUrl,
          notificationPrefs: {
            pushEnabled,
            matchAlerts,
            nearbySightings,
          },
        },
        { merge: true }
      );
      await updateProfile(auth.currentUser, {
        displayName: name.trim(),
        photoURL: photoUrl || undefined,
      });
      setPhoto(photoUrl);
      setOriginal({
        photoUrl,
        name: name.trim(),
        age,
        birthday,
        gender,
        address: address.trim(),
        contactNumber: contactNumber.trim(),
        barangay,
      });
      setSaved(true);
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleNotification(key, value) {
    const nextPrefs = {
      pushEnabled: key === 'pushEnabled' ? value : pushEnabled,
      matchAlerts: key === 'matchAlerts' ? value : matchAlerts,
      nearbySightings: key === 'nearbySightings' ? value : nearbySightings,
    };
    if (key === 'pushEnabled') setPushEnabled(value);
    if (key === 'matchAlerts') setMatchAlerts(value);
    if (key === 'nearbySightings') setNearbySightings(value);

    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(
        doc(db, 'users', uid),
        { notificationPrefs: nextPrefs },
        { merge: true }
      );
    } catch {
      // non-blocking
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('New password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    setPasswordError('');
    setPasswordChanged(false);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordChanged(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (e) {
      setPasswordError(PASSWORD_ERROR_MESSAGES[e.code] || 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  }

  function handleCallHotline(tel, label) {
    Linking.openURL(`tel:${tel}`).catch(() => {
      Alert.alert('Dialer Unavailable', `Please dial ${label} (${tel}) on your phone.`);
    });
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => signOut(auth).then(() => router.replace('/(auth)/login')),
      },
    ]);
  }

  const initials = (name || email || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Citizen Profile & Safety</Text>
            <Text style={styles.headerSub}>Manage account, alerts & emergency contacts</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutChip}>
            <Text style={styles.logoutChipText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileBanner}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{name || 'Citizen User'}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{roleLabel}</Text>
              </View>
              {barangay ? (
                <View style={styles.brgyPill}>
                  <Text style={styles.brgyPillText}>📍 Brgy. {barangay}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        {/* Section 1: Personal & Barangay Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>👤 Personal & Barangay Details</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved ? <Text style={styles.saved}>✓ Profile & barangay preferences saved.</Text> : null}

          <AvatarPicker
            uri={photo}
            onChange={(uri) => { setPhoto(uri); setSaved(false); setError(''); }}
          />

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Juan dela Cruz"
            placeholderTextColor={Colors.textGray}
            value={name}
            onChangeText={(v) => { setName(sanitizeName(v)); setSaved(false); setError(''); }}
          />

          <View style={styles.rowFields}>
            <View style={styles.rowHalf}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="25"
                placeholderTextColor={Colors.textGray}
                value={age}
                onChangeText={(v) => { setAge(sanitizeAge(v)); setSaved(false); setError(''); }}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={styles.rowHalf}>
              <Text style={styles.label}>Birthday</Text>
              <DateField
                value={birthday}
                onChange={(v) => { setBirthday(v); setSaved(false); setError(''); }}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['Female', 'Male'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                onPress={() => { setGender(g); setSaved(false); setError(''); }}
              >
                <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Street / Home Address</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Rizal St., Cebu City"
            placeholderTextColor={Colors.textGray}
            value={address}
            onChangeText={(v) => { setAddress(v); setSaved(false); setError(''); }}
          />

          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            placeholder="09XX-XXX-XXXX"
            placeholderTextColor={Colors.textGray}
            value={contactNumber}
            onChangeText={(v) => { setContactNumber(v); setSaved(false); setError(''); }}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Barangay of Residence (Cebu City)</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => {
              setBarangaySearch('');
              setBarangayModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.selectorText, !barangay && { color: Colors.textGray }]}>
              {barangay ? `Brgy. ${barangay}, Cebu City` : 'Select your Barangay (80 Barangays)'}
            </Text>
            <Text style={styles.selectorChevron}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Used to center your nearby sightings map and alert local Barangay Responders.
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.disabledText}>{email}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Profile Changes'}</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Notification Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🔔 Notification Preferences</Text>
          <Text style={styles.sectionSub}>
            Configure real-time alerts for missing persons and AI matches in Cebu City.
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Push Notifications</Text>
              <Text style={styles.toggleDesc}>Receive instant mobile alerts from TraceNet</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(v) => handleToggleNotification('pushEnabled', v)}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={pushEnabled ? Colors.primary : '#F8FAFC'}
            />
          </View>

          <View style={styles.toggleDivider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>80/20 AI Match Alerts</Text>
              <Text style={styles.toggleDesc}>
                Notify immediately when a sighting matches your submitted report
              </Text>
            </View>
            <Switch
              value={matchAlerts}
              onValueChange={(v) => handleToggleNotification('matchAlerts', v)}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={matchAlerts ? Colors.primary : '#F8FAFC'}
            />
          </View>

          <View style={styles.toggleDivider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Nearby Sightings (5 km Radius)</Text>
              <Text style={styles.toggleDesc}>
                Alert when an active case is reported near {barangay ? `Brgy. ${barangay}` : 'your barangay'}
              </Text>
            </View>
            <Switch
              value={nearbySightings}
              onValueChange={(v) => handleToggleNotification('nearbySightings', v)}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={nearbySightings ? Colors.primary : '#F8FAFC'}
            />
          </View>
        </View>

        {/* Section 3: Cebu City Emergency Hotlines Directory */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🚨 Cebu City Emergency Hotlines</Text>
          <Text style={styles.sectionSub}>
            Tap any hotline below to dial Law Enforcement or Barangay Responders directly.
          </Text>

          {EMERGENCY_HOTLINES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.hotlineCard, { backgroundColor: item.bg, borderColor: `${item.color}30` }]}
              onPress={() => handleCallHotline(item.tel, item.name)}
              activeOpacity={0.8}
            >
              <View style={styles.hotlineLeft}>
                <View style={[styles.hotlineBadge, { backgroundColor: item.color }]}>
                  <Text style={styles.hotlineBadgeText}>{item.badge}</Text>
                </View>
                <Text style={styles.hotlineName}>{item.name}</Text>
                <Text style={styles.hotlineSub}>{item.subtitle}</Text>
              </View>
              <View style={[styles.callPill, { backgroundColor: item.color }]}>
                <Text style={styles.callPillIcon}>📞</Text>
                <Text style={styles.callPillText}>{item.number}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 4: Missing Person Reporting Safety Tips */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🛡️ Reporting Safety Guidelines</Text>
          {SAFETY_TIPS.map((tip, idx) => (
            <View key={idx} style={styles.tipItem}>
              <View style={styles.tipNumCircle}>
                <Text style={styles.tipNumText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipBody}>{tip.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Section 5: Security & Change Password */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🔐 Change Password</Text>
          {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
          {passwordChanged ? <Text style={styles.saved}>✓ Password updated successfully.</Text> : null}

          <Text style={styles.label}>Current Password</Text>
          <PasswordInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textGray}
            value={currentPassword}
            onChangeText={(v) => { setCurrentPassword(v); setPasswordChanged(false); }}
          />

          <Text style={styles.label}>New Password</Text>
          <PasswordInput
            style={styles.input}
            placeholder="At least 8 characters (letters & numbers)"
            placeholderTextColor={Colors.textGray}
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); setPasswordChanged(false); }}
          />

          <Text style={styles.label}>Confirm New Password</Text>
          <PasswordInput
            style={styles.input}
            placeholder="Re-enter new password"
            placeholderTextColor={Colors.textGray}
            value={confirmNewPassword}
            onChangeText={(v) => { setConfirmNewPassword(v); setPasswordChanged(false); }}
          />

          <TouchableOpacity
            style={[styles.button, changingPassword && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={changingPassword}
          >
            <Text style={styles.buttonText}>
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Searchable 80-Barangay Picker Modal */}
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
                <Text style={styles.modalTitle}>Select Barangay of Residence</Text>
                <Text style={styles.modalSub}>80 Official Cebu City Barangays</Text>
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
                placeholder="Search barangay (e.g. Lahug, Mabolo, Guadalupe)..."
                placeholderTextColor={Colors.textGray}
                value={barangaySearch}
                onChangeText={setBarangaySearch}
                autoCorrect={false}
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
                    onPress={() => {
                      setBarangay(item);
                      setSaved(false);
                      setError('');
                      setBarangayModalVisible(false);
                    }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  logoutChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutChipText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  profileMeta: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800', color: Colors.white },
  profileEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rolePillText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  brgyPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  brgyPillText: { fontSize: 10, fontWeight: '800', color: '#92400E' },

  scroll: { padding: 16, paddingBottom: 150, gap: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: Colors.textGray, marginBottom: 14, lineHeight: 17 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textDark, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  rowFields: { flexDirection: 'row', gap: 10 },
  rowHalf: { flex: 1 },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  genderBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  genderText: { fontSize: 13, fontWeight: '600', color: Colors.textGray },
  genderTextActive: { color: Colors.primary, fontWeight: '700' },

  selectorButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  selectorText: { fontSize: 14, color: Colors.textDark, fontWeight: '600' },
  selectorChevron: { fontSize: 15, color: Colors.textGray },
  inputDisabled: { justifyContent: 'center', opacity: 0.7 },
  disabledText: { fontSize: 14, color: Colors.textGray },
  hint: { fontSize: 11, color: Colors.textGray, marginBottom: 12 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  error: { color: Colors.danger, fontSize: 12, marginBottom: 10, fontWeight: '600' },
  saved: { color: Colors.success, fontSize: 12, marginBottom: 10, fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleInfo: { flex: 1, paddingRight: 12 },
  toggleTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  toggleDesc: { fontSize: 11, color: Colors.textGray, marginTop: 2 },
  toggleDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },

  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  hotlineLeft: { flex: 1, paddingRight: 10 },
  hotlineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 4,
  },
  hotlineBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.white },
  hotlineName: { fontSize: 13, fontWeight: '800', color: Colors.textDark },
  hotlineSub: { fontSize: 11, color: Colors.textGray, marginTop: 1 },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  callPillIcon: { fontSize: 12 },
  callPillText: { fontSize: 11, fontWeight: '800', color: Colors.white },

  tipItem: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tipNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipNumText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  tipTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  tipBody: { fontSize: 11, color: Colors.textGray, marginTop: 2, lineHeight: 16 },

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
  modalSub: { fontSize: 12, color: Colors.textGray, marginTop: 2 },
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
});
