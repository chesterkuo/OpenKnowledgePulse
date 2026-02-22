import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{name}</h2>
        <p className="text-gray-500">Coming soon</p>
      </div>
    </div>
  );
}

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
          <Route path="/import" element={<Placeholder name="Import" />} />
          <Route path="/test/:id" element={<Placeholder name="Test Sandbox" />} />
          <Route path="/settings" element={<Placeholder name="Settings" />} />
        </Routes>
      </main>
    </div>
  );
}
