import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, ChevronRight, Search, User as UserIcon, Lock } from "lucide-react-native";
import { router } from "expo-router";
import { useGroups } from "@/contexts/GroupContext";

export default function GroupsScreen() {
  const { groups, joinGroup, setQuery } = useGroups();
  const [search, setSearch] = useState<string>("");
  const [pwdModalOpen, setPwdModalOpen] = useState<boolean>(false);
  const [pwdInput, setPwdInput] = useState<string>("");
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);

  const onChangeSearch = (text: string) => {
    setSearch(text);
    setQuery(text);
  };

  const attemptJoin = (groupId: string, isPrivate?: boolean) => {
    if (isPrivate) {
      setTargetGroupId(groupId);
      setPwdInput("");
      setPwdModalOpen(true);
      return;
    }
    const ok = joinGroup(groupId);
    if (!ok) Alert.alert("Could not join", "Please try again.");
  };

  const confirmJoinPrivate = () => {
    if (!targetGroupId) return;
    const ok = joinGroup(targetGroupId, pwdInput);
    if (!ok) {
      Alert.alert("Incorrect password", "Please try again.");
      return;
    }
    setPwdModalOpen(false);
    setTargetGroupId(null);
    setPwdInput("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Running Groups</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/profile" as any)}
            testID="open-profile-button"
            activeOpacity={0.8}
          >
            <UserIcon size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/(groups)/create" as any)}
            testID="create-group-button"
            activeOpacity={0.8}
          >
            <Plus size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <Search size={18} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups"
          value={search}
          onChangeText={onChangeSearch}
          autoCorrect={false}
          autoCapitalize="none"
          testID="groups-search-input"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Groups</Text>
          {groups.filter(g => g.isMember).map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => router.push(`/(groups)/${group.id}` as any)}
              activeOpacity={0.7}
              testID={`group-card-${group.id}`}
            >
              <Image source={{ uri: group.image }} style={styles.groupImage} />
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMembers}>{group.members} members</Text>
                <Text style={styles.groupActivity}>{group.lastActivity}</Text>
              </View>
              <ChevronRight size={20} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover Groups</Text>
          {groups.filter(g => !g.isMember).map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => attemptJoin(group.id, group.isPrivate)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: group.image }} style={styles.groupImage} />
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMembers}>{group.members} members</Text>
                <Text style={styles.groupDescription}>{group.description}</Text>
                {group.isPrivate ? (
                  <View style={styles.privateRow}>
                    <Lock size={14} color="#8E8E93" />
                    <Text style={styles.privateText}>Private</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => attemptJoin(group.id, group.isPrivate)}
                testID={`join-group-${group.id}`}
              >
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={pwdModalOpen} transparent animationType="fade" onRequestClose={() => setPwdModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Lock size={16} color="#1C1C1E" />
              <Text style={styles.modalTitle}>Private group</Text>
            </View>
            <Text style={styles.modalSubtitle}>Enter the group password to join</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              secureTextEntry
              value={pwdInput}
              onChangeText={setPwdInput}
              autoCapitalize="none"
              testID="private-password-input"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => { setPwdModalOpen(false); setPwdInput(""); setTargetGroupId(null); }} testID="cancel-private-join">
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={confirmJoinPrivate} disabled={!pwdInput.trim()} testID="confirm-private-join">
                <Text style={[styles.modalConfirmText, !pwdInput.trim() ? styles.modalConfirmTextDisabled : undefined]}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchWrapper: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1C1C1E",
    paddingVertical: 0,
    marginLeft: 8,
  },
  section: {
    padding: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  groupCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 2,
  },
  groupActivity: {
    fontSize: 12,
    color: "#8E8E93",
  },
  groupDescription: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  joinButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  privateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  privateText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancel: {
    backgroundColor: "#F3F4F6",
  },
  modalCancelText: {
    color: "#374151",
    fontWeight: "600",
  },
  modalConfirm: {
    backgroundColor: "#007AFF",
  },
  modalConfirmText: {
    color: "#FFF",
    fontWeight: "700",
  },
  modalConfirmTextDisabled: {
    color: "#E5E7EB",
  },
});