import { Link, useLocation } from "react-router-dom";
import { Eye, Camera, Upload, Clock } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Eye },
  { path: "/detect", label: "Live Detect", icon: Camera },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/history", label: "History", icon: Clock },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Eye className="h-6 w-6 text-[var(--primary)]" />
          <span>
            Vision<span className="text-[var(--primary)]">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
