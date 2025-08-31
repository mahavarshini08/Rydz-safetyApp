import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getRideStats } from '../api';

export default function StatsScreen() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await getRideStats();
      setStats(res.stats);
    })();
  }, []);

  if (!stats) return null;

  return (
    <View style={{ padding: 20 }}>
      <Text>Total Rides: {stats.totalRides}</Text>
      <Text>Active Rides: {stats.activeRides}</Text>
      <Text>Completed Rides: {stats.completedRides}</Text>
    </View>
  );
}
