import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Colors from '../../constants/colors';

const STATUS_COLORS = {
  submitted: { bg: '#FFF3CD', text: '#8A6D1D' },
  verified: { bg: '#FEE2E2', text: Colors.danger },
  forwarded: { bg: '#FEE2E2', text: Colors.danger },
  resolved: { bg: '#DCFCE7', text: Colors.success },
};

export default function CasesScreen() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setCases(rows);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cases</Text>
        <Text style={styles.headerSub}>{cases.length} case{cases.length !== 1 ? 's' : ''} on record</Text>
      </View>

      <FlatList
        data={cases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const status = item.status || 'submitted';
          const statusStyle = STATUS_COLORS[status] ?? STATUS_COLORS.submitted;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/case-status?id=${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={styles.name}>{item.name}{item.age ? `, ${item.age}` : ''}</Text>
                <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.badgeText, { color: statusStyle.text }]}>{status}</Text>
                </View>
              </View>
              <Text style={styles.detail}>Case #{item.id.slice(0, 6)} • {item.location}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No cases yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.navy,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: Colors.white, letterSpacing: 1 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  detail: { fontSize: 12, color: Colors.textGray, marginTop: 4 },
  empty: { textAlign: 'center', color: Colors.textGray, marginTop: 40, fontSize: 15 },
});
