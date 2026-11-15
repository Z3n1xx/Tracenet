import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  Modal, FlatList, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import Colors from '../../constants/colors';
import { CEBU_CITY_BARANGAYS } from '../../constants/barangays';

const ROLE_LABEL = 'Citizen / Family Member';

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
};

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [barangay, setBarangay] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [barangayModalVisible, setBarangayModalVisible] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const filteredBarangays = CEBU_CITY_BARANGAYS.filter((b) =>
    b.toLowerCase().includes(barangaySearch.trim().toLowerCase())
  );

  function animateToStep(nextStep) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  function handleStep1Next() {
    if (!name.trim() || !email.trim() || !contactNumber.trim()) {
      setError('Please enter your full name, email address, and contact number.');
      return;
    }
    if (!barangay) {
      setError('Please select your Barangay of Residence in Cebu City.');
      return;
    }
    setError('');
    animateToStep(2);
  }

  async function handleCreateAccount() {
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: name.trim(),
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        barangay,
        city: 'Cebu City',
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={() => (step === 2 ? animateToStep(1) : router.back())}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>CEBU CITY CITIZEN PORTAL</Text>
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.stepLabel}>
          {step === 1
            ? 'Step 1 of 2 — Personal & Barangay Information'
            : 'Step 2 of 2 — Account Security & Verification'}
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <Animated.View style={{ opacity: fadeAnim }}>
          {step === 1 ? (
            <>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan dela Cruz"
                placeholderTextColor={Colors.textGray}
                value={name}
                onChangeText={setName}
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

              <Text style={styles.label}>Barangay of Residence (Cebu City) *</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => {
                  setBarangaySearch('');
                  setBarangayModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View>
                  <Text
                    style={[
                      styles.selectorText,
                      !barangay && { color: Colors.textGray },
                    ]}
                  >
                    {barangay ? `Brgy. ${barangay}, Cebu City` : 'Select your Barangay (80 Barangays)'}
                  </Text>
                </View>
                <Text style={styles.selectorChevron}>▾</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>
                Used to prioritize nearby missing person alerts & routing to your Barangay Desk.
              </Text>

              <Text style={styles.label}>Account Role</Text>
              <View style={styles.roleSelector}>
                <View style={styles.roleDot} />
                <Text style={styles.roleSelectorText}>{ROLE_LABEL}</Text>
              </View>
              <Text style={styles.roleHint}>
                Barangay officials and CCPO police officers use the TraceNet Web Portal.
              </Text>

              <TouchableOpacity style={styles.button} onPress={handleStep1Next}>
                <Text style={styles.buttonText}>Next: Set Password →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Citizen Name</Text>
                  <Text style={styles.summaryValue}>{name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Barangay</Text>
                  <Text style={styles.summaryValue}>Brgy. {barangay}, Cebu City</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Contact</Text>
                  <Text style={styles.summaryValue}>{contactNumber}</Text>
                </View>
              </View>

              <Text style={styles.label}>Create Password *</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, { marginBottom: 0, flex: 1, borderWidth: 0 }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={Colors.textGray}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor={Colors.textGray}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />

              <View style={styles.privacyNotice}>
                <Text style={styles.privacyTitle}>🔒 RA 10173 Data Privacy Notice</Text>
                <Text style={styles.privacyBody}>
                  Your contact and barangay details are protected under the Data Privacy Act of 2012
                  and shared only with verified Barangay Responders and CCPO investigators when you
                  submit a missing person report or sighting.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleCreateAccount}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Creating Account...' : 'Complete Registration ✓'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => animateToStep(1)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>← Edit Personal & Barangay Info</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkRow}>
          <Text style={styles.link}>
            Already have an account?{' '}
            <Text style={styles.linkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
              {barangaySearch ? (
                <TouchableOpacity onPress={() => setBarangaySearch('')}>
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredBarangays}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.barangayList}
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
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No barangay matching "{barangaySearch}"</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 52, paddingBottom: 40 },
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
  stepLabel: { fontSize: 12, color: Colors.textGray, fontWeight: '600', marginBottom: 10 },
  progressTrack: {
    height: 5,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 22,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
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
  selectorButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: { fontSize: 14, color: Colors.textDark, fontWeight: '600' },
  selectorChevron: { fontSize: 16, color: Colors.textGray },
  fieldHint: { fontSize: 11, color: Colors.textGray, marginTop: 5, marginBottom: 14 },
  roleSelector: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  roleSelectorText: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  roleHint: { fontSize: 11, color: Colors.textGray, marginTop: 6, marginBottom: 18 },
  summaryCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    gap: 6,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: Colors.textGray, fontWeight: '600' },
  summaryValue: { fontSize: 13, color: Colors.textDark, fontWeight: '700' },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.background,
    marginBottom: 14,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  eyeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  privacyNotice: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  privacyTitle: { fontSize: 12, fontWeight: '700', color: '#0369A1', marginBottom: 4 },
  privacyBody: { fontSize: 11, color: '#0C4A6E', lineHeight: 16 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
  secondaryBtnText: { fontSize: 13, color: Colors.textGray, fontWeight: '600' },
  linkRow: { alignItems: 'center', marginTop: 4 },
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
  clearText: { fontSize: 14, color: Colors.textGray, paddingHorizontal: 6 },
  barangayList: { flexGrow: 0 },
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
  emptyWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 13, color: Colors.textGray },
});
