import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import Colors from '../constants/colors';

export default function BarangayDashboardScreen() {
  const [tab, setTab] = useState('New Reports');
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setReports(rows);
    });
    return unsubscribe;
  }, []);

  const newReports = reports.filter((r) => (r.status || 'submitted') === 'submitted');
  const verifiedReports = reports.filter((r) => r.status && r.status !== 'submitted');
  const activeCount = reports.filter((r) => ['verified', 'forwarded'].includes(r.status)).length;
  const matchedCount = reports.filter((r) => r.status === 'resolved').length;
  const pendingCount = newReports.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>TraceNet — Barangay</Text>
            <Text style={styles.headerSub}>
              {auth.currentUser?.displayName || 'Officer'}
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.statsCaption}>ALL REPORTS</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{matchedCount}</Text>
            <Text style={styles.statLabel}>Matched</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.segmented}>
          {['New Reports', 'Verified'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segmentBtn, tab === t && styles.segmentBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'New Reports' ? (
          newReports.length === 0 ? (
            <Text style={styles.empty}>No new reports.</Text>
          ) : (
            newReports.map((r) => (
              <View key={r.id} style={styles.reportCard}>
                <View style={styles.reportTop}>
                  <Text style={styles.reportName}>{r.name}{r.age ? `, ${r.age}` : ''}</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                </View>
                <Text style={styles.reportSub}>{r.location}</Text>
                <TouchableOpacity
                  onPress={() => router.push(`/verify-report?id=${r.id}`)}
                  style={styles.verifyLink}
                >
                  <Text style={styles.verifyLinkText}>Verify Report →</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (
          verifiedReports.length === 0 ? (
            <Text style={styles.empty}>No verified reports yet.</Text>
          ) : (
            verifiedReports.map((r) => (
              <View key={r.id} style={styles.reportCard}>
                <View style={styles.reportTop}>
                  <Text style={styles.reportName}>{r.name}{r.age ? `, ${r.age}` : ''}</Text>
                </View>
                <Text style={styles.reportSub}>{r.location} • {r.status}</Text>
              </View>
            ))
          )
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <View style={styles.bottomNavItem}>
          <Text style={styles.bottomNavIcon}>🏠</Text>
          <Text style={styles.bottomNavLabel}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.bottomNavItem}
          onPress={() => signOut(auth).then(() => router.replace('/'))}
        >
          <Text style={styles.bottomNavIcon}>🚪</Text>
          <Text style={[styles.bottomNavLabel, { color: Colors.danger }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.navy,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.white, letterSpacing: 0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(46,204,113,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  liveText: { fontSize: 10, fontWeight: '800', color: Colors.success, letterSpacing: 0.5 },
  scroll: { padding: 16, paddingBottom: 32 },
  statsCaption: { fontSize: 11, fontWeight: '700', color: Colors.textGray, letterSpacing: 0.5, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.textDark },
  statLabel: { fontSize: 11, color: Colors.textGray, marginTop: 2, fontWeight: '600' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    elevation: 1,
  },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '700', color: Colors.textGray },
  segmentTextActive: { color: Colors.white },
  reportCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  reportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  newBadge: { backgroundColor: '#FFF3CD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#8A6D1D' },
  reportSub: { fontSize: 12, color: Colors.textGray, marginTop: 4 },
  verifyLink: { marginTop: 10 },
  verifyLinkText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  empty: { textAlign: 'center', color: Colors.textGray, marginBottom: 16, fontSize: 13 },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingBottom: 16,
  },
  bottomNavItem: { alignItems: 'center' },
  bottomNavIcon: { fontSize: 20 },
  bottomNavLabel: { fontSize: 10, color: Colors.primary, fontWeight: '700', marginTop: 2 },
});
