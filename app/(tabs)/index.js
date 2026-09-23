import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import Colors from '../../constants/colors';

export default function HomeScreen() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, 'reports'), where('reportedByUid', '==', uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setCases(rows);
    });
    return unsubscribe;
  }, []);

  const matchingCase = cases.find((c) => c.status === 'verified' || c.status === 'forwarded');
  const verifiedNotifications = cases.filter((c) => c.status && c.status !== 'submitted');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>TraceNet</Text>
          <Text style={styles.headerSub}>Welcome, {auth.currentUser?.displayName || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Text style={styles.bellIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Potential Match Banner */}
        {matchingCase && (
          <TouchableOpacity
            style={styles.matchBanner}
            onPress={() => router.push(`/case-status?id=${matchingCase.id}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.matchBannerIcon}>⚠️</Text>
            <View style={styles.matchBannerText}>
              <Text style={styles.matchBannerTitle}>1 potential match found</Text>
              <Text style={styles.matchBannerSub}>
                Case #{matchingCase.id.slice(0, 6)} — Review now
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/report')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>Report{'\n'}Missing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => router.push('/(tabs)/report')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionIcon}>🧍</Text>
            <Text style={[styles.actionLabel, styles.actionLabelOutline]}>Found{'\n'}Person</Text>
          </TouchableOpacity>
        </View>

        {/* My Active Cases */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>My Active Cases</Text>
        {cases.length === 0 && (
          <Text style={styles.emptyText}>You haven't filed any reports yet.</Text>
        )}
        {cases.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.caseCard}
            onPress={() => router.push(`/case-status?id=${c.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.caseCardTop}>
              <Text style={styles.caseName}>{c.name}{c.age ? `, ${c.age}` : ''}</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>
                  {c.status === 'resolved' ? 'Resolved' : 'Active'}
                </Text>
              </View>
            </View>
            <Text style={styles.caseDetail}>{c.location}</Text>
            <Text style={styles.caseNote}>Status: {c.status || 'submitted'}</Text>
          </TouchableOpacity>
        ))}

        {/* Notifications */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Notifications</Text>
        {verifiedNotifications.length === 0 && (
          <Text style={styles.emptyText}>No notifications yet.</Text>
        )}
        {verifiedNotifications.map((c) => (
          <View key={c.id} style={styles.notifCard}>
            <Text style={styles.notifCheck}>☐</Text>
            <View style={styles.notifContent}>
              <Text style={styles.notifText}>Your report for {c.name} has been {c.status}</Text>
              <Text style={styles.notifTime}>{c.location}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.demoLink}
          onPress={() => router.push('/barangay-dashboard')}
        >
          <Text style={styles.demoLinkText}>Barangay Official View (Demo) →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.demoLink}
          onPress={() => signOut(auth).then(() => router.replace('/'))}
        >
          <Text style={[styles.demoLinkText, { color: Colors.danger }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: Colors.white, letterSpacing: 1 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: { fontSize: 16 },
  scroll: { padding: 16, paddingBottom: 32 },
  matchBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  matchBannerIcon: { fontSize: 20 },
  matchBannerText: { flex: 1 },
  matchBannerTitle: { fontSize: 13, fontWeight: '800', color: '#8A6D1D' },
  matchBannerSub: { fontSize: 12, color: '#8A6D1D', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark, marginBottom: 10 },
  sectionTitleSpaced: { marginTop: 20 },
  emptyText: { fontSize: 13, color: Colors.textGray, marginBottom: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  actionBtnOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  actionIcon: { fontSize: 26, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  actionLabelOutline: { color: Colors.primary },
  caseCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  caseCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caseName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  activeBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.danger },
  caseDetail: { fontSize: 12, color: Colors.textGray, marginTop: 4 },
  caseNote: { fontSize: 11, color: Colors.textGray, marginTop: 4 },
  notifCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    elevation: 1,
  },
  notifCheck: { fontSize: 14, color: Colors.primary },
  notifContent: { flex: 1 },
  notifText: { fontSize: 13, color: Colors.textDark, fontWeight: '500' },
  notifTime: { fontSize: 11, color: Colors.textGray, marginTop: 3 },
  demoLink: { alignItems: 'center', marginTop: 24 },
  demoLinkText: { fontSize: 12, color: Colors.textGray, fontWeight: '600' },
});
