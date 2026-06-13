import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, FileText, Send, LayoutDashboard, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/templates", label: "Templates", icon: FileText },
  { path: "/campaigns", label: "Campaigns", icon: Send },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600" onClick={closeSidebar}>
            <Mail className="w-6 h-6" />
            MailSender
          </Link>
          <button className="lg:hidden p-1 text-gray-400 hover:text-gray-600" onClick={closeSidebar}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 rounded"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-bold text-indigo-600">MailSender</span>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
