import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import TestSandbox from "./pages/TestSandbox";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `transition-colors pb-[1.125rem] ${
    isActive
      ? "text-kp-teal border-b-2 border-kp-teal"
      : "text-kp-muted hover:text-kp-teal"
  }`;

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-kp-dark">
      <nav className="bg-kp-navy border-b border-kp-border">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo + Desktop nav */}
            <div className="flex items-center space-x-8">
              <NavLink to="/" className="flex items-center space-x-2" end>
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="16" cy="14" rx="10" ry="11" fill="#0D2438"/>
                  <ellipse cx="16" cy="14" rx="9.5" ry="10.5" fill="#1A3C58" opacity="0.6"/>
                  <ellipse cx="13" cy="12.5" rx="3" ry="3.5" fill="#040C18"/>
                  <ellipse cx="19" cy="12.5" rx="3" ry="3.5" fill="#040C18"/>
                  <circle cx="13" cy="12.5" r="2.2" fill="#4ADEFF"/>
                  <circle cx="19" cy="12.5" r="2.2" fill="#4ADEFF"/>
                  <ellipse cx="13" cy="12.5" rx="1" ry="1.6" fill="#020810"/>
                  <ellipse cx="19" cy="12.5" rx="1" ry="1.6" fill="#020810"/>
                  <circle cx="12.3" cy="11.8" r="0.8" fill="white" opacity="0.8"/>
                  <circle cx="18.3" cy="11.8" r="0.8" fill="white" opacity="0.8"/>
                  <path d="M8,20 C6,22 5,24 4,26" stroke="#1E7EC8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M11,22 C10,24 9,26 8.5,28" stroke="#12B5A8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M16,23 C16,25 16,27 16,29" stroke="#18A06A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M21,22 C22,24 23,26 23.5,28" stroke="#E07A20" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M24,20 C26,22 27,24 28,26" stroke="#1E7EC8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
                <span className="font-mono text-kp-heading font-bold text-lg">KP</span>
              </NavLink>

              {/* Desktop links */}
              <div className="hidden md:flex items-center space-x-6 h-16 pt-[2px]">
                <NavLink to="/" className={navLinkClass} end>
                  Dashboard
                </NavLink>
                <NavLink to="/editor/new" className={navLinkClass}>
                  Editor
                </NavLink>
                <NavLink to="/import" className={navLinkClass}>
                  Import
                </NavLink>
                {/* Test sandbox requires an ID param, e.g. /test/some-id */}
                <NavLink to="/test/sandbox" className={navLinkClass}>
                  Test
                </NavLink>
                <NavLink to="/settings" className={navLinkClass}>
                  Settings
                </NavLink>
              </div>
            </div>

            {/* Right side: help + hamburger */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="text-kp-muted hover:text-kp-teal transition-colors w-8 h-8 flex items-center justify-center rounded-full border border-kp-border"
                aria-label="Help"
              >
                ?
              </button>

              {/* Mobile hamburger */}
              <button
                type="button"
                className="md:hidden text-kp-muted hover:text-kp-teal transition-colors"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  {menuOpen ? (
                    <>
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="6" y1="18" x2="18" y2="6" />
                    </>
                  ) : (
                    <>
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden pb-4 flex flex-col space-y-3">
              <NavLink to="/" className={navLinkClass} end onClick={() => setMenuOpen(false)}>
                Dashboard
              </NavLink>
              <NavLink to="/editor/new" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Editor
              </NavLink>
              <NavLink to="/import" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Import
              </NavLink>
              <NavLink to="/test/sandbox" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Test
              </NavLink>
              <NavLink to="/settings" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Settings
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/new" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/import" element={<Import />} />
          <Route path="/test/:id" element={<TestSandbox />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "#0C1A28",
            border: "1px solid #163248",
            color: "#C8DDF0",
          },
        }}
      />
    </div>
  );
}
