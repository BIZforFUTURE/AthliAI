import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, Switch } from "react-native";
import { useGroups } from "@/contexts/GroupContext";
import { ImageIcon, Plus, ImageUp, Lock } from "lucide-react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

export default function CreateGroupScreen() {
  const { createGroup } = useGroups();
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [picking, setPicking] = useState<boolean>(false);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");

  const disabled = useMemo(() => !name.trim() || (isPrivate && password.trim().length < 4), [name, isPrivate, password]);

  const onCreate = () => {
    try {
      const g = createGroup({ name: name.trim(), description: description.trim() || undefined, image: imageUrl.trim() || undefined, isPrivate, password: isPrivate ? password.trim() : undefined });
      Alert.alert("Group created", `${g.name} is ready!`);
      router.replace(`/(groups)/${g.id}` as any);
    } catch (e) {
      console.log("create group error", e);
      Alert.alert("Error", "Unable to create group. Try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.preview}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <ImageIcon size={32} color="#8E8E93" />
            <Text style={styles.placeholderText}>Enter an image URL</Text>
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Group name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. SF Half Marathon Crew"
          value={name}
          onChangeText={setName}
          autoFocus
          testID="create-group-name"
        />
      </View>

      <TouchableOpacity
        onPress={async () => {
          try {
            setPicking(true);
            const res = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.9,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });
            if (!res.canceled) {
              const uri = res.assets?.[0]?.uri ?? "";
              setImageUrl(uri);
            }
          } catch (e) {
            console.log("pick group image error", e);
            Alert.alert("Error", "Couldn't pick an image. Try again.");
          } finally {
            setPicking(false);
          }
        }}
        style={styles.uploadBtn}
        activeOpacity={0.85}
        testID="pick-group-image-button"
      >
        <ImageUp size={16} color="#007AFF" />
        <Text style={styles.uploadBtnText}>{picking ? "Selecting..." : "Upload from camera roll"}</Text>
      </TouchableOpacity>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="What is this group about?"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          testID="create-group-desc"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Cover image URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://images.unsplash.com/..."
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
          autoCorrect={false}
          testID="create-group-image"
        />
      </View>

      <View style={[styles.field, styles.rowBetween]}>
        <View style={styles.rowCenter}>
          <Lock size={16} color="#6B7280" />
          <Text style={styles.privacyLabel}>Private group</Text>
        </View>
        <Switch value={isPrivate} onValueChange={setIsPrivate} testID="toggle-private-group" />
      </View>

      {isPrivate ? (
        <View style={styles.field}>
          <Text style={styles.label}>Group password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 4 characters"
            secureTextEntry
            autoCapitalize="none"
            testID="create-group-password"
          />
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.createBtn, disabled && styles.createBtnDisabled]}
        disabled={disabled}
        onPress={onCreate}
        testID="submit-create-group"
      >
        <Plus size={18} color={disabled ? "#B0B0B0" : "#FFF"} />
        <Text style={[styles.createText, disabled && styles.createTextDisabled]}>Create Group</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
    backgroundColor: "#F2F2F7",
  },
  preview: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  placeholderText: {
    color: "#8E8E93",
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#EAF2FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  uploadBtnText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  createBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  createText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  createTextDisabled: {
    color: "#B0B0B0",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  privacyLabel: {
    color: "#6B7280",
    fontSize: 14,
  },
});