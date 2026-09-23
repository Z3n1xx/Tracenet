import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Colors from '../constants/colors';

export default function StarterScreen() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = userDoc.exists() ? userDoc.data().role : null;
      router.replace(role === 'Barangay Official' ? '/barangay-dashboard' : '/(tabs)');
    });
    return unsubscribe;
  }, []);

  if (checkingAuth) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={Colors.white} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🔍</Text>
        </View>
        <Text style={styles.appName}>TraceNet</Text>
        <Text style={styles.tagline}>
          Missing Person Detection &amp; Coordination{'\n'}System for Cebu City
        </Text>
        <View style={styles.dots}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[styles.dot, i === 3 && styles.dotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.createText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          For Cebu City citizens, barangay officials,{'\n'}and CCPO personnel
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  logoArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingTop: 80,
    paddingHorizontal: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoIcon: { fontSize: 40 },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 2,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: 32, marginBottom: 40 },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { backgroundColor: Colors.white, width: 18 },
  actions: { gap: 12, padding: 32, paddingBottom: 48 },
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  signInText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  createBtn: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  footer: {
    textAlign: 'center',
    color: Colors.textGray,
    fontSize: 11,
    marginTop: 8,
    lineHeight: 17,
  },
});
