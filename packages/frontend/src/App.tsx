import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { WorkflowView } from "@valid8/shared";
import { listWorkflows } from "./api.ts";
import Sidebar from "./components/Sidebar.tsx";
import NewWorkflow from "./pages/NewWorkflow.tsx";
import WorkflowViewPage from "./pages/WorkflowView.tsx";

export default function App() {
  const [workflows, setWorkflows] = useState<WorkflowView[]>([]);

  useEffect(() => {
    listWorkflows().then(setWorkflows).catch(() => {});
    const id = setInterval(() => listWorkflows().then(setWorkflows).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workflows={workflows} />
      <main className="flex-1 min-w-0 h-full overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/new" replace />} />
          <Route path="/new" element={<NewWorkflow />} />
          <Route path="/workflow/:id" element={<WorkflowViewPage />} />
        </Routes>
      </main>
    </div>
  );
}
