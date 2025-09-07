import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Send, Heart, MessageCircle, ImageUp, Sparkles, Camera, ChevronDown, Lock } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useGroups } from "@/contexts/GroupContext";
import { useUser } from "@/contexts/UserContext";
import { useRuns } from "@/contexts/RunContext";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

type RunShareGraphicProps = {
  athleteName: string;
  athletePhoto?: string;
  distance: number;
  duration: string;
  pace: string;
  date: string;
};

const RunShareGraphic = React.memo(function RunShareGraphic(props: RunShareGraphicProps) {
  const { athleteName, athletePhoto, distance, duration, pace, date } = props;
  const photoUri = athletePhoto ?? "https://images.unsplash.com/photo-1554384645-13eab165c24b?w=1400&q=80";
  return (
    <View style={styles.shareCard} testID="run-share-card">
      <ImageBackground
        source={{ uri: photoUri }}
        style={styles.shareImage}
        imageStyle={styles.shareImageRadius}
        blurRadius={2}
      >
        <LinearGradient
          colors={["rgba(255, 245, 235, 0.18)", "rgba(255, 200, 150, 0.10)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.warmOverlay}
        />
        <View style={styles.shareOverlay} />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bottomGradient}
        />
        <View style={styles.shareFooter}>
          <Text style={styles.footerBrand} testID="athliai-brand">AthliAI</Text>
          <View style={styles.footerStatsRow}>
            <View style={styles.footerStat}>
              <Text style={styles.footerStatLabel}>Distance</Text>
              <Text style={styles.footerStatValue}>{`${distance.toFixed(2)} mi`}</Text>
            </View>
            <View style={[styles.footerStat, styles.durationStat]} testID="duration-pill">
              <Text style={[styles.footerStatLabel, styles.durationLabel]}>Duration</Text>
              <Text style={[styles.footerStatValue, styles.durationValue]}>{duration}</Text>
            </View>
            <View style={styles.footerStat}>
              <Text style={styles.footerStatLabel}>Pace</Text>
              <Text style={styles.footerStatValue}>{`${pace} min/mi`}</Text>
            </View>
          </View>
          <Text style={styles.footerMeta} numberOfLines={1}>{athleteName} • {date}</Text>
        </View>
      </ImageBackground>
    </View>
  );
});

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams();
  const { getGroup, addPost, toggleLike, addComment, updateGroupImage, joinGroup } = useGroups();
  const { user, getDisplayNameForGroup } = useUser();
  const { lastRun } = useRuns();
  const [newPost, setNewPost] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [updatingBanner, setUpdatingBanner] = useState<boolean>(false);
  const [activeCommentFor, setActiveCommentFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>("");
  const [pwdModalOpen, setPwdModalOpen] = useState<boolean>(false);
  const [pwdInput, setPwdInput] = useState<string>("");
  
  const group = getGroup(groupId as string);

  const handlePickBanner = useCallback(async () => {
    if (!group) return;
    try {
      setUpdatingBanner(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (!res.canceled) {
        const uri = res.assets?.[0]?.uri ?? undefined;
        if (uri) {
          updateGroupImage(group.id, uri);
        }
      }
    } catch (e) {
      console.log("pick banner error", e);
    } finally {
      setUpdatingBanner(false);
    }
  }, [group, updateGroupImage]);

  if (!group) {
    return (
      <View style={styles.container}>
        <Text>Group not found</Text>
      </View>
    );
  }

  const attemptJoinFromDetail = useCallback(() => {
    if (!group) return;
    if (group.isPrivate) {
      setPwdInput("");
      setPwdModalOpen(true);
      return;
    }
    const ok = joinGroup(group.id);
    if (!ok) Alert.alert("Could not join", "Please try again.");
  }, [group, joinGroup]);

  const confirmJoinPrivate = useCallback(() => {
    if (!group) return;
    const ok = joinGroup(group.id, pwdInput);
    if (!ok) {
      Alert.alert("Incorrect password", "Please try again.");
      return;
    }
    setPwdModalOpen(false);
    setPwdInput("");
  }, [group, pwdInput, joinGroup]);

  const handleToggleLike = useCallback((postId: string) => {
    if (!group) return;
    toggleLike(group.id, postId);
  }, [group, toggleLike]);

  const handleAddComment = useCallback(() => {
    if (!group || !activeCommentFor) return;
    const text = commentText.trim();
    if (!text) return;
    const displayName = getDisplayNameForGroup(group.id);
    addComment(group.id, activeCommentFor, { userName: displayName, userAvatar: user.avatar ?? "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400", text });
    setCommentText("");
    setActiveCommentFor(null);
  }, [group, activeCommentFor, commentText, addComment, getDisplayNameForGroup, user.avatar]);

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (!res.canceled) {
        const uri = res.assets?.[0]?.uri ?? undefined;
        setImageUri(uri);
      }
    } catch (e) {
      console.log("pick image error", e);
    }
  };

  const handleShareLastRun = useCallback(async () => {
    try {
      if (!lastRun) {
        console.log("No last run to share");
        return;
      }

      let selfieUri: string | undefined = undefined;

      const pickFromLibrary = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.9,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
        if (!res.canceled) {
          selfieUri = res.assets?.[0]?.uri ?? undefined;
        }
      };

      const takeNewPhoto = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") {
          Alert.alert("Permission needed", "Camera permission is required to take a photo");
          return;
        }
        const cam = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.9,
          aspect: [4, 3],
        });
        if (!cam.canceled) {
          selfieUri = cam.assets?.[0]?.uri ?? undefined;
        }
      };

      await new Promise<void>((resolve) => {
        Alert.alert(
          "Add a photo?",
          "Include a selfie with your run",
          [
            { text: "Take Photo", onPress: async () => { await takeNewPhoto(); resolve(); } },
            { text: "Upload Photo", onPress: async () => { await pickFromLibrary(); resolve(); } },
            { text: "No Photo", style: "cancel", onPress: () => resolve() },
          ],
          { cancelable: true }
        );
      });

      const displayName = getDisplayNameForGroup(group.id);
      addPost(
        groupId as string,
        "",
        undefined,
        { userName: displayName, userAvatar: user.avatar ?? "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400" },
        {
          distance: lastRun.distance,
          duration: lastRun.duration,
          pace: lastRun.pace,
          date: lastRun.date,
          athleteName: displayName,
          athletePhoto: selfieUri ?? user.avatar,
        }
      );
    } catch (e) {
      console.log("share last run error", e);
    }
  }, [addPost, getDisplayNameForGroup, group?.id, groupId, lastRun, user.avatar]);

  const handlePost = () => {
    if (newPost.trim() || imageUri) {
      const displayName = getDisplayNameForGroup(group.id);
      addPost(
        groupId as string,
        newPost.trim(),
        imageUri,
        { userName: displayName, userAvatar: user.avatar ?? "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400" }
      );
      setNewPost("");
      setImageUri(undefined);
    }
  };

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 16 + 56 + (insets.bottom ?? 0) }}
      >
        <View style={styles.groupHeader}>
          <TouchableOpacity onPress={handlePickBanner} activeOpacity={0.85} testID="change-group-banner">
            <Image source={{ uri: group.image }} style={styles.groupImage} />
            <View style={styles.cameraBadge}>
              <Camera size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupMembers}>{group.members} members</Text>
          {group.isMember ? (
            <TouchableOpacity
              style={styles.shareRunCta}
              onPress={handleShareLastRun}
              activeOpacity={0.85}
              testID="share-last-run-button"
            >
              <Sparkles size={18} color="#fff" />
              <Text style={styles.shareRunCtaText}>Share last run with AthliAI</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.joinRow}>
              <TouchableOpacity
                style={styles.joinCta}
                onPress={attemptJoinFromDetail}
                activeOpacity={0.9}
                testID="detail-join-group"
              >
                <Lock size={16} color="#fff" />
                <Text style={styles.joinCtaText}>{group.isPrivate ? "Join private group" : "Join group"}</Text>
              </TouchableOpacity>
              <Text style={styles.settingsLink} onPress={() => router.push(`/(groups)/${group.id}/settings` as any)} testID="open-group-settings">Group settings</Text>
            </View>
          )}
        </View>

        {!group.isMember ? (
          <View style={styles.lockedContainer}>
            <Lock size={20} color="#8E8E93" />
            <Text style={styles.lockedText}>{group.isPrivate ? "This group is private. Join to see posts." : "Join to see posts."}</Text>
          </View>
        ) : null}

        {group.isMember ? (
        <View style={styles.postsContainer}>
          {group.posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
                <View style={styles.postInfo}>
                  <Text style={styles.userName}>{post.userName}</Text>
                  <Text style={styles.postTime}>{post.time}</Text>
                </View>
              </View>
              {post.runShare ? (
                <RunShareGraphic
                  athleteName={post.runShare.athleteName}
                  athletePhoto={post.runShare.athletePhoto}
                  distance={post.runShare.distance}
                  duration={post.runShare.duration}
                  pace={post.runShare.pace}
                  date={post.runShare.date}
                />
              ) : null}
              {post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
              ) : null}
              {post.content ? (
                <Text style={styles.postContent}>{post.content}</Text>
              ) : null}
              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleLike(post.id)} testID={`like-post-${post.id}`}>
                  <Heart size={18} color={post.likedByMe ? "#FF375F" : "#8E8E93"} />
                  <Text style={[styles.actionText, post.likedByMe ? styles.likedText : undefined]}>{post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => { setActiveCommentFor(post.id); }} testID={`comment-post-${post.id}`}>
                  <MessageCircle size={18} color="#8E8E93" />
                  <Text style={styles.actionText}>{post.comments}</Text>
                </TouchableOpacity>
              </View>
              {post.commentsList && post.commentsList.length > 0 ? (
                <View style={styles.commentsList}>
                  {post.commentsList.slice(0, 3).map(c => (
                    <View key={c.id} style={styles.commentItem}>
                      <Image source={{ uri: c.userAvatar }} style={styles.commentAvatar} />
                      <View style={styles.commentBubble}>
                        <Text style={styles.commentAuthor}>{c.userName} <Text style={styles.commentTime}>• {c.time}</Text></Text>
                        <Text style={styles.commentText}>{c.text}</Text>
                      </View>
                    </View>
                  ))}
                  {post.commentsList.length > 3 ? (
                    <View style={styles.moreCommentsRow}>
                      <ChevronDown size={14} color="#8E8E93" />
                      <Text style={styles.moreCommentsText}>{post.commentsList.length - 3} more comments</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {activeCommentFor === post.id ? (
                <View style={styles.inlineComposer}>
                  <Image source={{ uri: user.avatar ?? "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400" }} style={styles.commentAvatar} />
                  <TextInput
                    style={styles.inlineInput}
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Write a comment..."
                    placeholderTextColor="#8E8E93"
                    autoFocus
                    testID={`comment-input-${post.id}`}
                  />
                  <TouchableOpacity onPress={handleAddComment} disabled={!commentText.trim()} style={styles.inlineSend} testID={`send-comment-${post.id}`}>
                    <Send size={18} color={!commentText.trim() ? "#C7C7CC" : "#007AFF"} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
        </View>
        ) : null}
      </ScrollView>

      {group.isMember ? (
      <View style={[styles.inputContainer, { paddingBottom: 10 + (insets.bottom ?? 0) }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.composerPreview} />
        ) : null}
        <TouchableOpacity onPress={handlePickImage} style={styles.mediaButton} testID="attach-image-button">
          <ImageUp size={20} color="#007AFF" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Share your progress..."
          value={newPost}
          onChangeText={setNewPost}
          multiline
          testID="group-post-input"
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handlePost}
          disabled={!newPost.trim() && !imageUri}
          testID="send-post-button"
        >
          <Send size={20} color={!newPost.trim() && !imageUri ? "#C7C7CC" : "#007AFF"} />
        </TouchableOpacity>
      </View>
      ) : null}

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
              testID="detail-private-password"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => { setPwdModalOpen(false); setPwdInput(""); }} testID="detail-cancel-private-join">
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={confirmJoinPrivate} disabled={!pwdInput.trim()} testID="detail-confirm-private-join">
                <Text style={[styles.modalConfirmText, !pwdInput.trim() ? styles.modalConfirmTextDisabled : undefined]}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  groupHeader: {
    backgroundColor: "#FFF",
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  groupImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 8,
    backgroundColor: "#007AFF",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 16,
    color: "#8E8E93",
  },
  shareRunCta: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#007AFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shareRunCtaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  joinRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  joinCta: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  settingsLink: {
    color: "#2563EB",
    fontWeight: "700",
  },
  joinCtaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  postsContainer: {
    padding: 16,
  },
  postCard: {
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
  postHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  postTime: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: "#1C1C1E",
    lineHeight: 22,
    marginTop: 10,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  shareCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  shareImage: {
    width: "100%",
    aspectRatio: 4 / 5,
    justifyContent: "flex-end",
  },
  shareImageRadius: {
    borderRadius: 16,
  },
  shareOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  shareFooter: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "transparent",
  },
  footerBrand: {
    color: "#0A84FF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  footerStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "stretch",
  },
  footerStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerStatLabel: {
    color: "#E5E7EB",
    fontSize: 11,
    opacity: 0.95,
  },
  footerStatValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  footerMeta: {
    color: "#C7C7CC",
    fontSize: 12,
    marginTop: 12,
  },
  postActions: {
    flexDirection: "row",
    gap: 24,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  likedText: {
    color: "#FF375F",
  },
  commentsList: {
    marginTop: 10,
    gap: 8,
  },
  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  commentTime: {
    fontSize: 11,
    color: "#8E8E93",
  },
  commentText: {
    fontSize: 13,
    color: "#1C1C1E",
    marginTop: 2,
  },
  moreCommentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  moreCommentsText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  inlineComposer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  inlineSend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
  composerPreview: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#F2F2F7",
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  lockedContainer: {
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  lockedText: {
    fontSize: 13,
    color: "#6B7280",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
  warmOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  durationStat: {
    backgroundColor: "rgba(10,132,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(10,132,255,0.45)",
  },
  durationLabel: {
    color: "#E6F0FF",
  },
  durationValue: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
