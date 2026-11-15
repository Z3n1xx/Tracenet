import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Modal, TextInput, Alert, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Colors from '../constants/colors';
import { inferBarangay } from '../constants/barangays';

const DEMO_CASE = {
  id: '2038',
  type: 'missing',
  name: 'Maria Santos',
  age: 34,
  sex: 'Female',
  barangay: 'Labangon',
  location: 'Brgy. Labangon, Cebu City',
  description: 'White blouse, blue jeans, wearing eyeglasses',
  reportedByName: 'Juan dela Cruz',
  status: 'verified',
};

const STAGE_ORDER = ['submitted', 'verified', 'forwarded', 'resolved'];

const CANCEL_REASONS = [
  'Person Returned Home Safely',
  'Located by Family / Relatives',
  'Duplicate Report Submission',
  'Other Reason',
];

function buildSteps(status) {
  const stageIndex = STAGE_ORDER.indexOf(status);
  return [
    { id: 1, label: 'Report Submitted', sub: 'Logged in TraceNet & assigned to Barangay Desk', status: 'done' },
    {
      id: 2,
      label: 'Verified by Barangay',
      sub: 'Barangay Responder validation',
      status: stageIndex >= 1 ? 'done' : 'pending',
    },
    {
      id: 3,
      label: '80/20 AI Matching In Progress',
      sub: 'Scanning Cebu City sightings (80% Facial + 20% Text)',
      status: stageIndex === 1 ? 'active' : stageIndex >= 2 ? 'done' : 'pending',
    },
    {
      id: 4,
      label: 'Forwarded to CCPO',
      sub: 'Escalated to Cebu City Police Office',
      status: stageIndex === 2 ? 'active' : stageIndex >= 3 ? 'done' : 'pending',
    },
    {
      id: 5,
      label: 'Case Resolved',
      sub: 'Person safely accounted for & case closed',
      status: stageIndex >= 3 ? 'done' : 'pending',
    },
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
  const [acting, setActing] = useState(false);

  // Edit Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCircumstances, setEditCircumstances] = useState('');
  const [editContact, setEditContact] = useState('');

  // Cancel / Withdraw Modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(
      doc(db, 'reports', id),
      (snap) => {
        setLoading(false);
        if (snap.exists()) {
          setCaseData({ id: snap.id, ...snap.data() });
        } else {
          setCaseData(null);
        }
      },
      (error) => {
        setLoading(false);
        if (error.code !== 'permission-denied') console.warn('Case status listener error:', error);
      }
    );
    return unsubscribe;
  }, [id]);

  function openEditModal() {
    if (!caseData) return;
    setEditName(caseData.name || '');
    setEditAge(caseData.age ? String(caseData.age) : '');
    setEditLocation(caseData.location || '');
    setEditDescription(caseData.description || '');
    setEditCircumstances(caseData.circumstances || '');
    setEditContact(caseData.reporterContact || '');
    setEditModalVisible(true);
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !editLocation.trim()) {
      Alert.alert('Required Fields', 'Name and location cannot be empty.');
      return;
    }
    setActing(true);
    try {
      const inferredBrgy = inferBarangay({
        location: editLocation.trim(),
        latitude: caseData.latitude,
        longitude: caseData.longitude,
      });
      await updateDoc(doc(db, 'reports', caseData.id), {
        name: editName.trim(),
        age: editAge ? Number(editAge) : null,
        location: editLocation.trim(),
        barangay: inferredBrgy || caseData.barangay || null,
        description: editDescription.trim(),
        circumstances: editCircumstances.trim(),
        reporterContact: editContact.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditModalVisible(false);
      Alert.alert('Report Updated ✓', 'Your case details have been saved.');
    } catch {
      Alert.alert('Error', 'Could not update report. Please try again.');
    } finally {
      setActing(false);
    }
  }

  function handleEscalateToCCPO() {
    Alert.alert(
      'Escalate Directly to CCPO?',
      'This will immediately forward your report to the Cebu City Police Office (CCPO) Missing Persons Desk for urgent intervention.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate Now',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            try {
              await updateDoc(doc(db, 'reports', caseData.id), {
                status: 'forwarded',
                escalatedByCitizen: true,
                escalatedAt: serverTimestamp(),
                escalationNote: 'Escalated directly to CCPO by reporting citizen',
              });
              Alert.alert(
                'Escalated to CCPO ✓',
                'Your case has been forwarded to the Cebu City Police Office Command Center.'
              );
            } catch {
              Alert.alert('Error', 'Failed to escalate report. Please try again.');
            } finally {
              setActing(false);
            }
          },
        },
      ]
    );
  }

  async function handleConfirmCancel() {
    const finalReason =
      selectedReason === 'Other Reason'
        ? customReason.trim() || 'Withdrawn by citizen'
        : customReason.trim()
        ? `${selectedReason} — ${customReason.trim()}`
        : selectedReason;

    setActing(true);
    try {
      await updateDoc(doc(db, 'reports', caseData.id), {
        status: 'cancelled',
        cancellationReason: finalReason,
        cancelledAt: serverTimestamp(),
        cancelledBy: auth.currentUser?.uid || null,
      });
      setCancelModalVisible(false);
      Alert.alert('Report Withdrawn', 'Your report has been marked as withdrawn/cancelled.');
    } catch {
      Alert.alert('Error', 'Failed to withdraw report. Please try again.');
    } finally {
      setActing(false);
    }
  }

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

  const currentStatus = caseData.status || 'submitted';
  const isCancelled = currentStatus === 'cancelled';
  const isResolved = currentStatus === 'resolved';
  const isActive = !isResolved && !isCancelled;
  const isOwner =
    Boolean(auth.currentUser?.uid) && caseData.reportedByUid === auth.currentUser.uid;
  const canEscalate = isOwner && isActive && currentStatus !== 'forwarded';
  const steps = buildSteps(currentStatus);

  return (
    <View style={styles.container}>
      <View style={[styles.header, isCancelled && styles.headerCancelled]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/cases'))}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>
              Case #{caseData.id?.slice(0, 6).toUpperCase() || caseData.id}
            </Text>
            <Text style={styles.headerSub}>
              {isCancelled
                ? 'Withdrawn / Cancelled'
                : isResolved
                ? 'Case Resolved'
                : currentStatus === 'forwarded'
                ? 'Escalated to CCPO'
                : 'Active Investigation'}
            </Text>
          </View>
          <View style={styles.statusBadgeHeader}>
            <Text style={styles.statusBadgeHeaderText}>{currentStatus.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Cancelled Banner */}
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledTitle}>✕ Report Withdrawn</Text>
            <Text style={styles.cancelledBody}>
              Reason: {caseData.cancellationReason || 'Withdrawn by reporter'}
            </Text>
          </View>
        )}

        {/* Escalated to CCPO Banner */}
        {currentStatus === 'forwarded' && (
          <View style={styles.ccpoBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ccpoTitle}>🚨 Forwarded to CCPO Command Center</Text>
              <Text style={styles.ccpoSub}>
                Cebu City Police Office Missing Persons Desk has access to this report.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.callCcpoBtn}
              onPress={() => Linking.openURL('tel:0322336793')}
            >
              <Text style={styles.callCcpoText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Timeline */}
        {!isCancelled && (
          <>
            <Text style={styles.sectionTitle}>Case Progress Timeline</Text>
            <View style={styles.stepsCard}>
              {steps.map((step, index) => (
                <View key={step.id} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View
                      style={[
                        styles.stepCircle,
                        step.status === 'done' && styles.stepCircleDone,
                        step.status === 'active' && styles.stepCircleActive,
                      ]}
                    >
                      <StepIcon status={step.status} />
                    </View>
                    {index < steps.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          step.status === 'done' && styles.stepLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text
                      style={[
                        styles.stepLabel,
                        step.status === 'done' && styles.stepLabelDone,
                        step.status === 'active' && styles.stepLabelActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={styles.stepSub}>{step.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Case Details Card */}
        <Text style={styles.sectionTitle}>Subject & Report Details</Text>
        <View style={styles.detailsCard}>
          {caseData.photoUrl && (
            <Image source={{ uri: caseData.photoUrl }} style={styles.photo} />
          )}
          <Text style={styles.detailLine}>
            <Text style={styles.detailLineLabel}>Name: </Text>
            {caseData.name}
            {caseData.age ? `, ${caseData.age} yrs` : ''}
            {caseData.sex ? ` (${caseData.sex})` : ''}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailLineLabel}>Barangay: </Text>
            {caseData.barangay ? `Brgy. ${caseData.barangay}, Cebu City` : 'Cebu City'}
          </Text>
          <Text style={styles.detailLine}>
            <Text style={styles.detailLineLabel}>Last Seen Location: </Text>
            {caseData.location}
          </Text>
          {(caseData.lastSeenDate || caseData.lastSeenTime) && (
            <Text style={styles.detailLine}>
              <Text style={styles.detailLineLabel}>Date / Time: </Text>
              {[caseData.lastSeenDate, caseData.lastSeenTime].filter(Boolean).join(' at ')}
            </Text>
          )}
          {caseData.description ? (
            <Text style={styles.detailLine}>
              <Text style={styles.detailLineLabel}>Clothing & Marks: </Text>
              {caseData.description}
            </Text>
          ) : null}
          {caseData.circumstances ? (
            <Text style={styles.detailLine}>
              <Text style={styles.detailLineLabel}>Circumstances: </Text>
              {caseData.circumstances}
            </Text>
          ) : null}
          <Text style={styles.detailLine}>
            <Text style={styles.detailLineLabel}>Reported By: </Text>
            {caseData.reportedByName || 'Citizen Reporter'}
            {caseData.reporterContact ? ` (${caseData.reporterContact})` : ''}
          </Text>
        </View>

        {/* Community Action for active missing cases */}
        {isActive && caseData.type !== 'sighting' && (
          <TouchableOpacity
            style={styles.sightingActionBtn}
            onPress={() =>
              router.push(`/(tabs)/report?type=sighting&missingId=${caseData.id}`)
            }
          >
            <Text style={styles.sightingActionText}>
              🧍 Spotted This Person? Submit a Geo-Tagged Sighting
            </Text>
          </TouchableOpacity>
        )}

        {/* Citizen Owner Lifecycle Actions (Figure 19, IT-C5, IT-C9) */}
        {isOwner && isActive && (
          <View style={styles.ownerActionsCard}>
            <Text style={styles.ownerActionsTitle}>Manage Your Report</Text>
            <Text style={styles.ownerActionsSub}>
              Update information, escalate directly to Cebu City Police, or withdraw if found.
            </Text>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={openEditModal}
              disabled={acting}
            >
              <Text style={styles.editBtnText}>✏️ Edit Report Details</Text>
            </TouchableOpacity>

            {canEscalate && (
              <TouchableOpacity
                style={styles.escalateBtn}
                onPress={handleEscalateToCCPO}
                disabled={acting}
              >
                <Text style={styles.escalateBtnText}>🚨 Escalate Directly to CCPO</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => {
                setSelectedReason(CANCEL_REASONS[0]);
                setCustomReason('');
                setCancelModalVisible(true);
              }}
              disabled={acting}
            >
              <Text style={styles.withdrawBtnText}>✕ Withdraw / Cancel Report</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Report Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Report Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={editAge}
                onChangeText={setEditAge}
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Last Known Location *</Text>
              <TextInput
                style={styles.input}
                value={editLocation}
                onChangeText={setEditLocation}
              />

              <Text style={styles.inputLabel}>Clothing & Distinguishing Marks</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
              />

              <Text style={styles.inputLabel}>Circumstances</Text>
              <TextInput
                style={styles.input}
                value={editCircumstances}
                onChangeText={setEditCircumstances}
              />

              <Text style={styles.inputLabel}>Contact Number</Text>
              <TextInput
                style={styles.input}
                value={editContact}
                onChangeText={setEditContact}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.saveModalBtn, acting && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={acting}
              >
                <Text style={styles.saveModalBtnText}>
                  {acting ? 'Saving...' : 'Save Updated Details'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Withdraw / Cancel Report with Reason Modal (IT-C9) */}
      <Modal
        visible={cancelModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Report</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Please select a reason for withdrawing this report so Barangay Responders and CCPO
              can close the record properly.
            </Text>

            {CANCEL_REASONS.map((reason) => {
              const active = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonOption, active && styles.reasonOptionActive]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View style={[styles.radioCircle, active && styles.radioCircleActive]} />
                  <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Found safe at relative's house in Guadalupe"
              placeholderTextColor={Colors.textGray}
              value={customReason}
              onChangeText={setCustomReason}
            />

            <TouchableOpacity
              style={[styles.confirmCancelBtn, acting && { opacity: 0.6 }]}
              onPress={handleConfirmCancel}
              disabled={acting}
            >
              <Text style={styles.confirmCancelText}>
                {acting ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, color: Colors.textGray },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerCancelled: { backgroundColor: '#475569' },
  backBtn: { marginBottom: 6, alignSelf: 'flex-start' },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '700' },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statusBadgeHeader: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeHeaderText: { color: Colors.white, fontSize: 11, fontWeight: '800' },

  scroll: { padding: 16, paddingBottom: 44 },
  cancelledBanner: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  cancelledTitle: { fontSize: 14, fontWeight: '800', color: '#334155' },
  cancelledBody: { fontSize: 12, color: '#475569', marginTop: 4 },

  ccpoBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ccpoTitle: { fontSize: 13, fontWeight: '800', color: '#991B1B' },
  ccpoSub: { fontSize: 11, color: '#7F1D1D', marginTop: 2 },
  callCcpoBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callCcpoText: { color: Colors.white, fontSize: 12, fontWeight: '800' },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepRow: { flexDirection: 'row', marginBottom: 4 },
  stepLeft: { alignItems: 'center', width: 34, marginRight: 12 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: Colors.success },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepIconDone: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  stepIconActive: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  stepIconPending: { color: Colors.textGray, fontSize: 11 },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
    minHeight: 20,
  },
  stepLineDone: { backgroundColor: Colors.success },
  stepContent: { flex: 1, paddingBottom: 16 },
  stepLabel: { fontSize: 14, fontWeight: '700', color: Colors.textGray },
  stepLabelDone: { color: Colors.textDark },
  stepLabelActive: { color: Colors.primary },
  stepSub: { fontSize: 11, color: Colors.textGray, marginTop: 2 },

  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photo: {
    width: 140,
    height: 175,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailLine: { fontSize: 13, color: Colors.textDark, marginBottom: 9, lineHeight: 19 },
  detailLineLabel: { fontWeight: '700', color: Colors.textGray },

  sightingActionBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  sightingActionText: { color: '#92400E', fontSize: 13, fontWeight: '800' },

  ownerActionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  ownerActionsTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  ownerActionsSub: { fontSize: 12, color: Colors.textGray, marginBottom: 4 },
  editBtn: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  editBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  escalateBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  escalateBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '800' },
  withdrawBtn: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  withdrawBtnText: { color: Colors.textGray, fontSize: 13, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark },
  modalCloseText: { fontSize: 16, fontWeight: '800', color: Colors.textGray, padding: 4 },
  modalSub: { fontSize: 12, color: Colors.textGray, marginBottom: 14, lineHeight: 17 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark, marginBottom: 5 },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 12,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  saveModalBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  saveModalBtnText: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  reasonOptionActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.textGray,
  },
  radioCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  reasonText: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  reasonTextActive: { color: Colors.primary, fontWeight: '700' },
  confirmCancelBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  confirmCancelText: { color: Colors.white, fontSize: 14, fontWeight: '800' },
});
