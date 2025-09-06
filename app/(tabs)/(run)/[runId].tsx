import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRuns } from '@/contexts/RunContext';
import { Image } from 'expo-image';

function simplifyPath(path: Array<{ lat: number; lng: number }>, maxPoints = 100) {
  if (!Array.isArray(path)) return [] as Array<{ lat: number; lng: number }>;
  if (path.length <= maxPoints) return path;
  const step = Math.max(1, Math.floor(path.length / maxPoints));
  const simplified: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < path.length; i += step) simplified.push(path[i]!);
  if (simplified[simplified.length - 1] !== path[path.length - 1]) simplified.push(path[path.length - 1]!);
  return simplified;
}

function buildStaticMapUrl(path: Array<{ lat: number; lng: number }>, width = 900, height = 400) {
  const pts = simplifyPath(path);
  if (pts.length === 0) return `https://staticmap.openstreetmap.de/staticmap.php?center=0,0&zoom=1&size=${width}x${height}`;
  const latitudes = pts.map(p => p.lat);
  const longitudes = pts.map(p => p.lng);
  const latCenter = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const lngCenter = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const encoded = pts.map(p => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|');
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${latCenter.toFixed(6)},${lngCenter.toFixed(6)}&zoom=14&size=${width}x${height}&maptype=mapnik&path=weight:4|color:0x007AFF|${encoded}`;
  return url;
}

export default function RunDetailsScreen() {
  const params = useLocalSearchParams<{ runId?: string }>();
  const { runs } = useRuns();
  const run = useMemo(() => runs.find(r => r.id === String(params.runId ?? '')), [runs, params.runId]);

  if (!run) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#8E8E93' }}>Run not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {Array.isArray(run.path) && run.path.length >= 2 ? (
        <Image style={styles.map} source={{ uri: buildStaticMapUrl(run.path) }} contentFit="cover" />
      ) : (
        <View style={[styles.map, styles.placeholder]}><Text style={{ color: '#8E8E93' }}>No route data</Text></View>
      )}
      <View style={styles.grid}>
        <View style={styles.stat}><Text style={styles.label}>Distance</Text><Text style={styles.value}>{run.distance.toFixed(2)} mi</Text></View>
        <View style={styles.stat}><Text style={styles.label}>Duration</Text><Text style={styles.value}>{run.duration}</Text></View>
        <View style={styles.stat}><Text style={styles.label}>Pace</Text><Text style={styles.value}>{run.pace} min/mi</Text></View>
      </View>
      <Text style={styles.date}>{new Date(run.date).toLocaleString()}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  map: { width: '100%', height: 260, borderRadius: 12, overflow: 'hidden' },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  stat: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14, alignItems: 'center' },
  label: { fontSize: 12, color: '#8E8E93' },
  value: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginTop: 4 },
  date: { color: '#8E8E93', fontSize: 12, marginTop: 16, textAlign: 'center' },
});
