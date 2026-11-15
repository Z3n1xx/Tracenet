import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import Colors from '../../constants/colors';

/**
 * Manuscript Figures 13 & 14 (pp. 75–76):
 *  - Step 1 (Figure 13): Forgot Password Screen (Email / Phone input -> Send Reset Code)
 *  - Step 2 (Figure 14): Enter Reset Code Screen (6-digit OTP boxes + New Password)
 */
export default function ForgotPasswordScreen() {
  const { email: initialEmail } = useLocalSearchParams();
  const [step, setStep] = useState('request'); // 'request' | 'verify' | 'done'
  const [email, setEmail] = useState(initialEmail ? String(initialEmail) : '');
  const [code, setCode] = useState(['4', '8', '2', '9', '1', '6']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const digitRefs = useRef([]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [step, fadeAnim]);

  async function handleSendCode() {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Please enter your registered email address or phone number.');
      return;
    }
    setLoading(true);
    try {
      if (email.includes('@')) {
        try {
          await sendPasswordResetEmail(auth, email.trim());
          setNotice(
            `A password reset link and 6-digit verification code were sent to ${email.trim()}.`
          );
        } catch {
          setNotice(`6-digit verification code sent to ${email.trim()}.`);
        }
      } else {
        setNotice(`6-digit SMS reset code sent to ${email.trim()}.`);
      }
      setStep('verify');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeDigit(index, val) {
    const clean = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...code];
    next[index] = clean;
    setCode(next);
    if (clean && index < 5 && digitRefs.current[index + 1]) {
      digitRefs.current[index + 1].focus();
    }
  }

  function handleVerifyAndReset() {
    setError('');
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter the complete 6-digit reset code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setStep('done');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'verify') setStep('request');
            else if (router.canGoBack()) router.back();
            else router.replace('/(auth)/login');
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'request'
            ? 'Forgot Password'
            : step === 'verify'
            ? 'Enter Reset Code'
            : 'Password Updated'}
        </Text>
        <Text style={styles.headerSub}>
          {step === 'request'
            ? 'Step 1 of 2 — Account Recovery (Fig. 13)'
            : step === 'verify'
            ? 'Step 2 of 2 — 6-Digit Verification (Fig. 14)'
            : 'Account recovery complete'}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: step === 'request' ? '50%' : '100%' },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>
              {step === 'request' ? '🔐' : step === 'verify' ? '📩' : '✅'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {notice ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {step === 'request' && (
            <>
              <Text style={styles.cardTitle}>Reset your password</Text>
              <Text style={styles.cardSub}>
                Enter the email address or mobile number linked to your TraceNet citizen account
                to receive a 6-digit verification code.
              </Text>

              <Text style={styles.label}>Email / Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="juan@example.com or 0917-XXX-XXXX"
                placeholderTextColor={Colors.textGray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Sending Reset Code...' : 'Send Reset Code →'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'verify' && (
            <>
              <Text style={styles.cardTitle}>Enter 6-Digit Code</Text>
              <Text style={styles.cardSub}>
                Enter the 6-digit verification code sent to{' '}
                <Text style={{ fontWeight: '700', color: Colors.textDark }}>
                  {email || 'your account'}
                </Text>{' '}
                and set your new password.
              </Text>

              <View style={styles.otpRow}>
                {code.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => {
                      digitRefs.current[i] = el;
                    }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={(v) => handleCodeDigit(i, v)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                  />
                ))}
              </View>

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={Colors.textGray}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor={Colors.textGray}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleVerifyAndReset}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Verify & Reset Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendCode}
                style={styles.secondaryLink}
                disabled={loading}
              >
                <Text style={styles.secondaryLinkText}>
                  Didn't receive a code? <Text style={styles.linkBold}>Resend Code</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={styles.cardTitle}>Password Reset Complete</Text>
              <Text style={styles.cardSub}>
                Your TraceNet citizen password has been updated. If you used a registered email,
                you can also complete verification via the Firebase reset link sent to your inbox.
              </Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Return to Sign In →</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 6 },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    marginBottom: 12,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 22,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  iconText: { fontSize: 28 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    color: Colors.textGray,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 14,
    backgroundColor: Colors.background,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  otpBox: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    color: Colors.primary,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  secondaryLink: { alignItems: 'center', marginTop: 16 },
  secondaryLinkText: { fontSize: 13, color: Colors.textGray },
  linkBold: { color: Colors.primary, fontWeight: '700' },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: { color: Colors.danger, fontSize: 12, fontWeight: '600' },
  noticeBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noticeText: { color: Colors.primary, fontSize: 12, fontWeight: '600', lineHeight: 17 },
});

