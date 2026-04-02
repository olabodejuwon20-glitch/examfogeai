import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, BookOpen, Trophy, Users, Zap } from "lucide-react";

const TABS = [
  { to: "/dashboard",      icon: LayoutDashboard, label: "Home" },
  { to: "/leaderboard",    icon: Trophy,          label: "Ranks" },
  { fab: true,             label: "Create" },
  { to: "/resource-bank",  icon: BookOpen,        label: "Resources" },
  { to: "/referral",       icon: Users,           label: "Invite" },
];

export default function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        {TABS.map((tab, i) => {
          if (tab.fab) return (
            <Link key="fab" to="/create-test" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none" }}>
              <div className="nav-fab"><Zap size={22} fill="white" /></div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "hsl(var(--primary))" }}>Create</span>
            </Link>
          );
          const Icon = tab.icon!;
          const active = pathname === tab.to;
          return (
            <Link key={tab.to} to={tab.to!} className={`mobile-nav-item ${active ? "active" : ""}`}>
              <div className="nav-icon-bg">
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="mobile-nav-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
