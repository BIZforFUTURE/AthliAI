import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import { useUser } from "@/contexts/UserContext";
import { useGroups } from "@/contexts/GroupContext";
import { Stack } from "expo-router";
import { Check, User as UserIcon, ImageUp, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const { user, updateUser, setGroupAlias } = useUser();
  const { groups } = useGroups();

  const memberGroups = useMemo(() => groups.filter(g => g.isMember), [groups]);

  const [name, setName] = useState<string>(user.name ?? "");
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setName(user.name ?? "");
    setAliases(user.groupAliases ?? {});
  }, [user]);

  const onSave = useCallback(async () => {
    try {
      console.log("Profile save start", { name, aliases });
      setSaving(true);
      await updateUser({ name });
      const ops = memberGroups.map(async g => {
        const alias = aliases[g.id] ?? "";
        return setGroupAlias(g.id, alias.trim());
      });
      await Promise.all(ops);
      Alert.alert("Saved", "Your profile and group names were updated.");
      console.log("Profile save success");
    } catch (e) {
      console.error("Profile save error", e);
      Alert.alert("Error", "We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, aliases, memberGroups, setGroupAlias, updateUser]);

  const onAliasChange = useCallback((groupId: string, value: string) => {
    setAliases(prev => ({ ...prev, [groupId]: value }));
  }, []);

  const onPickAvatar = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (!res.canceled) {
        const uri = res.assets?.[0]?.uri ?? undefined;
        if (uri) {
          await updateUser({ avatar: uri });
          Alert.alert("Updated", "Profile photo updated.");
        }
      }
    } catch (e) {
      console.log("pick avatar error", e);
      Alert.alert("Error", "Couldn't pick an image. Try again.");
    }
  }, [updateUser]);

  const onRemoveAvatar = useCallback(async () => {
    try {
      await updateUser({ avatar: undefined });
      Alert.alert("Removed", "Profile photo removed.");
    } catch (e) {
      console.log("remove avatar error", e);
    }
  }, [updateUser]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Profile", headerRight: () => (
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={styles.saveButton}
          testID="save-profile-button"
          activeOpacity={0.8}
        >
          <Check size={18} color={saving ? "#C7C7CC" : "#007AFF"} />
        </TouchableOpacity>
      ) }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarCard}>
          <View style={styles.avatarRow}>
            <Image
              source={{ uri: user.avatar ?? "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400" }}
              style={styles.avatar}
            />
            <View style={styles.avatarActions}>
              <TouchableOpacity onPress={onPickAvatar} style={styles.avatarButton} testID="pick-avatar-button" activeOpacity={0.85}>
                <ImageUp size={16} color="#007AFF" />
                <Text style={styles.avatarButtonText}>Upload photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onRemoveAvatar} style={[styles.avatarButton, styles.dangerBtn]} testID="remove-avatar-button" activeOpacity={0.85}>
                <Trash2 size={16} color="#FF3B30" />
                <Text style={[styles.avatarButtonText, styles.dangerText]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.hint}>This photo shows with your forum posts and run shares.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserIcon size={18} color="#1C1C1E" />
            <Text style={styles.cardTitle}>Your Name</Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            style={styles.input}
            autoCapitalize="words"
            testID="profile-name-input"
          />
          <Text style={styles.hint}>This is your default name across the app.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Name in Each Group</Text>
          <Text style={styles.hint}>Optionally set how your name appears in specific groups.</Text>
          {memberGroups.length === 0 ? (
            <Text style={styles.emptyText}>Join a group to set a custom name.</Text>
          ) : (
            memberGroups.map(group => (
              <View key={group.id} style={styles.aliasRow}>
                <View style={styles.aliasInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupHint}>Leave blank to use your default name</Text>
                </View>
                <TextInput
                  value={aliases[group.id] ?? ""}
                  onChangeText={(t) => onAliasChange(group.id, t)}
                  placeholder={user.name}
                  style={styles.aliasInput}
                  autoCapitalize="words"
                  testID={`alias-input-${group.id}`}
                />
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          testID="save-profile-bottom-button"
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save Changes"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E5E7EB",
  },
  avatarActions: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatarButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  dangerBtn: {
    backgroundColor: "#FFF2F2",
  },
  dangerText: {
    color: "#FF3B30",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: "#8E8E93",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 14,
    color: "#8E8E93",
  },
  aliasRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  aliasInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  groupHint: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  aliasInput: {
    width: 140,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#A7C7FF",
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  saveButton: {
    marginRight: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});