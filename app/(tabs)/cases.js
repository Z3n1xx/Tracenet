import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Image,
} from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import Colors from '../../constants/colors';

const STATUS_COLORS = {
  submitted: { bg: '#FFF3CD', text: '#8A6D1D', label: 'Submitted' },
  verified: { bg: '#DBEAFE', text: '#1E40AF', label: 'Verified' },
  forwarded: { bg: '#FEE2E2', text: Colors.danger, label: 'Forwarded to CCPO' },
  resolved: { bg: '#DCFCE7', text: Colors.success, label: 'Resolved' },
  cancelled: { bg: '#F1F5F9', text: '#64748B', label: 'Withdrawn' },
};

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
];

export default function CasesScreen() {
  const [cases, setCases] = useState([]);
  const [scope, setScope] = useState('citywide'); // 'citywide' | 'mine'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setCases(rows);
      },
      (error) => {
        if (error.code !== 'permission-denied') console.warn('Cases listener error:', error);
      }
    );
    return unsubscribe;
  }, []);

  const scopedCases = useMemo(() => {
    if (scope === 'mine') {
      return cases.filter((c) => currentUid && c.reportedByUid === currentUid);
    }
    return cases;
  }, [cases, scope, currentUid]);

  const counts = useMemo(() => {
    let active = 0;
    let resolved = 0;
    for (const c of scopedCases) {
      const st = c.status || 'submitted';
      if (st === 'resolved') resolved += 1;
      else if (st !== 'cancelled') active += 1;
    }
    return { all: scopedCases.length, active, resolved };
  }, [scopedCases]);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedCases.filter((item) => {
      const st = item.status || 'submitted';
      if (statusFilter === 'active' && (st === 'resolved' || st === 'cancelled')) return false;
      if (statusFilter === 'resolved' && st !== 'resolved') return false;
      if (!q) return true;
      const haystack = `${item.name || ''} ${item.location || ''} ${item.barangay || ''} ${item.id} ${item.description || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [scopedCases, statusFilter, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Cases Directory</Text>
            <Text style={styles.headerSub}>
              {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} shown
              {scope === 'mine' ? ' • My Reports' : ' • Cebu Citywide'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newReportBtn}
            onPress={() => router.push('/(tabs)/report')}
          >
            <Text style={styles.newReportBtnText}>+ Report</Text>
          </TouchableOpacity>
        </View>

        {/* My Reports / Citywide Scope Toggle (Figure 19) */}
        <View style={styles.scopeSwitch}>
          <TouchableOpacity
            style={[styles.scopeBtn, scope === 'citywide' && styles.scopeBtnActive]}
            onPress={() => setScope('citywide')}
          >
            <Text style={[styles.scopeText, scope === 'citywide' && styles.scopeTextActive]}>
              🌆 Citywide ({cases.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scopeBtn, scope === 'mine' && styles.scopeBtnActive]}
            onPress={() => setScope('mine')}
          >
            <Text style={[styles.scopeText, scope === 'mine' && styles.scopeTextActive]}>
              👤 My Reports ({cases.filter((c) => currentUid && c.reportedByUid === currentUid).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + All / Active / Resolved Filter Tabs */}
      <View style={styles.controlsBar}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, barangay, or case #..."
            placeholderTextColor={Colors.textGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.tabRow}>
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setStatusFilter(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label} ({counts[tab.key]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filteredCases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const status = item.status || 'submitted';
          const statusStyle = STATUS_COLORS[status] ?? STATUS_COLORS.submitted;
          const isMine = currentUid && item.reportedByUid === currentUid;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/case-status?id=${item.id}`)}
              activeOpacity={0.82}
            >
              <View style={styles.cardRow}>
                <View style={styles.thumbBox}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.thumbImg} />
                  ) : (
                    <Text style={styles.thumbFallback}>
                      {item.type === 'sighting' ? '🧍' : '👤'}
                    </Text>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <Text style={styles.typeLabel}>
                      {item.type === 'sighting' ? '🟡 SIGHTING' : '🔴 MISSING'}
                    </Text>
                    {isMine ? (
                      <View style={styles.minePill}>
                        <Text style={styles.minePillText}>YOUR REPORT</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardTop}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name || 'Unidentified Person'}
                      {item.age ? `, ${item.age}` : ''}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detail} numberOfLines={1}>
                    Case #{item.id.slice(0, 6).toUpperCase()} •{' '}
                    {item.barangay ? `Brgy. ${item.barangay}` : item.location}
                  </Text>
                  {item.description ? (
                    <Text style={styles.desc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {scope === 'mine' ? 'No reports filed by you yet' : 'No matching cases found'}
            </Text>
            <Text style={styles.emptySub}>
              {scope === 'mine'
                ? 'Tap "+ Report" above to submit a missing person or sighting report.'
                : 'Try adjusting your search or filter tabs.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.navy,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: Colors.white, letterSpacing: 0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  newReportBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newReportBtnText: { color: Colors.white, fontSize: 12, fontWeight: '800' },

  scopeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  scopeBtnActive: { backgroundColor: Colors.white },
  scopeText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  scopeTextActive: { color: Colors.navy, fontWeight: '800' },

  controlsBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchIcon: { fontSize: 13, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 13, color: Colors.textDark },
  clearSearch: { fontSize: 14, color: Colors.textGray, paddingHorizontal: 4 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textGray },
  tabTextActive: { color: Colors.white },

  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbBox: {
    width: 56,
    height: 66,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbFallback: { fontSize: 24 },
  cardBody: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  typeLabel: { fontSize: 10, fontWeight: '800', color: Colors.textGray, letterSpacing: 0.4 },
  minePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  minePillText: { fontSize: 9, fontWeight: '800', color: Colors.primary },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: { fontSize: 15, fontWeight: '800', color: Colors.textDark, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  detail: { fontSize: 12, color: Colors.textGray, marginTop: 3 },
  desc: { fontSize: 11, color: Colors.textGray, marginTop: 2, fontStyle: 'italic' },

  emptyWrap: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark, marginBottom: 4 },
  emptySub: { fontSize: 12, color: Colors.textGray, textAlign: 'center', lineHeight: 18 },
});
