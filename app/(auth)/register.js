import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { uploadPhoto } from '../../services/cloudinary';
import Colors from '../../constants/colors';
import { CEBU_CITY_BARANGAYS } from '../../constants/barangays';
import PasswordInput from '../../components/PasswordInput';
import AvatarPicker from '../../components/AvatarPicker';
import PolicyModal from '../../components/PolicyModal';
import DateField from '../../components/DateField';
import { TERMS_TEXT, PRIVACY_TEXT } from '../../constants/policies';
import { sanitizeName, sanitizeAge } from '../../utils/sanitize';
import { isAgeConsistentWithBirthday } from '../../utils/age';

const ROLE_LABEL = 'Citizen / Family Member';

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
  const [barangay, setBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [barangayModalVisible, setBarangayModalVisible] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredBarangays = CEBU_CITY_BARANGAYS.filter((b) =>
    b.toLowerCase().includes(barangaySearch.trim().toLowerCase())
  );

  async function handleCreateAccount() {
    if (
      !lastName.trim() ||
      !firstName.trim() ||
      !age ||
      !birthday ||
      !address.trim() ||
      !barangay ||
      !email.trim() ||
      !contactNumber.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Please fill in all required fields and select your Barangay.');
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
      const name = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');
      let photoUrl = null;
      if (photo) {
        try {
          photoUrl = await uploadPhoto(photo);
        } catch (e) {
          console.warn('Profile photo upload failed:', e.message);
        }
      }
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, {
        displayName: name,
        photoURL: photoUrl || undefined,
      });
      await setDoc(doc(db, 'users', credential.user.uid), {
        name,
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        age: Number(age),
        birthday,
        gender,
        address: address.trim(),
        barangay,
        city: 'Cebu City',
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        photoUrl,
        role: 'citizen',
        roleLabel: ROLE_LABEL,
        notificationPrefs: {
          pushEnabled: true,
          matchAlerts: true,
          nearbySightings: true,
        },
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
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>CEBU CITY CITIZEN PORTAL</Text>
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register as a Citizen / Family Member</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <AvatarPicker uri={photo} onChange={setPhoto} />

        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="dela Cruz"
          placeholderTextColor={Colors.textGray}
          value={lastName}
          onChangeText={(t) => setLastName(sanitizeName(t))}
        />

        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Juan"
          placeholderTextColor={Colors.textGray}
          value={firstName}
          onChangeText={(t) => setFirstName(sanitizeName(t))}
        />

        <Text style={styles.label}>Middle Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Santos (optional)"
          placeholderTextColor={Colors.textGray}
          value={middleName}
          onChangeText={(t) => setMiddleName(sanitizeName(t))}
        />

        <View style={styles.rowFields}>
          <View style={styles.rowHalf}>
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              placeholderTextColor={Colors.textGray}
              value={age}
              onChangeText={(t) => setAge(sanitizeAge(t))}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <View style={styles.rowHalf}>
            <Text style={styles.label}>Birthday *</Text>
            <DateField value={birthday} onChange={setBirthday} style={styles.input} />
          </View>
        </View>

        <Text style={styles.label}>Gender *</Text>
        <View style={styles.genderRow}>
          {['Female', 'Male'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Barangay of Residence (Cebu City) *</Text>
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

        <Text style={styles.label}>Street / Home Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="123 Rizal St., Cebu City"
          placeholderTextColor={Colors.textGray}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="juan@example.com"
          placeholderTextColor={Colors.textGray}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Contact Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="09XX-XXX-XXXX"
          placeholderTextColor={Colors.textGray}
          value={contactNumber}
          onChangeText={setContactNumber}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Password *</Text>
        <PasswordInput
          style={styles.input}
          placeholder="At least 8 characters (letters & numbers)"
          placeholderTextColor={Colors.textGray}
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirm Password *</Text>
        <PasswordInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor={Colors.textGray}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <View style={styles.checkRow}>
          <TouchableOpacity
            style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
            onPress={() => setAgreedToTerms((v) => !v)}
          >
            {agreedToTerms ? <Text style={styles.checkmark}>✓</Text> : null}
          </TouchableOpacity>
          <Text style={styles.checkLabel}>
            I agree to the{' '}
            <Text style={styles.policyLink} onPress={() => setTermsVisible(true)}>
              Terms and Conditions
            </Text>
          </Text>
        </View>

        <View style={styles.checkRow}>
          <TouchableOpacity
            style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}
            onPress={() => setAgreedToPrivacy((v) => !v)}
          >
            {agreedToPrivacy ? <Text style={styles.checkmark}>✓</Text> : null}
          </TouchableOpacity>
          <Text style={styles.checkLabel}>
            I agree to the{' '}
            <Text style={styles.policyLink} onPress={() => setPrivacyVisible(true)}>
              Privacy Policy (RA 10173)
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateAccount}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkRow}>
          <Text style={styles.link}>
            Already have an account?{' '}
            <Text style={styles.linkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <PolicyModal
        visible={termsVisible}
        title="Terms and Conditions"
        body={TERMS_TEXT}
        onClose={() => setTermsVisible(false)}
      />
      <PolicyModal
        visible={privacyVisible}
        title="Privacy Policy"
        body={PRIVACY_TEXT}
        onClose={() => setPrivacyVisible(false)}
      />

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
                <Text style={styles.modalTitle}>Select Barangay</Text>
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
                placeholder="Search barangay (e.g. Lahug, Guadalupe, Talamban)..."
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
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 52, paddingBottom: 150 },
  backBtn: { marginBottom: 10, alignSelf: 'flex-start' },
  backText: { fontSize: 28, color: Colors.textDark, fontWeight: '400' },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  headerBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.primary, letterSpacing: 0.7 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textDark, marginBottom: 4 },
  subtitle: { fontSize: 12, color: Colors.textGray, marginBottom: 18 },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 6 },
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
  rowFields: { flexDirection: 'row', gap: 10 },
  rowHalf: { flex: 1 },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  genderBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  genderText: { fontSize: 14, fontWeight: '600', color: Colors.textGray },
  genderTextActive: { color: Colors.primary, fontWeight: '700' },
  selectorButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  selectorText: { fontSize: 14, color: Colors.textDark, fontWeight: '600' },
  selectorChevron: { fontSize: 16, color: Colors.textGray },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  checkLabel: { flex: 1, fontSize: 13, color: Colors.textDark },
  policyLink: { color: Colors.primary, fontWeight: '700', textDecorationLine: 'underline' },

  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  linkRow: { alignItems: 'center' },
  link: { fontSize: 14, color: Colors.textGray },
  linkBold: { color: Colors.primary, fontWeight: '700' },

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
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
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
