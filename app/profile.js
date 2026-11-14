import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { uploadPhoto } from '../services/cloudinary';
import Colors from '../constants/colors';
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

export default function ProfileScreen() {
  const [photo, setPhoto] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('Female');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [original, setOriginal] = useState({});
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

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setPhoto(data.photoUrl || null);
        setName(data.name || '');
        setAge(data.age ? String(data.age) : '');
        setBirthday(data.birthday || '');
        setGender(data.gender || 'Female');
        setAddress(data.address || '');
        setContactNumber(data.contactNumber || '');
        setEmail(data.email || auth.currentUser.email || '');
        setOriginal({
          photoUrl: data.photoUrl || null,
          name: data.name || '',
          age: data.age ? String(data.age) : '',
          birthday: data.birthday || '',
          gender: data.gender || 'Female',
          address: data.address || '',
          contactNumber: data.contactNumber || '',
        });
      } else {
        setEmail(auth.currentUser.email || '');
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!name || !age || !birthday || !address || !contactNumber) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
      setError('Please select your birthday.');
      return;
    }
    if (!isAgeConsistentWithBirthday(age, birthday)) {
      setError("The age you entered doesn't match your birthday. Please check both.");
      return;
    }
    const unchanged = photo === original.photoUrl && name === original.name
      && age === original.age && birthday === original.birthday
      && gender === original.gender && address === original.address
      && contactNumber === original.contactNumber;
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
      await updateDoc(doc(db, 'users', uid), {
        name, age: Number(age), birthday, gender, address, contactNumber, photoUrl,
      });
      await updateProfile(auth.currentUser, { displayName: name, photoURL: photoUrl || undefined });
      setPhoto(photoUrl);
      setOriginal({ photoUrl, name, age, birthday, gender, address, contactNumber });
      setSaved(true);
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
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

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => signOut(auth).then(() => router.replace('/')),
      },
    ]);
  }

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
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Profile</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.saved}>Profile updated.</Text> : null}

        <AvatarPicker uri={photo} onChange={(v) => { setPhoto(v); setSaved(false); }} />

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Juan dela Cruz"
          placeholderTextColor={Colors.textGray}
          value={name}
          onChangeText={(v) => { setName(sanitizeName(v)); setSaved(false); }}
        />

        <View style={styles.rowFields}>
          <View style={styles.rowFieldHalf}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="34"
              placeholderTextColor={Colors.textGray}
              value={age}
              onChangeText={(v) => { setAge(sanitizeAge(v)); setSaved(false); }}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.rowFieldHalf}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.sexRow}>
              {['Male', 'Female'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sexBtn, gender === s && styles.sexBtnActive]}
                  onPress={() => { setGender(s); setSaved(false); }}
                >
                  <Text style={[styles.sexBtnText, gender === s && styles.sexBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.label}>Birthday</Text>
        <DateField
          style={styles.input}
          value={birthday}
          onChange={(v) => { setBirthday(v); setSaved(false); }}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Brgy., Street, Cebu City"
          placeholderTextColor={Colors.textGray}
          value={address}
          onChangeText={(v) => { setAddress(v); setSaved(false); }}
        />

        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          style={styles.input}
          placeholder="09XX-XXX-XXXX"
          placeholderTextColor={Colors.textGray}
          value={contactNumber}
          onChangeText={(v) => { setContactNumber(v); setSaved(false); }}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email Address</Text>
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={styles.disabledText}>{email}</Text>
        </View>
        <Text style={styles.hint}>Email can't be changed here.</Text>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Change Password</Text>
        {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
        {passwordChanged ? <Text style={styles.saved}>Password changed.</Text> : null}

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
          placeholder="At least 8 characters, with a letter and a number"
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
            {changingPassword ? 'Changing...' : 'Change Password'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {},
  backText: { fontSize: 18, fontWeight: '800', color: Colors.white },
  scroll: { padding: 28, paddingBottom: 200 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 14,
    backgroundColor: Colors.background,
  },
  inputDisabled: { justifyContent: 'center', opacity: 0.7 },
  disabledText: { fontSize: 14, color: Colors.textGray },
  hint: { fontSize: 11, color: Colors.textGray, marginTop: -10, marginBottom: 20 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textDark, marginBottom: 16 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  error: { color: Colors.danger, fontSize: 13, marginBottom: 12 },
  saved: { color: Colors.success, fontSize: 13, marginBottom: 12, fontWeight: '600' },
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
  logoutButton: {
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutButtonText: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
});
