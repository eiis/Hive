import { create } from "zustand";
import type { ChatMessage } from "../types";

interface StreamingMessage {
  streamId: string;
  sender: string;
  content: string;
  groupId: string;
}

interface MessageStore {
  messages: ChatMessage[];
  streaming: Record<string, StreamingMessage>;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  updateStream: (streamId: string, sender: string, accumulated: string, groupId: string) => void;
  endStream: (streamId: string) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  streaming: {},

  addMessage: (msg) =>
    set((state) => {
      if (state.messages.some((m) => m.id === msg.id)) return state;
      return { messages: [...state.messages, msg] };
    }),

  setMessages: (msgs) => set({ messages: msgs }),

  updateStream: (streamId, sender, accumulated, groupId) =>
    set((state) => ({
      streaming: {
        ...state.streaming,
        [streamId]: { streamId, sender, content: accumulated, groupId },
      },
    })),

  endStream: (streamId) =>
    set((state) => {
      const { [streamId]: _, ...rest } = state.streaming;
      return { streaming: rest };
    }),
}));
