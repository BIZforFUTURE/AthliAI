import { Stack } from "expo-router";

export default function NutritionLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="goals" 
        options={{ 
          title: "Nutrition Goals",
        }} 
      />
      <Stack.Screen 
        name="quiz" 
        options={{ 
          title: "Your Plan",
        }} 
      />
    </Stack>
  );
}