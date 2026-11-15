import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Colors from '../../constants/colors';

const STATUS_META = {
  submitted: { type: 'New Report', severity: 'medium', verb: ' submitted a missing person report' },
  verified: { type: 'Verified', severity: 'medium', verb: "'s report was verified by Barangay Responders" },
  forwarded: { type: 'Forwarded', severity: 'high', verb: "'s case was escalated & forwarded to CCPO" },
  resolved: { type: 'Resolved', severity: 'low', verb: "'s case was marked resolved" },
};

const SEVERITY_COLORS = {
  critical: '#0D9488',
  high: Colors.danger,
  medium: Colors.warning,
  low: Colors.success,
};

const TYPE_COLORS = {
  'AI Match': '#0F766E',
  'New Report': Colors.accent,
  'Verified': Colors.primary,
  'Forwarded': '#7C3AED',
  'Resolved': Colors.success,
};

function timeAgo(date) {
  if (!date) return 'Just now';
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
  const isAiMatch = item.type === 'AI Match';
  return (
    <TouchableOpacity
      style={[
        styles.card,
        !item.read && styles.cardUnread,
        isAiMatch && styles.cardAiMatch,
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.82}
    >
      <View
        style={[
          styles.severityBar,
          { backgroundColor: SEVERITY_COLORS[item.severity] || Colors.primary },
        ]}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.badgeGroup}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: (TYPE_COLORS[item.type] || Colors.primary) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: TYPE_COLORS[item.type] || Colors.primary },
                ]}
              >
                {isAiMatch ? '🤖 AI Match Alert' : item.type}
              </Text>
            </View>
            {item.confidence ? (
              <View style={styles.confBadge}>
                <Text style={styles.confBadgeText}>{item.confidence}% Match</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.detail}>{item.detail}</Text>
        {isAiMatch && (
          <View style={styles.aiActionRow}>
            <Text style={styles.aiActionLink}>View 80/20 Similarity Breakdown →</Text>
          </View>
        )}
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function AlertsScreen() {
  const [reports, setReports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const unsubReports = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setReports(rows);
      },
      (error) => {
        if (error.code !== 'permission-denied') console.warn('Alerts reports listener error:', error);
      }
    );

    const unsubMatches = onSnapshot(
      collection(db, 'matches'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setMatches(rows);
      },
      (error) => {
        if (error.code !== 'permission-denied') console.warn('Alerts matches listener error:', error);
      }
    );

    return () => {
      unsubReports();
      unsubMatches();
    };
  }, []);

  const alerts = useMemo(() => {
    const reportMap = new Map(reports.map((r) => [r.id, r]));

    // 1. Live AI Match Alerts from `matches` collection
    const matchAlerts = matches.map((m) => {
      const missing = reportMap.get(m.missingReportId);
      const sighting = reportMap.get(m.sightingReportId);
      const conf = Number(m.confidence ?? 87.8).toFixed(1);
      const mName = missing?.name || 'Missing Person';
      const sLoc = sighting?.location || 'Cebu City';
      return {
        id: `match-${m.id}`,
        matchId: m.id,
        reportId: m.missingReportId,
        type: 'AI Match',
        severity: 'critical',
        confidence: conf,
        title: `Potential AI Match Found for ${mName}`,
        detail: `${conf}% weighted confidence (80% Facial + 20% Text) • Sighted near ${sLoc}`,
        time: timeAgo(m.createdAt?.toDate?.()),
        timestampMs: m.createdAt?.toMillis?.() ?? Date.now(),
        read: readIds.has(`match-${m.id}`),
      };
    });

    // If no live match docs exist yet, include the canonical Manuscript Figure 18 demo match alert
    if (matchAlerts.length === 0) {
      matchAlerts.push({
        id: 'match-demo-101',
        matchId: '',
        reportId: '',
        type: 'AI Match',
        severity: 'critical',
        confidence: '87.8',
        title: 'Potential AI Match Found for Maria Santos (#2038)',
        detail:
          '87.8% weighted confidence (88.5% Facial + 85.2% Text) • Sighted at Brgy. Mabolo, Cebu City',
        time: 'Active Demo',
        timestampMs: Date.now() + 1000,
        read: readIds.has('match-demo-101'),
      });
    }

    // 2. Case Status & Activity Alerts from `reports` collection
    const reportAlerts = reports.map((r) => {
      const meta = STATUS_META[r.status] || STATUS_META.submitted;
      return {
        id: `report-${r.id}`,
        reportId: r.id,
        type: meta.type,
        severity: meta.severity,
        title: `${r.name || 'Unidentified Person'}${meta.verb}`,
        detail: `${r.location || 'Cebu City'}${r.reportedByName ? ` • Reported by ${r.reportedByName}` : ''}`,
        time: timeAgo(r.createdAt?.toDate?.()),
        timestampMs: r.createdAt?.toMillis?.() ?? 0,
        read: readIds.has(`report-${r.id}`),
      };
    });

    return [...matchAlerts, ...reportAlerts].sort((a, b) => b.timestampMs - a.timestampMs);
  }, [reports, matches, readIds]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  function handlePressAlert(item) {
    setReadIds((prev) => new Set(prev).add(item.id));
    if (item.type === 'AI Match') {
      router.push(item.matchId ? `/match-alert?id=${item.matchId}` : '/match-alert');
    } else {
      router.push(`/case-status?id=${item.reportId}`);
    }
  }

  function markAllRead() {
    setReadIds(new Set(alerts.map((a) => a.id)));
  }

  const types = ['All', 'AI Match', 'New Report', 'Verified', 'Forwarded', 'Resolved'];
  const filtered = filter === 'All' ? alerts : alerts.filter((a) => a.type === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Alerts & AI Matches</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up in Cebu City'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.aiShortcutBtn}
              onPress={() => router.push('/match-alert')}
            >
              <Text style={styles.aiShortcutText}>🤖 80/20 Match</Text>
            </TouchableOpacity>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                <Text style={styles.markAllText}>Mark read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={styles.filterBar}
      >
        {types.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filterBtn, filter === item && styles.filterBtnActive]}
            onPress={() => setFilter(item)}
          >
            <Text
              style={[styles.filterText, filter === item && styles.filterTextActive]}
              numberOfLines={1}
            >
              {item === 'AI Match' ? '🤖 AI Match' : item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlertCard item={item} onPress={handlePressAlert} />}
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
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: Colors.primaryLight, marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiShortcutBtn: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  aiShortcutText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  filterBar: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterList: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterBtn: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textGray, fontWeight: '600' },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardUnread: { elevation: 3 },
  cardAiMatch: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  severityBar: { width: 5 },
  cardContent: { flex: 1, padding: 14 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: '800' },
  confBadge: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  time: { fontSize: 11, color: Colors.textGray },
  title: { fontSize: 14, fontWeight: '800', color: Colors.textDark, marginBottom: 4 },
  detail: { fontSize: 12, color: Colors.textGray, lineHeight: 17 },
  aiActionRow: { marginTop: 8 },
  aiActionLink: { fontSize: 11, fontWeight: '800', color: '#0F766E' },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    margin: 14,
    alignSelf: 'flex-start',
  },
  empty: { textAlign: 'center', color: Colors.textGray, marginTop: 40, fontSize: 15 },
});
