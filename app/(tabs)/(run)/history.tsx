import React, { useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { useRuns } from '@/contexts/RunContext';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

function simplifyPath(path: Array<{ lat: number; lng: number }>, maxPoints = 40) {
  if (!Array.isArray(path)) return [] as Array<{ lat: number; lng: number }>;
  if (path.length <= maxPoints) return path;
  const step = Math.max(1, Math.floor(path.length / maxPoints));
  const simplified: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < path.length; i += step) simplified.push(path[i]!);
  if (simplified[simplified.length - 1] !== path[path.length - 1]) simplified.push(path[path.length - 1]!);
  return simplified;
}

function buildStaticMapUrl(path: Array<{ lat: number; lng: number }>, width = 600, height = 160) {
  const pts = simplifyPath(path);
  if (pts.length === 0) return `https://staticmap.openstreetmap.de/staticmap.php?center=0,0&zoom=1&size=${width}x${height}`;
  const latitudes = pts.map(p => p.lat);
  const longitudes = pts.map(p => p.lng);
  const latCenter = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const lngCenter = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const encoded = pts.map(p => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|');
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${latCenter.toFixed(6)},${lngCenter.toFixed(6)}&zoom=14&size=${width}x${height}&maptype=mapnik&path=weight:3|color:0x007AFF|${encoded}`;
  return url;
}

export default function RunHistoryScreen() {
  const { runs } = useRuns();
  const router = useRouter();

  const data = useMemo(() => runs, [runs]);

  return (
    <View style={styles.container}>
      {data.length === 0 ? (
        <Text style={styles.emptyText}>No runs yet</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`run-${item.id}`}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(tabs)/(run)/%5BrunId%5D', params: { runId: item.id } } as any)}
            >
              {Array.isArray(item.path) && item.path.length >= 2 ? (
                <Image
                  style={styles.map}
                  source={{ uri: buildStaticMapUrl(item.path, 800, 160) }}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.map, styles.mapPlaceholder]}>
                  <Text style={styles.mapPlaceholderText}>No route data</Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={styles.distance}>{item.distance.toFixed(2)} mi</Text>
                <Text style={styles.meta}>{item.duration} • {item.pace} min/mi</Text>
              </View>
              <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  map: { width: '100%', height: 140 },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7' },
  mapPlaceholderText: { color: '#8E8E93', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, alignItems: 'center' },
  distance: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  meta: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  date: { paddingHorizontal: 12, paddingBottom: 12, color: '#8E8E93', fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8E8E93' },
});
