import { create } from "zustand";

export type FeedbackType = "success" | "error" | "info";

interface Notification {
  id: string;
  message: string;
  type: FeedbackType;
}

interface FeedbackState {
  notifications: Notification[];
  showFeedback: (message: string, type?: FeedbackType) => void;
  removeFeedback: (id: string) => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  notifications: [],
  showFeedback: (message, type = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4000);
  },
  removeFeedback: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
