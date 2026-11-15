import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

function TabIcon({ label, focused }) {
  const icons = {
    Home: focused ? '🏠' : '🏚️',
    Cases: focused ? '📋' : '📄',
    Map: '🗺️',
    Alerts: focused ? '🔔' : '🔕',
    Profile: focused ? '👤' : '🙍',
  };
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.icon}>{icons[label]}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
      {focused ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Cases" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen name="report" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 66,
    paddingBottom: 8,
  },
  iconContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  icon: { fontSize: 19 },
  label: { fontSize: 10, color: Colors.textGray, marginTop: 2 },
  labelActive: { color: Colors.primary, fontWeight: '700' },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
});
