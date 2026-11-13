import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../services/firebase';
import Colors from '../../constants/colors';
import PasswordInput from '../../components/PasswordInput';

const AUTH_ERROR_MESSAGES = {
  'auth/expired-action-code': 'This reset code has expired. Please request a new one.',
  'auth/invalid-action-code': 'That reset code is invalid. Check that you copied it correctly.',
  'auth/weak-password': 'Password should be at least 8 characters and include a letter and a number.',
};

function extractCode(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/oobCode=([^&\s]+)/);
  if (match) return decodeURIComponent(match[1]);
  return trimmed;
}

export default function ResetCodeScreen() {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!code.trim()) {
      setError('Please enter the code from your email.');
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(auth, extractCode(code), newPassword);
      setDone(true);
    } catch (e) {
      setError(AUTH_ERROR_MESSAGES[e.code] || 'Could not reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Reset Code</Text>
        <Text style={styles.headerSub}>From the email we sent you</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {done ? (
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Password updated</Text>
            <Text style={styles.successText}>
              Your password has been changed. You can now sign in with your new password.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>
              Open the email, long-press the reset link and choose "Copy Link" (don't tap it), then paste it below along with your new password.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Reset Code or Link</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste the copied link here"
              placeholderTextColor={Colors.textGray}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              multiline
            />

            <Text style={styles.label}>New Password</Text>
            <PasswordInput
              style={styles.input}
              placeholder="At least 8 characters, with a letter and a number"
              placeholderTextColor={Colors.textGray}
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <PasswordInput
              style={styles.input}
              placeholder="Re-enter new password"
              placeholderTextColor={Colors.textGray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Reset Password'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 28, color: Colors.white, fontWeight: '400' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  scroll: { flexGrow: 1, padding: 28 },
  intro: { fontSize: 13, color: Colors.textGray, lineHeight: 19, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 20,
    backgroundColor: Colors.background,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  error: { color: Colors.danger, fontSize: 13, marginBottom: 12 },
  successBox: { alignItems: 'center', paddingTop: 20 },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIcon: { fontSize: 32 },
  successTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark, marginBottom: 10 },
  successText: { fontSize: 13, color: Colors.textGray, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
});
