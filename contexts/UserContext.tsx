import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useMemo, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  name: string;
  weeklyGoal: number;
  avatar?: string;
  groupAliases: Record<string, string>;
  email?: string;
  phone?: string;
  isAuthenticated: boolean;
}

const STORAGE_KEY = "athliai.user.v2" as const;
const LEGACY_KEYS = ["user", "athliai.user.v1"] as const;

export const [UserProvider, useUser] = createContextHook(() => {
  const [user, setUser] = useState<User>({
    id: "1",
    name: "Runner",
    weeklyGoal: 20,
    avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400",
    groupAliases: {},
    email: undefined,
    phone: undefined,
    isAuthenticated: false,
  });

  useEffect(() => {
    (async () => {
      try {
        console.log("User: loading from storage");
        let stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) {
          for (const k of LEGACY_KEYS) {
            const legacy = await AsyncStorage.getItem(k);
            if (legacy) {
              console.log("User: migrating from legacy key", k);
              stored = legacy;
              await AsyncStorage.setItem(STORAGE_KEY, legacy);
              await AsyncStorage.removeItem(k);
              break;
            }
          }
        }
        if (stored) {
          let parsed: Partial<User> | undefined;
          try {
            parsed = JSON.parse(stored) as Partial<User>;
          } catch (e) {
            console.log("User: JSON parse failed, resetting", e);
          }
          const restored: User = {
            id: parsed?.id ?? "1",
            name: (parsed?.name ?? "Runner").toString(),
            weeklyGoal: parsed?.weeklyGoal ?? 20,
            avatar: parsed?.avatar ?? "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400",
            groupAliases: parsed?.groupAliases ?? {},
            email: parsed?.email,
            phone: parsed?.phone,
            isAuthenticated: parsed?.isAuthenticated ?? false,
          };
          setUser(restored);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
          console.log("User: restored", restored.name, restored.isAuthenticated);
        } else {
          const existsNow = await AsyncStorage.getItem(STORAGE_KEY);
          if (!existsNow) {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
            console.log("User: initialized to storage");
          } else {
            console.log("User: init skipped, value already set");
          }
        }
      } catch (error) {
        console.error("User: load error", error);
      }
    })();
  }, []);

  const persist = async (val: User) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      console.log("User: persisted", val.name, val.isAuthenticated);
    } catch (e) {
      console.log("User: persist error", e);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    setUser(prev => {
      const safeName = updates.name?.trim();
      const nextName = safeName === undefined ? prev.name : safeName || prev.name;
      const next: User = {
        ...prev,
        ...updates,
        name: nextName,
        groupAliases: updates.groupAliases ?? prev.groupAliases,
        isAuthenticated: updates.isAuthenticated ?? prev.isAuthenticated,
        email: updates.email ?? prev.email,
        phone: updates.phone ?? prev.phone,
      };
      void persist(next);
      return next;
    });
  };

  const setGroupAlias = async (groupId: string, alias: string) => {
    setUser(prev => {
      const clean = alias.trim();
      const next: User = { ...prev, groupAliases: { ...prev.groupAliases, [groupId]: clean } };
      void persist(next);
      return next;
    });
  };

  const loginWithEmail = useCallback(async (email: string) => {
    const clean = email.trim().toLowerCase();
    setUser(prev => {
      const next: User = { ...prev, email: clean, phone: undefined, isAuthenticated: true };
      void persist(next);
      return next;
    });
  }, []);

  const loginWithPhone = useCallback(async (phone: string) => {
    const clean = phone.replace(/\s+/g, "");
    setUser(prev => {
      const next: User = { ...prev, phone: clean, email: undefined, isAuthenticated: true };
      void persist(next);
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    setUser(prev => {
      const next: User = { ...prev, isAuthenticated: false };
      void persist(next);
      return next;
    });
  }, []);

  const getDisplayNameForGroup = useMemo(() => {
    return (groupId?: string) => {
      if (!groupId) return user.name;
      const alias = user.groupAliases[groupId];
      return (alias?.trim() || user.name) as string;
    };
  }, [user]);

  return { user, updateUser, setGroupAlias, getDisplayNameForGroup, loginWithEmail, loginWithPhone, logout };
});