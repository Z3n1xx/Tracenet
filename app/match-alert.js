import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import Colors from '../constants/colors';

const MATCH_DATA = {
  confidence: 87,
  missingPerson: {
    name: 'Maria Santos',
    barangay: 'Brgy. Labangon',
    photo: null,
  },
  foundPerson: {
    label: 'Unidentified F.',
    barangay: 'Brgy. Mabolo',
    photo: null,
  },
};

export default function MatchAlertScreen() {
  const { confidence, missingPerson, foundPerson } = MATCH_DATA;
  const fillWidth = `${confidence}%`;

  function handleConfirm() {
    Alert.alert(
      'Match Confirmed',
      'Confirmation notifies family and CCPO.',
      [{ text: 'OK', onPress: () => router.replace('/case-status') }]
    );
  }

  function handleReview() {
    Alert.alert('Sent for Review', 'This match has been flagged for manual review.');
  }

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
                {missingPerson.photo
                  ? <Image source={{ uri: missingPerson.photo }} style={styles.photo} />
                  : <Text style={styles.photoInitial}>👤</Text>
                }
              </View>
              <Text style={styles.photoTag}>MISSING</Text>
              <Text style={styles.photoName}>{missingPerson.name}</Text>
              <Text style={styles.photoSub}>{missingPerson.barangay}</Text>
            </View>

            <Text style={styles.arrow}>↔</Text>

            <View style={styles.photoCard}>
              <View style={[styles.photoBox, styles.photoBoxFound]}>
                {foundPerson.photo
                  ? <Image source={{ uri: foundPerson.photo }} style={styles.photo} />
                  : <Text style={styles.photoInitial}>👤</Text>
                }
              </View>
              <Text style={[styles.photoTag, styles.photoTagFound]}>FOUND</Text>
              <Text style={styles.photoName}>{foundPerson.label}</Text>
              <Text style={styles.photoSub}>{foundPerson.barangay}</Text>
            </View>
          </View>

          <View style={styles.barContainer}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: fillWidth }]} />
            </View>
            <Text style={styles.barLabel}>Match Confidence Score</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <Text style={styles.confirmBtnText}>✓ Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reviewBtn} onPress={handleReview} activeOpacity={0.8}>
              <Text style={styles.reviewBtnText}>🔍 Review</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Text description match: ☑ Age ☑ Gender ☑ Location{'\n'}
          Confirmation notifies family and CCPO.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  footerNote: { fontSize: 11, color: Colors.textGray, textAlign: 'center', lineHeight: 17 },
});
