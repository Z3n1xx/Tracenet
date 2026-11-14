import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '../constants/colors';

function formatDate(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function parseValue(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 25);
  return fallback;
}

export default function DateField({ value, onChange, style, placeholder = 'MM/DD/YYYY' }) {
  const [show, setShow] = useState(false);

  function handleChange(event, selectedDate) {
    setShow(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;
    if (selectedDate) onChange(formatDate(selectedDate));
  }

  return (
    <View>
      <TouchableOpacity style={[style, styles.field]} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value || placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={parseValue(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valueText: { fontSize: 14, color: Colors.textDark },
  placeholderText: { fontSize: 14, color: Colors.textGray },
  icon: { fontSize: 16 },
});
