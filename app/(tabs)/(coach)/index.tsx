import React, { useState, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Bot, User, Plus, MessageSquare } from "lucide-react-native";
import { useCoach } from "@/contexts/CoachContext";

export default function CoachScreen() {
  const { messages, sendMessage, isLoading, chats, newChat, selectChat, currentChatId } = useCoach();
  const [input, setInput] = useState<string>("");
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderChatItem = ({ item }: { item: { id: string; title: string } }) => (
    <TouchableOpacity
      testID={`chat-item-${item.id}`}
      style={[styles.chatItem, item.id === currentChatId ? styles.chatItemActive : undefined]}
      onPress={() => selectChat(item.id)}
    >
      <MessageSquare size={16} color={item.id === currentChatId ? "#007AFF" : "#8E8E93"} />
      <Text style={[styles.chatItemText, item.id === currentChatId ? styles.chatItemTextActive : undefined]} numberOfLines={1}>
        {item.title || "New Chat"}
      </Text>
    </TouchableOpacity>
  );

  const chatListData = useMemo(() => chats.map(c => ({ id: c.id, title: c.title })), [chats]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Bot size={32} color="#007AFF" />
        <View style={styles.headerText}>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.subtitle}>Your personal running assistant</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <View style={styles.topBar}>
          <FlatList
            data={chatListData}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chatList}
            testID="chat-list"
          />
          <TouchableOpacity testID="new-chat" style={styles.newChatButton} onPress={newChat}>
            <Plus size={16} color="#FFF" />
            <Text style={styles.newChatText}>New</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.role === "user" ? styles.userRow : styles.assistantRow,
              ]}
            >
              {message.role === "assistant" && (
                <View style={styles.avatarContainer}>
                  <Bot size={20} color="#007AFF" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.role === "user" ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === "user" ? styles.userText : styles.assistantText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
              {message.role === "user" && (
                <View style={styles.avatarContainer}>
                  <User size={20} color="#8E8E93" />
                </View>
              )}
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View style={styles.avatarContainer}>
                <Bot size={20} color="#007AFF" />
              </View>
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <Text style={styles.typingIndicator}>...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask your coach..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            maxLength={500}
            testID="coach-input"
            accessibilityLabel="Coach message input"
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
            testID="send-button"
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Send
              size={20}
              color={input.trim() && !isLoading ? "#007AFF" : "#C7C7CC"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  headerText: {
    marginLeft: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  subtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#FFF",
    borderBottomColor: "#E5E5EA",
    borderBottomWidth: 1,
  },
  chatList: {
    paddingVertical: 6,
    gap: 8,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    marginRight: 8,
  },
  chatItemActive: {
    backgroundColor: "#E8F0FE",
    borderWidth: 1,
    borderColor: "#B3D4FF",
  },
  chatItemText: {
    marginLeft: 6,
    color: "#1C1C1E",
    maxWidth: 140,
  },
  chatItemTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  newChatText: {
    color: "#FFF",
    fontWeight: "600",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubble: {
    maxWidth: "70%",
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#007AFF",
  },
  assistantBubble: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#FFF",
  },
  assistantText: {
    color: "#1C1C1E",
  },
  typingIndicator: {
    fontSize: 24,
    color: "#8E8E93",
  },
  inputContainer: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
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
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
});