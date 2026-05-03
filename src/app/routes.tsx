import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { MainLayout, AuthLayout } from "./layouts/Layouts";
import { Login, Signup } from "./pages/Auth";
import { Home } from "./pages/Home";
import { PostDetail } from "./pages/PostDetail";
import { Profile } from "./pages/Profile";
import { Explore } from "./pages/Explore";
import { SearchPage } from "./pages/Search";
import { Notifications } from "./pages/Notifications";
import { CreatePost } from "./pages/CreatePost";
import { Settings } from "./pages/Settings";
import { Meet } from "./pages/Meet";
import { Messages } from "./pages/Messages";
import { useAuth } from "./contexts/AuthContext";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, element: <RequireAuth><Home /></RequireAuth> },
      { path: "post/:id", element: <RequireAuth><PostDetail /></RequireAuth> },
      { path: "profile/:username?", element: <RequireAuth><Profile /></RequireAuth> },
      { path: "explore", element: <RequireAuth><Explore /></RequireAuth> },
      { path: "meet", element: <RequireAuth><Meet /></RequireAuth> },
      { path: "messages", element: <RequireAuth><Messages /></RequireAuth> },
      { path: "messages/:username", element: <RequireAuth><Messages /></RequireAuth> },
      { path: "search", element: <RequireAuth><SearchPage /></RequireAuth> },
      { path: "notifications", element: <RequireAuth><Notifications /></RequireAuth> },
      { path: "create", element: <RequireAuth><CreatePost /></RequireAuth> },
      { path: "settings", element: <RequireAuth><Settings /></RequireAuth> },
    ],
  },
  {
    path: "/",
    Component: AuthLayout,
    children: [
      { path: "login", element: <GuestOnly><Login /></GuestOnly> },
      { path: "signup", element: <GuestOnly><Signup /></GuestOnly> },
    ],
  },
]);
