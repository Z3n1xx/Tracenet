import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Colors from '../../constants/colors';

const STATUS_META = {
  submitted: { type: 'New Report', severity: 'medium', verb: 'submitted a new report' },
  verified: { type: 'Verified', severity: 'medium', verb: "'s report was verified by the barangay" },
  forwarded: { type: 'Forwarded', severity: 'high', verb: "'s case was forwarded to CCPO" },
  resolved: { type: 'Resolved', severity: 'low', verb: "'s case was resolved" },
};

const SEVERITY_COLORS = {
  high: Colors.danger,
  medium: Colors.warning,
  low: Colors.success,
};

const TYPE_COLORS = {
  'New Report': Colors.accent,
  'Verified': Colors.primary,
  'Forwarded': '#7C3AED',
  'Resolved': Colors.success,
};

function timeAgo(date) {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AlertCard({ item, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.severityBar, { backgroundColor: SEVERITY_COLORS[item.severity] }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[item.type] + '22' }]}>
            <Text style={[styles.typeText, { color: TYPE_COLORS[item.type] }]}>{item.type}</Text>
          </View>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.detail}>{item.detail}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function AlertsScreen() {
  const [reports, setReports] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setReports(rows);
      },
      (error) => {
        if (error.code !== 'permission-denied') console.warn('Alerts listener error:', error);
      }
    );
    return unsubscribe;
  }, []);

  const alerts = reports.map((r) => {
    const meta = STATUS_META[r.status] || STATUS_META.submitted;
    return {
      id: r.id,
      reportId: r.id,
      type: meta.type,
      severity: meta.severity,
      title: `${r.name}${meta.verb}`,
      detail: `${r.location}${r.reportedByName ? ` • Reported by ${r.reportedByName}` : ''}`,
      time: timeAgo(r.createdAt?.toDate?.()),
      read: readIds.has(r.id),
    };
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  function markRead(item) {
    setReadIds((prev) => new Set(prev).add(item.id));
    router.push(`/case-status?id=${item.reportId}`);
  }

  function markAllRead() {
    setReadIds(new Set(alerts.map((a) => a.id)));
  }

  const types = ['All', 'New Report', 'Verified', 'Forwarded', 'Resolved'];
  const filtered = filter === 'All' ? alerts : alerts.filter((a) => a.type === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Alerts</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={types}
        keyExtractor={(t) => t}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={styles.filterBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterBtn, filter === item && styles.filterBtnActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlertCard item={item} onPress={markRead} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No alerts in this category.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: Colors.primaryLight, marginTop: 4 },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  filterBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 50,
  },
  filterList: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textGray, fontWeight: '600' },
  filterTextActive: { color: Colors.white },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
  },
  cardUnread: { elevation: 4 },
  severityBar: { width: 5 },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: '700' },
  time: { fontSize: 11, color: Colors.textGray },
  title: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  detail: { fontSize: 12, color: Colors.textGray, lineHeight: 17 },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.accent,
    margin: 14, alignSelf: 'flex-start',
  },
  empty: { textAlign: 'center', color: Colors.textGray, marginTop: 40, fontSize: 15 },
});
