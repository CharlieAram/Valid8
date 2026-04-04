import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard.tsx";
import WorkflowDetail from "./pages/WorkflowDetail.tsx";
import NewWorkflow from "./pages/NewWorkflow.tsx";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="border-b border-gray-200 h-12 flex items-center px-5">
        <Link to="/" className="text-sm font-semibold">
          Valid8
        </Link>
      </nav>
      <div className="max-w-3xl mx-auto px-5 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewWorkflow />} />
          <Route path="/workflow/:id" element={<WorkflowDetail />} />
        </Routes>
      </div>
    </div>
  );
}
