import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

export default function PolicyModal({ visible, onClose, title, text }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{text}</Text>
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
