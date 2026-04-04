import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import type { WorkflowView } from "@valid8/shared";
import { listWorkflows } from "./api.ts";
import Sidebar from "./components/Sidebar.tsx";
import NewWorkflow from "./pages/NewWorkflow.tsx";
import WorkflowViewPage from "./pages/WorkflowView.tsx";
import CallPage from "./pages/CallPage.tsx";
import TranscriptsPage from "./pages/TranscriptsPage.tsx";

function MainLayout({ workflows }: { workflows: WorkflowView[] }) {
  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      <Sidebar workflows={workflows} />
      <main className="flex-1 min-w-0 h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const [workflows, setWorkflows] = useState<WorkflowView[]>([]);

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .catch((e) => {
        console.error("[Valid8] listWorkflows failed", e);
      });
    const id = setInterval(() => {
      listWorkflows()
        .then(setWorkflows)
        .catch((e) => {
          console.error("[Valid8] listWorkflows poll failed", e);
        });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <Routes>
      <Route path="/call/:contactId" element={<CallPage />} />
      <Route element={<MainLayout workflows={workflows} />}>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<NewWorkflow />} />
        <Route path="/transcripts" element={<TranscriptsPage />} />
        <Route path="/workflow/:id" element={<WorkflowViewPage />} />
      </Route>
    </Routes>
  );
}
