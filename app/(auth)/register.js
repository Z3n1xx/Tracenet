import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { uploadPhoto } from '../../services/cloudinary';
import Colors from '../../constants/colors';
import PasswordInput from '../../components/PasswordInput';
import AvatarPicker from '../../components/AvatarPicker';
import PolicyModal from '../../components/PolicyModal';
import { TERMS_TEXT, PRIVACY_TEXT } from '../../constants/policies';

const ROLE = 'Citizen / Family Member';

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 8 characters and include a letter and a number.',
};

export default function RegisterScreen() {
  const [photo, setPhoto] = useState(null);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('Female');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleNext() {
    if (!lastName || !firstName || !age || !birthday || !address || !email || !contactNumber || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
      setError('Birthday must be in MM/DD/YYYY format.');
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms and Conditions to continue.');
      return;
    }
    if (!agreedToPrivacy) {
      setError('You must agree to the Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const name = [firstName, middleName, lastName].filter(Boolean).join(' ');
      let photoUrl = null;
      if (photo) {
        try {
          photoUrl = await uploadPhoto(photo);
        } catch (e) {
          console.warn('Profile photo upload failed:', e.message);
        }
      }
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name, photoURL: photoUrl || undefined });
      await setDoc(doc(db, 'users', credential.user.uid), {
        name,
        lastName,
        firstName,
        middleName,
        age: Number(age),
        birthday,
        gender,
        address,
        email: email.trim(),
        contactNumber,
        photoUrl,
        role: ROLE,
        createdAt: serverTimestamp(),
      });
      router.replace('/(tabs)');
    } catch (e) {
      setError(AUTH_ERROR_MESSAGES[e.code] || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.stepLabel}>Step 1 of 2 — Personal Information</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AvatarPicker uri={photo} onChange={setPhoto} />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Dela Cruz"
          placeholderTextColor={Colors.textGray}
          value={lastName}
          onChangeText={setLastName}
        />

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Juan"
          placeholderTextColor={Colors.textGray}
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Middle Name (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Santos"
          placeholderTextColor={Colors.textGray}
          value={middleName}
          onChangeText={setMiddleName}
        />

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
                  style={[styles.sexBtn, gender === s && styles.sexBtnActive]}
                  onPress={() => setGender(s)}
                >
                  <Text style={[styles.sexBtnText, gender === s && styles.sexBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.label}>Birthday</Text>
        <TextInput
          style={styles.input}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={Colors.textGray}
          value={birthday}
          onChangeText={setBirthday}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Brgy., Street, Cebu City"
          placeholderTextColor={Colors.textGray}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="juan@example.com"
          placeholderTextColor={Colors.textGray}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          style={styles.input}
          placeholder="09XX-XXX-XXXX"
          placeholderTextColor={Colors.textGray}
          value={contactNumber}
          onChangeText={setContactNumber}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Password</Text>
        <PasswordInput
          style={styles.input}
          placeholder="At least 8 characters, with a letter and a number"
          placeholderTextColor={Colors.textGray}
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <PasswordInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor={Colors.textGray}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAgreedToTerms((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink} onPress={() => setTermsVisible(true)}>
              Terms and Conditions
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAgreedToPrivacy((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
            {agreedToPrivacy && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink} onPress={() => setPrivacyVisible(true)}>
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Next →'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkRow}>
          <Text style={styles.link}>
            Already have an account?{' '}
            <Text style={styles.linkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <PolicyModal
        visible={termsVisible}
        onClose={() => setTermsVisible(false)}
        title="Terms and Conditions"
        text={TERMS_TEXT}
      />
      <PolicyModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
        title="Privacy Policy"
        text={PRIVACY_TEXT}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 56 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 28, color: Colors.textDark, fontWeight: '400' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textDark, marginBottom: 6 },
  stepLabel: { fontSize: 12, color: Colors.textGray, fontWeight: '600', marginBottom: 10 },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    width: '50%',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
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
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center' },
  link: { fontSize: 14, color: Colors.textGray },
  linkBold: { color: Colors.primary, fontWeight: '700' },
  error: { color: Colors.danger, fontSize: 13, marginBottom: 12 },
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
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, marginTop: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxTick: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  termsText: { fontSize: 13, color: Colors.textDark, flex: 1 },
  termsLink: { color: Colors.primary, fontWeight: '700' },
});
