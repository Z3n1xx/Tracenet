import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import Colors from '../constants/colors';

export default function MatchAlertScreen() {
  const { id } = useLocalSearchParams();
  const [match, setMatch] = useState(null);
  const [missingReport, setMissingReport] = useState(null);
  const [sightingReport, setSightingReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, 'matches', id),
      async (snap) => {
        if (!snap.exists()) {
          setMatch(null);
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setMatch(data);
        const [missingSnap, sightingSnap] = await Promise.all([
          getDoc(doc(db, 'reports', data.missingReportId)),
          getDoc(doc(db, 'reports', data.sightingReportId)),
        ]);
        setMissingReport(missingSnap.exists() ? { id: missingSnap.id, ...missingSnap.data() } : null);
        setSightingReport(sightingSnap.exists() ? { id: sightingSnap.id, ...sightingSnap.data() } : null);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        if (error.code !== 'permission-denied') console.warn('Match listener error:', error);
      }
    );
    return unsubscribe;
  }, [id]);

  async function handleConfirm() {
    setActing(true);
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        status: 'confirmed',
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.uid || null,
      });
      Alert.alert(
        'Match Confirmed',
        'Confirmation notifies family and CCPO.',
        [{ text: 'OK', onPress: () => router.replace(`/case-status?id=${match.missingReportId}`) }]
      );
    } catch {
      Alert.alert('Error', 'Failed to confirm match. Please try again.');
    } finally {
      setActing(false);
    }
  }

  async function handleReview() {
    setActing(true);
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        status: 'needs_review',
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.uid || null,
      });
      Alert.alert('Sent for Review', 'This match has been flagged for manual review.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to flag match. Please try again.');
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!match || !missingReport || !sightingReport) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFound}>Match not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>‹ Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const confidence = Math.round(match.confidence ?? 0);
  const fillWidth = `${confidence}%`;
  const isPending = match.status === 'pending';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Match Alert</Text>
        <Text style={styles.headerSub}>A potential match was detected</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🤖 AI Facial Match — {confidence}% Confidence</Text>

          <View style={styles.photoRow}>
            <View style={styles.photoCard}>
              <View style={styles.photoBox}>
                {missingReport.photoUrl
                  ? <Image source={{ uri: missingReport.photoUrl }} style={styles.photo} />
                  : <Text style={styles.photoInitial}>👤</Text>
                }
              </View>
              <Text style={styles.photoTag}>MISSING</Text>
              <Text style={styles.photoName}>{missingReport.name}</Text>
              <Text style={styles.photoSub}>{missingReport.location}</Text>
            </View>

            <Text style={styles.arrow}>↔</Text>

            <View style={styles.photoCard}>
              <View style={[styles.photoBox, styles.photoBoxFound]}>
                {sightingReport.photoUrl
                  ? <Image source={{ uri: sightingReport.photoUrl }} style={styles.photo} />
                  : <Text style={styles.photoInitial}>👤</Text>
                }
              </View>
              <Text style={[styles.photoTag, styles.photoTagFound]}>FOUND</Text>
              <Text style={styles.photoName}>{sightingReport.name}</Text>
              <Text style={styles.photoSub}>{sightingReport.location}</Text>
            </View>
          </View>

          <View style={styles.barContainer}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: fillWidth }]} />
            </View>
            <Text style={styles.barLabel}>Match Confidence Score</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.confirmBtn, (acting || !isPending) && styles.btnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              disabled={acting || !isPending}
            >
              <Text style={styles.confirmBtnText}>✓ Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewBtn, (acting || !isPending) && styles.btnDisabled]}
              onPress={handleReview}
              activeOpacity={0.8}
              disabled={acting || !isPending}
            >
              <Text style={styles.reviewBtnText}>🔍 Review</Text>
            </TouchableOpacity>
          </View>

          {!isPending && (
            <Text style={styles.statusNote}>
              Status: {match.status === 'confirmed' ? 'Confirmed' : 'Flagged for review'}
            </Text>
          )}
        </View>

        <Text style={styles.footerNote}>
          Confirmation notifies family and CCPO.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, color: Colors.textGray },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  body: { flex: 1, padding: 20 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.textDark, marginBottom: 16, textAlign: 'center' },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  photoCard: { flex: 1, alignItems: 'center' },
  photoBox: {
    width: 84,
    height: 100,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  photoBoxFound: {
    backgroundColor: '#FFF8E1',
    borderColor: Colors.warning,
  },
  photo: { width: '100%', height: '100%', borderRadius: 10 },
  photoInitial: { fontSize: 30 },
  photoTag: { fontSize: 9, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  photoTagFound: { color: Colors.warning },
  photoName: { fontSize: 13, fontWeight: '700', color: Colors.textDark, textAlign: 'center', marginTop: 2 },
  photoSub: { fontSize: 11, color: Colors.textGray, textAlign: 'center', marginTop: 2 },
  arrow: { fontSize: 20, color: Colors.textGray, paddingHorizontal: 8 },
  barContainer: { marginBottom: 18 },
  barTrack: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 5,
  },
  barLabel: { fontSize: 11, color: Colors.textGray, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  reviewBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  reviewBtnText: { color: Colors.textGray, fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  statusNote: { fontSize: 12, color: Colors.textGray, textAlign: 'center', marginTop: 10, fontWeight: '600' },
  footerNote: { fontSize: 11, color: Colors.textGray, textAlign: 'center', lineHeight: 17 },
});
