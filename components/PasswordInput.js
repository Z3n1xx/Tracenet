import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

export default function PasswordInput({ style, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        {...props}
        style={[style, styles.inputWithButton]}
        secureTextEntry={!visible}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.toggleText}>{visible ? 'Hide' : 'Show'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center' },
  inputWithButton: { paddingRight: 64 },
  toggle: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  toggleText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
