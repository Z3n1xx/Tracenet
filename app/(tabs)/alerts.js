import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Colors from '../../constants/colors';

const SAMPLE_ALERTS = [
  {
    id: '1',
    type: 'AI Match',
    title: 'Possible match found — Juan Dela Cruz',
    detail: 'AI detected 87% facial similarity between report #001 and a sighting near Carbon Market.',
    time: '2 hours ago',
    read: false,
    severity: 'high',
  },
  {
    id: '2',
    type: 'New Report',
    title: 'New missing person report submitted',
    detail: 'Maria Santos, 16, last seen at SM City Cebu North Wing.',
    time: '5 hours ago',
    read: false,
    severity: 'medium',
  },
  {
    id: '3',
    type: 'Police Update',
    title: 'Carlos Reyes — status updated to FOUND',
    detail: 'Officer Cruz confirmed recovery. Case #003 closed.',
    time: 'Yesterday',
    read: true,
    severity: 'low',
  },
  {
    id: '4',
    type: 'Community',
    title: 'New sighting reported near Colon Street',
    detail: 'A community member reported a sighting matching Juan Dela Cruz near Colon and Osmena Blvd.',
    time: 'Yesterday',
    read: true,
    severity: 'medium',
  },
];

const SEVERITY_COLORS = {
  high: Colors.danger,
  medium: Colors.warning,
  low: Colors.success,
};

const TYPE_COLORS = {
  'AI Match': '#7C3AED',
  'New Report': Colors.accent,
  'Police Update': Colors.primary,
  'Community': Colors.success,
};

function AlertCard({ item, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => onPress(item.id)}
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
  const [alerts, setAlerts] = useState(SAMPLE_ALERTS);
  const [filter, setFilter] = useState('All');

  const unreadCount = alerts.filter((a) => !a.read).length;

  function markRead(id) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  }

  function markAllRead() {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }

  const types = ['All', 'AI Match', 'New Report', 'Police Update', 'Community'];
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
