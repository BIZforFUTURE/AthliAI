import { Stack } from "expo-router";

export default function GroupsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="create" 
        options={{ 
          headerShown: true,
          title: "Create Group",
        }} 
      />
      <Stack.Screen 
        name="[groupId]" 
        options={{ 
          headerShown: true,
          headerTitle: "Group",
        }} 
      />
      <Stack.Screen 
        name="[groupId]/settings" 
        options={{ 
          headerShown: true,
          headerTitle: "Group Settings",
        }} 
      />
    </Stack>
  );
}