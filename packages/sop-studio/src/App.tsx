import { Link, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import TestSandbox from "./pages/TestSandbox";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-bold text-indigo-600">
                SOP Studio
              </Link>
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link to="/import" className="text-gray-600 hover:text-gray-900">
                Import
              </Link>
              <Link to="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/new" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/import" element={<Import />} />
          <Route path="/test/:id" element={<TestSandbox />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
