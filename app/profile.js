import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Colors from '../constants/colors';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || '');
        setContactNumber(data.contactNumber || '');
        setEmail(data.email || auth.currentUser.email || '');
      } else {
        setEmail(auth.currentUser.email || '');
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!name) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const uid = auth.currentUser.uid;
      await updateDoc(doc(db, 'users', uid), { name, contactNumber });
      await updateProfile(auth.currentUser, { displayName: name });
      setSaved(true);
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.saved}>Profile updated.</Text> : null}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Juan dela Cruz"
          placeholderTextColor={Colors.textGray}
          value={name}
          onChangeText={(v) => { setName(v); setSaved(false); }}
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
      </ScrollView>
    </KeyboardAvoidingView>
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
  scroll: { padding: 28, paddingBottom: 48 },
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
});
