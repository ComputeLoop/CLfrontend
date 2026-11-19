import { useEffect, useState } from "react";
import "./App.css";
import "./workspace/workspaces.css";
import AuthScreen from "./auth/AuthScreen";
import { useAuth } from "./context/useAuth";
import HelpPage from "./legal/HelpPage";
import { WorkspaceDashboard } from "./workspace/WorkspaceDashboard";

export default function App() {
  const [help, setHelp] = useState(window.location.hash === "#help");
  const { user, loading } = useAuth();
  useEffect(() => {
    const update = () => setHelp(window.location.hash === "#help");
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  if (help) return <HelpPage />;
  if (loading) return <main className="main-content">Loading Compute Loop…</main>;
  if (!user) return <AuthScreen />;
  return <WorkspaceDashboard key={user.id} />;
}
