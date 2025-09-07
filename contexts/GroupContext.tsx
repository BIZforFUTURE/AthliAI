import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RunShareCard {
  distance: number;
  duration: string;
  pace: string;
  date: string;
  athleteName: string;
  athletePhoto?: string;
}

export interface CommentItem {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  time: string;
}

interface Post {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  time: string;
  likes: number;
  comments: number;
  imageUrl?: string;
  runShare?: RunShareCard;
  commentsList?: CommentItem[];
  likedByMe?: boolean;
}

export interface Group {
  id: string;
  name: string;
  members: number;
  image: string;
  description?: string;
  lastActivity?: string;
  isMember: boolean;
  posts: Post[];
  isPrivate?: boolean;
  password?: string;
}

const mockGroups: Group[] = [];

const STORAGE_KEY = "groups";

export const [GroupProvider, useGroups] = createContextHook(() => {
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        console.log("Groups: loading from storage");
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Group[];
          if (Array.isArray(parsed)) {
            const normalized = parsed.map(g => ({
              ...g,
              isPrivate: g.isPrivate ?? false,
              password: g.password ?? undefined,
              posts: (g.posts ?? []).map(p => ({
                ...p,
                likedByMe: p.likedByMe ?? false,
                commentsList: p.commentsList ?? [],
                comments: typeof p.comments === 'number' ? p.comments : (p.commentsList ?? []).length,
              })),
            }));

            const hasHebrew = (txt: string) => /[\u0590-\u05FF]/.test(txt);
            let next = normalized;
            const hebrewGroups = normalized.filter(g => hasHebrew(g.name));
            if (hebrewGroups.length >= 1) {
              next = hebrewGroups.map(g => ({ ...g, isMember: true }));
            } else {
              next = normalized.filter(g => !["1","2","3"].includes(g.id) && !["Morning Runners","Marathon Training","Trail Blazers"].includes(g.name));
            }

            setGroups(next);
            if (JSON.stringify(next) !== JSON.stringify(parsed)) {
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              console.log("Groups: cleaned + persisted", next.length);
            } else {
              console.log("Groups: restored", next.length);
            }
          }
        }
      } catch (e) {
        console.log("Groups: load error", e);
      }
    })();
  }, []);

  const persist = async (val: Group[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      console.log("Groups: persisted", val.length);
    } catch (e) {
      console.log("Groups: persist error", e);
    }
  };

  const joinGroup = useCallback((groupId: string, passwordAttempt?: string): boolean => {
    console.log("joinGroup", groupId);
    let success = false;
    setGroups(prev => {
      const next = prev.map(group => {
        if (group.id !== groupId) return group;
        if (group.isMember) {
          success = true;
          return group;
        }
        if (group.isPrivate) {
          if ((group.password ?? "") !== (passwordAttempt ?? "")) {
            success = false;
            return group;
          }
        }
        success = true;
        return { ...group, isMember: true, members: group.members + 1 };
      });
      if (success) void persist(next);
      return next;
    });
    return success;
  }, []);

  const getGroup = useCallback((groupId: string) => {
    return groups.find(g => g.id === groupId);
  }, [groups]);

  const addPost = useCallback((
    groupId: string,
    content: string,
    imageUrl?: string,
    author?: { userName: string; userAvatar: string },
    runShare?: RunShareCard
  ) => {
    const newPost: Post = {
      id: Date.now().toString(),
      userName: author?.userName ?? "You",
      userAvatar: author?.userAvatar ?? "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400",
      content,
      time: "Just now",
      likes: 0,
      comments: 0,
      imageUrl,
      runShare,
      likedByMe: false,
      commentsList: [],
    };

    setGroups(prev => {
      const next = prev.map(group =>
        group.id === groupId
          ? { ...group, posts: [newPost, ...group.posts] }
          : group
      );
      void persist(next);
      return next;
    });
  }, []);

  const toggleLike = useCallback((groupId: string, postId: string) => {
    setGroups(prev => {
      const next = prev.map(group => {
        if (group.id !== groupId) return group;
        const posts = group.posts.map(p => {
          if (p.id !== postId) return p;
          const liked = !(p.likedByMe ?? false);
          const likes = (p.likes ?? 0) + (liked ? 1 : -1);
          return { ...p, likedByMe: liked, likes: Math.max(0, likes) };
        });
        return { ...group, posts };
      });
      void persist(next);
      return next;
    });
  }, []);

  const addComment = useCallback((
    groupId: string,
    postId: string,
    comment: { userName: string; userAvatar: string; text: string }
  ) => {
    const newComment: CommentItem = {
      id: Date.now().toString(),
      userName: comment.userName,
      userAvatar: comment.userAvatar,
      text: comment.text,
      time: "Just now",
    };
    setGroups(prev => {
      const next = prev.map(group => {
        if (group.id !== groupId) return group;
        const posts = group.posts.map(p => {
          if (p.id !== postId) return p;
          const list = (p.commentsList ?? []);
          const updated = [newComment, ...list];
          return { ...p, commentsList: updated, comments: updated.length };
        });
        return { ...group, posts };
      });
      void persist(next);
      return next;
    });
  }, []);

  const createGroup = useCallback((payload: { name: string; description?: string; image?: string; isPrivate?: boolean; password?: string }) => {
    const id = Date.now().toString();
    const image = payload.image ?? "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=400";
    const newGroup: Group = {
      id,
      name: payload.name,
      members: 1,
      image,
      description: payload.description,
      lastActivity: "Just created",
      isMember: true,
      posts: [],
      isPrivate: payload.isPrivate ?? false,
      password: payload.isPrivate ? (payload.password ?? "") : undefined,
    };
    console.log("createGroup", newGroup);
    setGroups(prev => {
      const next = [newGroup, ...prev];
      void persist(next);
      return next;
    });
    return newGroup;
  }, []);

  const updateGroupImage = useCallback((groupId: string, image: string) => {
    setGroups(prev => {
      const next = prev.map(g => (g.id === groupId ? { ...g, image } : g));
      void persist(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups.filter(g =>
      g.name.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q)
    );
  }, [groups, query]);

  const updateGroupSettings = useCallback((groupId: string, settings: { isPrivate: boolean; password?: string }) => {
    setGroups(prev => {
      const next = prev.map(g => {
        if (g.id !== groupId) return g;
        const nextPrivate = settings.isPrivate;
        const nextPassword = nextPrivate ? (settings.password ?? g.password ?? "") : undefined;
        return { ...g, isPrivate: nextPrivate, password: nextPassword };
      });
      void persist(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ groups: filtered, joinGroup, getGroup, addPost, toggleLike, addComment, createGroup, updateGroupImage, updateGroupSettings, setQuery }), [filtered, joinGroup, getGroup, addPost, toggleLike, addComment, createGroup, updateGroupImage, updateGroupSettings, setQuery]);
  return value;
});