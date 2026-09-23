import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import Colors from '../../constants/colors';

const ROLES = ['Citizen / Family Member', 'Police Officer', 'Barangay Official'];

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
};

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [role, setRole] = useState('Citizen / Family Member');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRoles, setShowRoles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleNext() {
    if (!name || !email || !contactNumber || !password || !confirmPassword) {
      setError('Please fill in all fields.');
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
      await updateProfile(credential.user, { displayName: name });
      await setDoc(doc(db, 'users', credential.user.uid), {
        name,
        email: email.trim(),
        contactNumber,
        role,
        createdAt: serverTimestamp(),
      });
      if (role === 'Barangay Official') {
        router.replace('/barangay-dashboard');
      } else {
        router.replace('/(tabs)');
      }
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

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Juan dela Cruz"
          placeholderTextColor={Colors.textGray}
          value={name}
          onChangeText={setName}
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

        <Text style={styles.label}>Role</Text>
        <TouchableOpacity
          style={styles.roleSelector}
          onPress={() => setShowRoles(!showRoles)}
          activeOpacity={0.8}
        >
          <Text style={styles.roleSelectorText}>{role}</Text>
          <Text style={styles.roleArrow}>{showRoles ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showRoles && (
          <View style={styles.roleDropdown}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleOption, role === r && styles.roleOptionActive]}
                onPress={() => { setRole(r); setShowRoles(false); }}
              >
                <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 6 characters"
          placeholderTextColor={Colors.textGray}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor={Colors.textGray}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

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
  roleSelector: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleSelectorText: { fontSize: 14, color: Colors.textDark },
  roleArrow: { fontSize: 12, color: Colors.textGray },
  roleDropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.white,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 4,
  },
  roleOption: { padding: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  roleOptionActive: { backgroundColor: Colors.primaryLight },
  roleOptionText: { fontSize: 14, color: Colors.textDark },
  roleOptionTextActive: { color: Colors.primary, fontWeight: '700' },
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
});
