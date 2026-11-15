import { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Alert, ActivityIndicator, ScrollView, Animated, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  doc, onSnapshot, getDoc, updateDoc, collection,
  getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import Colors from '../constants/colors';
import {
  computeWeightedMatch,
  FISWG_FEATURES,
  FISWG_TIERS,
  recommendFiswgTier,
} from '../services/aiService';

export default function MatchAlertScreen() {
  const { id } = useLocalSearchParams();
  const [match, setMatch] = useState(null);
  const [missingReport, setMissingReport] = useState(null);
  const [sightingReport, setSightingReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const [checkedFeatures, setCheckedFeatures] = useState(['craniofacial', 'ocular', 'marks']);
  const [selectedTier, setSelectedTier] = useState(4);
  const [reviewerNotes, setReviewerNotes] = useState('');

  const faceBarAnim = useRef(new Animated.Value(0)).current;
  const textBarAnim = useRef(new Animated.Value(0)).current;
  const overallBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let unsubscribe = null;

    async function loadFallbackOrSubscribe() {
      if (!id) {
        try {
          const snap = await getDocs(collection(db, 'matches'));
          if (!snap.empty) {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
            const latest = rows[0];
            setMatch(latest);
            const [mSnap, sSnap] = await Promise.all([
              getDoc(doc(db, 'reports', latest.missingReportId)),
              getDoc(doc(db, 'reports', latest.sightingReportId)),
            ]);
            setMissingReport(mSnap.exists() ? { id: mSnap.id, ...mSnap.data() } : null);
            setSightingReport(sSnap.exists() ? { id: sSnap.id, ...sSnap.data() } : null);
          } else {
            setMatch(null);
            setMissingReport(null);
            setSightingReport(null);
          }
        } catch {
          setMatch(null);
          setMissingReport(null);
          setSightingReport(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      unsubscribe = onSnapshot(
        doc(db, 'matches', id),
        async (snap) => {
          if (!snap.exists()) {
            setMatch(null);
            setMissingReport(null);
            setSightingReport(null);
            setLoading(false);
            return;
          }
          const data = { id: snap.id, ...snap.data() };
          setMatch(data);
          const [missingSnap, sightingSnap] = await Promise.all([
            getDoc(doc(db, 'reports', data.missingReportId)),
            getDoc(doc(db, 'reports', data.sightingReportId)),
          ]);
          setMissingReport(
            missingSnap.exists() ? { id: missingSnap.id, ...missingSnap.data() } : null
          );
          setSightingReport(
            sightingSnap.exists() ? { id: sightingSnap.id, ...sightingSnap.data() } : null
          );
          if (data.fiswgTier) setSelectedTier(data.fiswgTier);
          if (Array.isArray(data.fiswgFeatures) && data.fiswgFeatures.length) {
            setCheckedFeatures(data.fiswgFeatures);
          }
          setLoading(false);
        },
        () => {
          setMatch(null);
          setMissingReport(null);
          setSightingReport(null);
          setLoading(false);
        }
      );
    }

    loadFallbackOrSubscribe();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  const activeMissing = missingReport || {};
  const activeSighting = sightingReport || {};

  const computed = useMemo(
    () => computeWeightedMatch(activeMissing, activeSighting, match?.facialScore ?? null),
    [activeMissing, activeSighting, match?.facialScore]
  );

  const facialScore = match?.facialScore ?? computed.facialScore;
  const textScore = match?.textScore ?? computed.textScore;
  const overallConfidence =
    Math.round((0.8 * facialScore + 0.2 * textScore) * 10) / 10;
  const matchedAttributes =
    match?.matchedAttributes?.length ? match.matchedAttributes : computed.matchedAttributes;

  useEffect(() => {
    if (!loading) {
      const recTier = match?.fiswgTier || recommendFiswgTier(overallConfidence).tier;
      setSelectedTier(recTier);

      Animated.parallel([
        Animated.timing(faceBarAnim, {
          toValue: Math.min(100, facialScore),
          duration: 650,
          useNativeDriver: false,
        }),
        Animated.timing(textBarAnim, {
          toValue: Math.min(100, textScore),
          duration: 650,
          useNativeDriver: false,
        }),
        Animated.timing(overallBarAnim, {
          toValue: Math.min(100, overallConfidence),
          duration: 750,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [loading, facialScore, textScore, overallConfidence]);

  function toggleFeature(featureId) {
    setCheckedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    );
  }

  async function handleConfirm() {
    setActing(true);
    try {
      if (match?.id && !match.id.startsWith('demo-')) {
        await updateDoc(doc(db, 'matches', match.id), {
          status: 'confirmed',
          fiswgTier: selectedTier,
          fiswgFeatures: checkedFeatures,
          reviewerNotes: reviewerNotes.trim(),
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || null,
        });
      }
      Alert.alert(
        'Match Confirmed ✓',
        `Match confirmed (${overallConfidence.toFixed(1)}% confidence). Family, Barangay Responders, and CCPO have been notified.`,
        [
          {
            text: 'View Case Timeline',
            onPress: () =>
              router.replace(
                activeMissing.id && !activeMissing.id.startsWith('demo-')
                  ? `/case-status?id=${activeMissing.id}`
                  : '/(tabs)/cases'
              ),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to confirm match. Please try again.');
    } finally {
      setActing(false);
    }
  }

  async function handleReview() {
    setActing(true);
    try {
      if (match?.id && !match.id.startsWith('demo-')) {
        await updateDoc(doc(db, 'matches', match.id), {
          status: 'needs_review',
          fiswgTier: selectedTier,
          fiswgFeatures: checkedFeatures,
          reviewerNotes: reviewerNotes.trim(),
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || null,
        });
      }
      Alert.alert(
        'Flagged for Manual Review',
        'This candidate match has been forwarded to Barangay & CCPO investigators for manual verification.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'Failed to flag match. Please try again.');
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

  if (!match || !missingReport || !sightingReport) {
    return (
      <View style={[styles.container, styles.centered, { padding: 24 }]}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.textDark, marginBottom: 6 }}>
          No AI Match Alert Found
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textGray, textAlign: 'center', marginBottom: 16 }}>
          When a missing person report and a sighting match via the 80/20 AI engine, it will appear here.
        </Text>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/alerts'))}
          style={{ backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 }}
        >
          <Text style={{ color: Colors.white, fontWeight: '700' }}>‹ Back to Alerts</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = !match?.status || match.status === 'pending';
  const activeTierObj = FISWG_TIERS.find((t) => t.tier === selectedTier) || FISWG_TIERS[3];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/alerts'))}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>AI Match Alert</Text>
            <Text style={styles.headerSub}>
              80% Facial Recognition (FaceNet) + 20% NLP Text Similarity (spaCy)
            </Text>
          </View>
          <View style={styles.confidencePill}>
            <Text style={styles.confidencePillText}>{overallConfidence.toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.pipelineRow}>
            <View style={styles.pipelineBadge}>
              <Text style={styles.pipelineBadgeText}>✨ 80/20 MULTIMODAL AI PIPELINE</Text>
            </View>
            <Text style={styles.matchIdText}>
              ID #{match?.id ? match.id.slice(-4).toUpperCase() : '101'}
            </Text>
          </View>

          <Text style={styles.cardTitle}>
            🤖 AI Candidate Match — {overallConfidence.toFixed(1)}% Confidence
          </Text>

          <View style={styles.photoRow}>
            <View style={styles.photoCard}>
              <View style={styles.photoBox}>
                {activeMissing.photoUrl ? (
                  <Image source={{ uri: activeMissing.photoUrl }} style={styles.photo} />
                ) : (
                  <Text style={styles.photoInitial}>👤</Text>
                )}
              </View>
              <View style={styles.missingTagBadge}>
                <Text style={styles.photoTag}>MISSING REPORT</Text>
              </View>
              <Text style={styles.photoName} numberOfLines={1}>
                {activeMissing.name}
              </Text>
              <Text style={styles.photoMeta}>
                {activeMissing.age ? `${activeMissing.age} yrs` : 'Age N/A'}
                {activeMissing.sex ? ` • ${activeMissing.sex}` : ''}
              </Text>
              <Text style={styles.photoSub} numberOfLines={2}>
                📍 {activeMissing.location}
              </Text>
            </View>

            <View style={styles.arrowCircle}>
              <Text style={styles.arrow}>↔</Text>
            </View>

            <View style={styles.photoCard}>
              <View style={[styles.photoBox, styles.photoBoxFound]}>
                {activeSighting.photoUrl ? (
                  <Image source={{ uri: activeSighting.photoUrl }} style={styles.photo} />
                ) : (
                  <Text style={styles.photoInitial}>👤</Text>
                )}
              </View>
              <View style={[styles.missingTagBadge, styles.foundTagBadge]}>
                <Text style={[styles.photoTag, styles.photoTagFound]}>SIGHTING / FOUND</Text>
              </View>
              <Text style={styles.photoName} numberOfLines={1}>
                {activeSighting.name || 'Unidentified Person'}
              </Text>
              <Text style={styles.photoMeta}>
                {activeSighting.age ? `~${activeSighting.age} yrs` : 'Sighting'}
                {activeSighting.sex ? ` • ${activeSighting.sex}` : ''}
              </Text>
              <Text style={styles.photoSub} numberOfLines={2}>
                📍 {activeSighting.location}
              </Text>
            </View>
          </View>

          <View style={styles.breakdownBox}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownTitle}>80/20 SIMILARITY BREAKDOWN</Text>
              <Text style={styles.formulaChip}>0.80 × Face + 0.20 × Text</Text>
            </View>

            <View style={styles.metricBlock}>
              <View style={styles.metricLabelRow}>
                <View style={styles.metricLeft}>
                  <Text style={styles.metricLabel}>📸 Facial Recognition</Text>
                  <View style={styles.weightTagTeal}>
                    <Text style={styles.weightTagTealText}>80% Weight</Text>
                  </View>
                </View>
                <Text style={styles.metricValueTeal}>
                  {facialScore.toFixed(1)}%{' '}
                  <Text style={styles.ptsSub}>({(facialScore * 0.8).toFixed(1)} pts)</Text>
                </Text>
              </View>
              <View style={styles.barTrack}>
                <Animated.View
                  style={[
                    styles.barFillTeal,
                    {
                      width: faceBarAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.metricBlock}>
              <View style={styles.metricLabelRow}>
                <View style={styles.metricLeft}>
                  <Text style={styles.metricLabel}>📝 Text Description</Text>
                  <View style={styles.weightTagBlue}>
                    <Text style={styles.weightTagBlueText}>20% Weight</Text>
                  </View>
                </View>
                <Text style={styles.metricValueBlue}>
                  {textScore.toFixed(1)}%{' '}
                  <Text style={styles.ptsSub}>({(textScore * 0.2).toFixed(1)} pts)</Text>
                </Text>
              </View>
              <View style={styles.barTrack}>
                <Animated.View
                  style={[
                    styles.barFillBlue,
                    {
                      width: textBarAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.aggregateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aggregateTitle}>Weighted Match Confidence</Text>
                <Text style={styles.aggregateFormula}>
                  0.80 × {facialScore.toFixed(1)}% + 0.20 × {textScore.toFixed(1)}% ={' '}
                  {overallConfidence.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.aggregateScore}>{overallConfidence.toFixed(1)}%</Text>
            </View>
          </View>

          <Text style={styles.attrSectionLabel}>Corroborated Physical & Contextual Attributes</Text>
          <View style={styles.attrWrap}>
            {matchedAttributes.map((attr, idx) => (
              <View key={idx} style={styles.attrBadge}>
                <Text style={styles.attrBadgeText}>{attr}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.fiswgHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fiswgTitle}>FISWG Morphological Verification</Text>
              <Text style={styles.fiswgSub}>
                Select anatomical & apparel features observed in both photos before confirming.
              </Text>
            </View>
            <View
              style={[
                styles.tierBadge,
                { backgroundColor: activeTierObj.bg, borderColor: activeTierObj.color },
              ]}
            >
              <Text style={[styles.tierBadgeText, { color: activeTierObj.color }]}>
                Tier {activeTierObj.tier}
              </Text>
            </View>
          </View>

          {FISWG_FEATURES.map((feat) => {
            const checked = checkedFeatures.includes(feat.id);
            return (
              <TouchableOpacity
                key={feat.id}
                style={[styles.featureRow, checked && styles.featureRowActive]}
                onPress={() => toggleFeature(feat.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureLabel}>{feat.label}</Text>
                  <Text style={styles.featureHint}>{feat.hint}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.attrSectionLabel, { marginTop: 12 }]}>
            Verification Notes (Optional)
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add clothing, landmark, or sighting verification notes..."
            placeholderTextColor={Colors.textGray}
            value={reviewerNotes}
            onChangeText={setReviewerNotes}
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.confirmBtn, (acting || !isPending) && styles.btnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.85}
              disabled={acting || !isPending}
            >
              <Text style={styles.confirmBtnText}>
                {acting ? 'Saving...' : '✓ Confirm Match'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewBtn, (acting || !isPending) && styles.btnDisabled]}
              onPress={handleReview}
              activeOpacity={0.85}
              disabled={acting || !isPending}
            >
              <Text style={styles.reviewBtnText}>🔍 Flag for Review</Text>
            </TouchableOpacity>
          </View>

          {!isPending && (
            <View style={styles.statusBanner}>
              <Text style={styles.statusNote}>
                Status: {match.status === 'confirmed' ? '✓ Match Confirmed' : '🔍 Flagged for Review'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.privacyFooter}>
          <Text style={styles.footerNote}>
            🔒 RA 10173 Data Privacy Notice: Confirmation notifies the reporting family, Barangay
            Responders, and CCPO. Biometric vectors are used strictly for missing-person recovery.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 8, alignSelf: 'flex-start' },
  backText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitle: { fontSize: 21, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  confidencePill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidencePillText: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
  },
  pipelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pipelineBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pipelineBadgeText: { fontSize: 10, fontWeight: '800', color: '#0F766E', letterSpacing: 0.4 },
  matchIdText: { fontSize: 11, color: Colors.textGray, fontWeight: '700' },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  photoCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoBox: {
    width: 82,
    height: 94,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  photoBoxFound: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  photo: { width: '100%', height: '100%' },
  photoInitial: { fontSize: 32 },
  missingTagBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  foundTagBadge: { backgroundColor: '#FEF3C7' },
  photoTag: { fontSize: 9, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  photoTagFound: { color: '#B45309' },
  photoName: { fontSize: 13, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  photoMeta: { fontSize: 11, color: Colors.textGray, fontWeight: '600', marginTop: 1 },
  photoSub: { fontSize: 10, color: Colors.textGray, textAlign: 'center', marginTop: 3 },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  arrow: { fontSize: 16, color: Colors.primary, fontWeight: '800' },

  breakdownBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitle: { fontSize: 10, fontWeight: '800', color: Colors.textGray, letterSpacing: 0.5 },
  formulaChip: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textDark,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricBlock: { marginBottom: 12 },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  metricLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  weightTagTeal: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  weightTagTealText: { fontSize: 9, fontWeight: '800', color: '#0F766E' },
  weightTagBlue: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  weightTagBlueText: { fontSize: 9, fontWeight: '800', color: Colors.primary },
  metricValueTeal: { fontSize: 12, fontWeight: '800', color: '#0F766E' },
  metricValueBlue: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  ptsSub: { fontSize: 10, color: Colors.textGray, fontWeight: '600' },
  barTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFillTeal: { height: '100%', backgroundColor: '#14B8A6', borderRadius: 4 },
  barFillBlue: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  aggregateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  aggregateTitle: { fontSize: 12, fontWeight: '800', color: Colors.textDark },
  aggregateFormula: { fontSize: 10, color: Colors.textGray, marginTop: 2 },
  aggregateScore: { fontSize: 18, fontWeight: '800', color: Colors.primary },

  attrSectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark, marginBottom: 8 },
  attrWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  attrBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  attrBadgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },

  fiswgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  fiswgTitle: { fontSize: 15, fontWeight: '800', color: Colors.textDark },
  fiswgSub: { fontSize: 11, color: Colors.textGray, marginTop: 2, lineHeight: 15 },
  tierBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: { fontSize: 11, fontWeight: '800' },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  featureRowActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.textGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxMark: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  featureLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  featureHint: { fontSize: 10, color: Colors.textGray, marginTop: 1 },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 11,
    fontSize: 13,
    color: Colors.textDark,
    backgroundColor: Colors.background,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  actions: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  reviewBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  reviewBtnText: { color: Colors.textDark, fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  statusBanner: {
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  statusNote: { fontSize: 12, color: Colors.textDark, textAlign: 'center', fontWeight: '700' },
  privacyFooter: { paddingHorizontal: 6 },
  footerNote: { fontSize: 11, color: Colors.textGray, textAlign: 'center', lineHeight: 16 },
});
