import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import { Home, Search, Compass, PlusSquare, Heart, User, Settings, Zap, Moon, Sun, MessageCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar } from "./ui/Avatar";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { Logo } from "./ui/Logo";
import { useNotifications } from "../contexts/NotificationContext";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/search", icon: Search, label: "Search", mobileOnly: true },
  { path: "/explore", icon: Compass, label: "Explore" },
  { path: "/meet", icon: Zap, label: "Meet" },
  { path: "/messages", icon: MessageCircle, label: "Messages" },
  { path: "/create", icon: PlusSquare, label: "Create" },
  { path: "/notifications", icon: Heart, label: "Notifications" },
  { path: "/profile", icon: User, label: "Profile", isAvatar: true },
];

const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className={cn("w-10 h-10", className)} />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center",
        "bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10",
        "hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white shadow-sm",
        className
      )}
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 transition-transform duration-500 rotate-0 scale-100" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-500 rotate-0 scale-100" />
      )}
    </button>
  );
};

export const DesktopSidebar = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  return (
    <div className="hidden md:flex flex-col w-64 h-screen border-r border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-3xl fixed top-0 left-0 px-4 py-6 shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.4)] z-50 transition-colors duration-300">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center text-zinc-900 dark:text-white">
            <Logo className="w-8 h-8" />
          </div>
          <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">Aura</span>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          if (item.mobileOnly) return null;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-3 py-3 rounded-xl transition-all hover:bg-zinc-100 dark:hover:bg-white/10 hover:shadow-sm",
                  isActive ? "font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/5" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.isAvatar ? (
                    <Avatar src={user?.avatar || ''} alt={user?.username || ''} size="sm" className={isActive ? "ring-2 ring-blue-600 ring-offset-2" : ""} />
                  ) : (
                    <div className="relative">
                      <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5]" : "stroke-2")} />
                      {item.path === '/notifications' && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-zinc-900">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-[15px]">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-zinc-200 dark:border-white/10">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-4 px-3 py-3 rounded-xl transition-all hover:bg-zinc-100 dark:hover:bg-white/10 hover:shadow-sm",
              isActive ? "font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/5" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )
          }
        >
          <Settings className="w-6 h-6" />
          <span className="text-[15px]">Settings</span>
        </NavLink>
      </div>
    </div>
  );
};

export const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const hideOnPaths = ["/login", "/signup", "/create", "/settings"];
  if (hideOnPaths.includes(location.pathname)) return null;

  const mobileItems = [
    { path: "/", icon: Home },
    { path: "/search", icon: Search },
    { path: "/create", icon: PlusSquare },
    { path: "/explore", icon: Compass },
    { path: "/profile", icon: User, isAvatar: true },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-t border-zinc-200 dark:border-white/10 flex items-center justify-around z-50 px-2 pb-2 shadow-[0_-8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transition-colors duration-300">
      {mobileItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center p-2 rounded-full transition-transform active:scale-95",
              isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
            )
          }
        >
          {({ isActive }) => (
            <>
              {item.isAvatar ? (
                <Avatar
                  src={user?.avatar || ''}
                  alt={user?.username || ''}
                  size="sm"
                  className={cn("w-7 h-7", isActive ? "ring-2 ring-zinc-200 dark:ring-zinc-950 ring-offset-1" : "")}
                />
              ) : (
                <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5]" : "stroke-2")} />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
};

export const MobileTopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const hideOnPaths = ["/login", "/signup", "/create", "/settings", "/search"];
  
  if (hideOnPaths.includes(location.pathname)) return null;

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-b border-zinc-200 dark:border-white/10 h-14 flex items-center justify-between px-4 z-40 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 flex items-center justify-center text-zinc-900 dark:text-white">
          <Logo className="w-6 h-6" />
        </div>
        <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">Aura</span>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle className="bg-transparent border-none dark:bg-transparent dark:border-none p-1 shadow-none" />
        <button onClick={() => navigate('/notifications')} className="relative p-1 text-zinc-600 dark:text-zinc-300">
          <Heart className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950"></span>
          )}
        </button>
        <button onClick={() => navigate('/messages')} className="p-1 text-zinc-600 dark:text-zinc-300">
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
