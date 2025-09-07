import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useGroups } from "@/contexts/GroupContext";

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams();
  const { getGroup, updateGroupSettings } = useGroups();
  const group = getGroup(groupId as string);

  const [isPrivate, setIsPrivate] = useState<boolean>(group?.isPrivate ?? false);
  const [password, setPassword] = useState<string>(group?.password ?? "");

  const disabled = useMemo(() => isPrivate && password.trim().length < 4, [isPrivate, password]);

  if (!group) {
    return (
      <View style={styles.container}>
        <Text>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Privacy</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Make group private</Text>
          <Switch value={isPrivate} onValueChange={setIsPrivate} testID="settings-toggle-private" />
        </View>
        {isPrivate ? (
          <View style={styles.field}>
            <Text style={styles.inputLabel}>Group password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 4 characters"
              secureTextEntry
              autoCapitalize="none"
              testID="settings-password-input"
            />
            <Text style={styles.hint}>Members must enter this password to join.</Text>
          </View>
        ) : (
          <Text style={styles.hint}>Anyone can find and join this group.</Text>
        )}
        <Text
          style={[styles.saveBtn, disabled && styles.saveBtnDisabled]}
          onPress={() => {
            try {
              updateGroupSettings(group.id, { isPrivate, password: isPrivate ? password.trim() : undefined });
              Alert.alert("Saved", "Group settings updated.");
            } catch (e) {
              console.log("update settings error", e);
              Alert.alert("Error", "Couldn't update settings.");
            }
          }}
          suppressHighlighting
          testID="save-group-settings"
        >
          Save changes
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 16,
    color: "#1F2937",
  },
  field: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#007AFF",
    color: "#fff",
    textAlign: "center",
    paddingVertical: 12,
    borderRadius: 10,
    fontWeight: "700",
  },
  saveBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
});