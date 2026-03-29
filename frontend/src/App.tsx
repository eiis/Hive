import { useEffect } from "react";
import { useGroupStore } from "./store/groupStore";
import { HomePage } from "./pages/HomePage";
import { CreateSpacePage } from "./pages/CreateSpacePage";
import { WorkspacePage } from "./pages/WorkspacePage";

export default function App() {
  const page = useGroupStore((s) => s.currentPage);
  const syncFromUrl = useGroupStore((s) => s.syncFromUrl);

  useEffect(() => {
    const onPopState = () => syncFromUrl();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [syncFromUrl]);

  switch (page.name) {
    case "home":
      return <HomePage />;
    case "create":
      return <CreateSpacePage />;
    case "workspace":
      return <WorkspacePage groupId={page.groupId} />;
  }
}
