import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { AgentPanel } from "../components/AgentPanel/AgentPanel";
import { ChatWindow } from "../components/Chat/ChatWindow";
import { TaskTree } from "../components/TaskTree/TaskTree";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAgentStore } from "../store/agentStore";
import { useMessageStore } from "../store/messageStore";
import { useGroupStore } from "../store/groupStore";

interface WorkspacePageProps {
  groupId: string;
}

export function WorkspacePage({ groupId }: WorkspacePageProps) {
  const { sendMessage } = useWebSocket();
  const setAgents = useAgentStore((s) => s.setAgents);
  const setTasks = useAgentStore((s) => s.setTasks);
  const setObjective = useAgentStore((s) => s.setObjective);
  const setMessages = useMessageStore((s) => s.setMessages);
  const navigate = useGroupStore((s) => s.navigate);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const [groupRes, msgRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch(`/api/groups/${groupId}/messages`),
        ]);
        if (groupRes.ok) {
          const group = await groupRes.json();
          setAgents(group.agents || []);
          setTasks(group.context?.tasks || []);
          setObjective(group.context?.objective || "");
        }
        if (msgRes.ok) {
          const msgs = await msgRes.json();
          setMessages(msgs);
        }
      } catch (e) {
        console.error("Failed to fetch workspace state:", e);
      }
    };
    fetchState();

    return () => {
      setAgents([]);
      setTasks([]);
      setMessages([]);
      setObjective("");
    };
  }, [groupId, setAgents, setTasks, setMessages, setObjective]);

  const handleSend = (content: string, target: string) => {
    sendMessage(content, target, groupId);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-11 bg-gray-900/90 border-b border-gray-800 flex items-center px-4 shrink-0">
        <button
          onClick={() => navigate({ name: "home" })}
          className="text-gray-500 hover:text-gray-300 transition-colors mr-3"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-hive-500 font-bold text-lg">Hive</span>
          <span className="text-gray-600 text-xs">Space: {groupId}</span>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <AgentPanel groupId={groupId} />
        <div className="flex-1 flex flex-col">
          <ChatWindow onSend={handleSend} />
          <TaskTree />
        </div>
      </div>
    </div>
  );
}
