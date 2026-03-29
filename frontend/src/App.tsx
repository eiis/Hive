import { useGroupStore } from "./store/groupStore";
import { HomePage } from "./pages/HomePage";
import { CreateSpacePage } from "./pages/CreateSpacePage";
import { WorkspacePage } from "./pages/WorkspacePage";

export default function App() {
  const page = useGroupStore((s) => s.currentPage);

  switch (page.name) {
    case "home":
      return <HomePage />;
    case "create":
      return <CreateSpacePage />;
    case "workspace":
      return <WorkspacePage groupId={page.groupId} />;
  }
}
