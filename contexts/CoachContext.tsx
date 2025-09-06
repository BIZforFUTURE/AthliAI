import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface CoachChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "athliai.coach.chats.v1" as const;

const welcomeMessage: Message = {
  id: "welcome-1",
  role: "assistant",
  content:
    "Hi! I'm your AI running coach. I can help you with training plans, nutrition advice, injury prevention, and motivation. What would you like to work on today?",
};

function createInitialChat(): CoachChat {
  const now = Date.now();
  return {
    id: `chat-${now}`,
    title: "New Chat",
    messages: [welcomeMessage],
    createdAt: now,
    updatedAt: now,
  };
}

export const [CoachProvider, useCoach] = createContextHook(() => {
  const [chats, setChats] = useState<CoachChat[]>([createInitialChat()]);
  const [currentChatId, setCurrentChatId] = useState<string>(chats[0]?.id ?? "");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        console.log("Coach: loading chats from storage");
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as CoachChat[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChats(parsed);
            setCurrentChatId(parsed[0]?.id ?? "");
            console.log("Coach: restored", parsed.length, "chats");
          }
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
          console.log("Coach: initialized chats in storage");
        }
      } catch (e) {
        console.log("Coach: load error", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (val: CoachChat[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      console.log("Coach: persisted", val.length, "chats");
    } catch (e) {
      console.log("Coach: persist error", e);
    }
  }, []);

  const messages = useMemo<Message[]>(() => {
    const found = chats.find(c => c.id === currentChatId);
    return found?.messages ?? [];
  }, [chats, currentChatId]);

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);

  const newChat = useCallback(() => {
    setChats(prev => {
      const nextChat = createInitialChat();
      const next = [nextChat, ...prev];
      void persist(next);
      setCurrentChatId(nextChat.id);
      return next;
    });
  }, [persist]);

  const renameChat = useCallback((chatId: string, title: string) => {
    setChats(prev => {
      const next = prev.map(c => (c.id === chatId ? { ...c, title } : c));
      void persist(next);
      return next;
    });
  }, [persist]);

  const sendMessage = useCallback(async (content: string) => {
    const chatId = currentChatId || chats[0]?.id;
    if (!chatId) return;

    const userMessage: Message = {
      id: `${Date.now()}`,
      role: "user",
      content,
    };

    setChats(prev => {
      const next = prev.map(c =>
        c.id === chatId
          ? {
              ...c,
              messages: [...c.messages, userMessage],
              updatedAt: Date.now(),
            }
          : c,
      );
      void persist(next);
      return next;
    });

    setIsLoading(true);

    try {
      const convo = chats.find(c => c.id === chatId)?.messages ?? [];
      const response = await fetch("https://toolkit.rork.com/text/llm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are an expert running coach and fitness trainer. Provide helpful, encouraging, and personalized advice about running, training, nutrition, and injury prevention. Keep responses concise and actionable.",
            },
            ...convo.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content },
          ],
        }),
      });

      const data = (await response.json()) as { completion?: string };
      const assistantMessage: Message = {
        id: `${Date.now() + 1}`,
        role: "assistant",
        content: data?.completion ?? "",
      };

      setChats(prev => {
        const next = prev.map(c =>
          c.id === chatId
            ? {
                ...c,
                messages: [...c.messages, assistantMessage],
                updatedAt: Date.now(),
                title:
                  c.title === "New Chat" && content.trim().length > 0
                    ? content.trim().slice(0, 30)
                    : c.title,
              }
            : c,
        );
        void persist(next);
        return next;
      });
    } catch (error) {
      console.error("Coach: send message error", error);
      const errorMessage: Message = {
        id: `${Date.now() + 1}`,
        role: "assistant",
        content:
          "Sorry, I'm having trouble connecting right now. Please try again later.",
      };
      setChats(prev => {
        const next = prev.map(c =>
          c.id === (currentChatId || chats[0]?.id)
            ? { ...c, messages: [...c.messages, errorMessage], updatedAt: Date.now() }
            : c,
        );
        void persist(next);
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [chats, currentChatId, persist]);

  return {
    chats,
    currentChatId,
    selectChat,
    newChat,
    renameChat,
    messages,
    sendMessage,
    isLoading,
  };
});