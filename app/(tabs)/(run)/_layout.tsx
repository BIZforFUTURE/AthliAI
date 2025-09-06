import { Stack } from "expo-router";

export default function RunLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="run" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="history" 
        options={{ 
          title: "Run History"
        }} 
      />
      <Stack.Screen 
        name="[runId]" 
        options={{ 
          title: "Run Details"
        }} 
      />
    </Stack>
  );
}