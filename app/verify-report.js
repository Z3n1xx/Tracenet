import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import Colors from '../constants/colors';

export default function VerifyReportScreen() {
  const { id } = useLocalSearchParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'reports', id), (snap) => {
      setLoading(false);
      setReport(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return unsubscribe;
  }, [id]);

  async function handleApprove() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'reports', id), { status: 'verified' });
      Alert.alert('Report Approved', `${report.name}'s report has been verified.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update report.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFlag() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'reports', id), { flagged: true });
      Alert.alert('Report Flagged', 'This report has been flagged for further review.');
    } catch {
      Alert.alert('Error', 'Failed to update report.');
    } finally {
      setSaving(false);
    }
  }

  async function handleForward() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'reports', id), { status: 'forwarded' });
      Alert.alert('Forwarded to CCPO', `Case has been forwarded to CCPO.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update report.');
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

  if (!report) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFound}>Report not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>‹ Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Verify Report</Text>
        </TouchableOpacity>
        <Text style={styles.headerSub}>
          Case #{report.id.slice(0, 6)} — {report.name}{report.age ? `, ${report.age}` : ''}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.photoBox}>
            {report.photoUrl
              ? <Image source={{ uri: report.photoUrl }} style={styles.photo} />
              : <Text style={styles.photoIcon}>👤</Text>
            }
          </View>
          <Text style={styles.name}>{report.name}</Text>
          <Text style={styles.meta}>
            {report.age ? `Age: ${report.age}` : ''}{report.age && report.sex ? ' • ' : ''}{report.sex}
          </Text>
          <Text style={styles.meta}>Last seen: {report.location}</Text>
          <Text style={styles.submittedBy}>Submitted by {report.reportedByName}</Text>
        </View>

        <Text style={styles.sectionTitle}>DESCRIPTION</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionText}>{report.description || 'No description provided.'}</Text>
        </View>

        <Text style={styles.sectionTitle}>REPORTER INFORMATION</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionText}>{report.reportedByName}</Text>
        </View>

        <Text style={styles.sectionTitle}>Verification Decision</Text>
        <View style={styles.decisionRow}>
          <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} activeOpacity={0.85} disabled={saving}>
            <Text style={styles.approveBtnText}>✓ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.flagBtn} onPress={handleFlag} activeOpacity={0.85} disabled={saving}>
            <Text style={styles.flagBtnText}>🚩 Flag</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forwardBtn} onPress={handleForward} activeOpacity={0.85} disabled={saving}>
          <Text style={styles.forwardBtnText}>Forward to CCPO →</Text>
        </TouchableOpacity>
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
  backBtn: {},
  backText: { fontSize: 18, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  body: { flex: 1, padding: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  photoBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoIcon: { fontSize: 34 },
  name: { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  meta: { fontSize: 12, color: Colors.textGray, marginTop: 3 },
  submittedBy: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textGray,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 1,
  },
  sectionText: { fontSize: 13, color: Colors.textDark, lineHeight: 19 },
  decisionRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  approveBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  flagBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  flagBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '700' },
  forwardBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  forwardBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
