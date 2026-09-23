import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import Colors from '../constants/colors';

const DEMO_CASE = {
  id: '2038',
  name: 'Maria Santos',
  age: 34,
  sex: 'Female',
  location: 'Brgy. Labangon',
  reportedByName: 'Juan dela Cruz',
  status: 'verified',
};

const STAGE_ORDER = ['submitted', 'verified', 'forwarded', 'resolved'];

function buildSteps(status) {
  const stageIndex = STAGE_ORDER.indexOf(status);
  return [
    { id: 1, label: 'Report Submitted', status: 'done' },
    { id: 2, label: 'Verified by Barangay', status: stageIndex >= 1 ? 'done' : 'pending' },
    {
      id: 3,
      label: 'AI Matching In Progress',
      status: stageIndex === 1 ? 'active' : stageIndex >= 2 ? 'done' : 'pending',
    },
    {
      id: 4,
      label: 'Forwarded to CCPO',
      status: stageIndex === 2 ? 'active' : stageIndex >= 3 ? 'done' : 'pending',
    },
    { id: 5, label: 'Case Resolved', status: stageIndex >= 3 ? 'done' : 'pending' },
  ];
}

function StepIcon({ status }) {
  if (status === 'done') return <Text style={styles.stepIconDone}>✓</Text>;
  if (status === 'active') return <Text style={styles.stepIconActive}>⟳</Text>;
  return <Text style={styles.stepIconPending}>○</Text>;
}

export default function CaseStatusScreen() {
  const { id } = useLocalSearchParams();
  const [caseData, setCaseData] = useState(id ? null : DEMO_CASE);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'reports', id), (snap) => {
      setLoading(false);
      if (snap.exists()) {
        setCaseData({ id: snap.id, ...snap.data() });
      } else {
        setCaseData(null);
      }
    });
    return unsubscribe;
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!caseData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFound}>Case not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>‹ Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const steps = buildSteps(caseData.status || 'submitted');
  const isActive = caseData.status !== 'resolved';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Case #{caseData.id?.slice(0, 6) || caseData.id}</Text>
        <Text style={styles.headerSub}>{isActive ? 'Active' : 'Resolved'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <Text style={styles.sectionTitle}>Case Progress</Text>
        <View style={styles.stepsCard}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={[
                  styles.stepCircle,
                  step.status === 'done' && styles.stepCircleDone,
                  step.status === 'active' && styles.stepCircleActive,
                ]}>
                  <StepIcon status={step.status} />
                </View>
                {index < steps.length - 1 && (
                  <View style={[
                    styles.stepLine,
                    step.status === 'done' && styles.stepLineDone,
                  ]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepLabel,
                  step.status === 'done' && styles.stepLabelDone,
                  step.status === 'active' && styles.stepLabelActive,
                ]}>
                  {step.label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Case Details */}
        <Text style={styles.sectionTitle}>Case Details</Text>
        <View style={styles.detailsCard}>
          <Text style={styles.detailLine}>
            <Text style={styles.detailLineLabel}>Name: </Text>
            {caseData.name}{caseData.age ? `, ${caseData.age}` : ''}{caseData.sex ? `, ${caseData.sex}` : ''}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailLineLabel}>Last seen: </Text>{caseData.location}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailLineLabel}>Reported by: </Text>{caseData.reportedByName}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailLineLabel}>Status: </Text>{caseData.status || 'submitted'}
          </Text>
        </View>
      </ScrollView>
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
  backBtn: { marginBottom: 6 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepsCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  stepRow: { flexDirection: 'row', marginBottom: 4 },
  stepLeft: { alignItems: 'center', width: 36, marginRight: 12 },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: Colors.success },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepIconDone: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  stepIconActive: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  stepIconPending: { color: Colors.textGray, fontSize: 12 },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
    minHeight: 20,
  },
  stepLineDone: { backgroundColor: Colors.success },
  stepContent: { flex: 1, paddingBottom: 20 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: Colors.textGray },
  stepLabelDone: { color: Colors.textDark, fontWeight: '700' },
  stepLabelActive: { color: Colors.primary, fontWeight: '700' },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  detailLine: { fontSize: 13, color: Colors.textDark, marginBottom: 10, lineHeight: 19 },
  detailLineLabel: { fontWeight: '700', color: Colors.textGray },
});
