import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

const TERMS_TEXT = `TraceNet — Terms and Conditions

1. Purpose
TraceNet is a missing-person reporting and coordination system intended for use by citizens, barangay officials, and the Cebu City Police Office (CCPO) to report, track, and help resolve missing-person cases within Cebu City.

2. Accuracy of Information
By submitting a report, you confirm that the information and photos you provide are true and accurate to the best of your knowledge. Knowingly submitting false, misleading, or fabricated reports is a serious offense and may be referred to barangay or police authorities for appropriate action.

3. Data Privacy
Information you submit, including names, photos, locations, and contact details, will be shared with barangay officials and CCPO personnel solely for the purpose of locating missing persons and verifying reports. Your data will be handled in accordance with the Data Privacy Act of 2012 (RA 10173) and will not be sold or used for unrelated commercial purposes.

4. Use of Photos and AI Matching
Photos submitted for missing-person or sighting reports may be processed using facial-matching technology to help identify potential matches between reports. This processing is used only to assist investigations.

5. Account Responsibility
You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Report any unauthorized use immediately.

6. Limitation of Liability
TraceNet is a coordination tool and does not replace official police investigation or emergency response. In urgent situations, always contact the CCPO or barangay emergency hotline directly in addition to using this app.

7. Acceptance
By creating an account, you acknowledge that you have read, understood, and agree to these Terms and Conditions.`;

export default function TermsModal({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Terms and Conditions</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{TERMS_TEXT}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textDark, marginBottom: 14 },
  scroll: { marginBottom: 16 },
  body: { fontSize: 13, color: Colors.textDark, lineHeight: 21 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
