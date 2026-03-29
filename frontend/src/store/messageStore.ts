import { create } from "zustand";
import type { ChatMessage } from "../types";

interface MessageStore {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],

  addMessage: (msg) =>
    set((state) => {
      // 按 id 去重
      if (state.messages.some((m) => m.id === msg.id)) return state;
      return { messages: [...state.messages, msg] };
    }),

  setMessages: (msgs) => set({ messages: msgs }),
}));
