import React, { useEffect, useState } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Check, X, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";
import { Avatar } from "../components/ui/Avatar";
import { cn } from "../lib/utils";

export const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<{ notifications: any[] }>('/notifications'),
      api.get<{ requests: any[] }>('/users/me/requests')
    ]).then(([notifs, reqs]) => {
      setNotifications(notifs.notifications);
      setRequests(reqs.requests);
      if (notifs.notifications.some(n => !n.isRead)) {
        api.put('/notifications/read');
      }
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const handleRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      await api.post(`/users/requests/${requestId}/${action}`);
      setRequests(prev => prev.filter(r => r.requestId !== requestId));
    } catch {}
  };

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl min-h-dvh md:min-h-0 md:rounded-2xl md:border border-zinc-200 dark:border-white/10 pb-8 transition-colors duration-300">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-4 h-14 flex items-center">
        <h1 className="font-bold text-xl text-zinc-900 dark:text-white">Notifications</h1>
      </div>

      {loading ? (
        <div className="divide-y divide-zinc-100 dark:divide-white/5">
          {[1,2,3].map(i => (
            <div key={i} className="p-4 flex gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-1/4 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-white/5">
          {/* Follow Requests Section */}
          {requests.length > 0 && (
            <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border-b border-zinc-200 dark:border-white/10">
              <div className="p-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <Lock className="w-4 h-4" /> Follow Requests
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-white/5">
                {requests.map(req => (
                  <div key={req.requestId} className="p-4 flex items-center gap-3">
                    <button onClick={() => navigate(`/profile/${req.username}`)} className="shrink-0">
                      <Avatar src={req.avatar || req.avatar_url} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {req.fullName} <span className="text-zinc-500 font-normal">(@{req.username})</span>
                      </p>
                      <p className="text-xs text-zinc-500">wants to follow you</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleRequest(req.requestId, 'accept')}
                        className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 shadow-sm min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRequest(req.requestId, 'decline')}
                        className="p-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-700 min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications List */}
          {notifications.length > 0 ? notifications.map(n => (
            <div key={n.id} className={cn("px-4 py-3 flex gap-3 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5", !n.isRead && "bg-blue-50/50 dark:bg-white/[0.03]")}>
              {/* Avatar with type badge */}
              <div className="relative shrink-0">
                <Link to={`/profile/${n.user.username}`}>
                  <Avatar src={n.user.avatar || n.user.avatar_url} alt={n.user.username} />
                </Link>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 shadow-sm">
                  {n.type === "like" && <Heart className="w-3 h-3 fill-red-500 text-red-500" />}
                  {n.type === "comment" && <MessageCircle className="w-3 h-3 fill-blue-400 text-blue-400" />}
                  {(n.type === "follow" || n.type === "follow_request") && <UserPlus className="w-3 h-3 text-zinc-400" />}
                </div>
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="text-[14px] leading-snug text-zinc-700 dark:text-zinc-300 flex-1 min-w-0">
                  <Link to={`/profile/${n.user.username}`} className="font-semibold text-zinc-900 dark:text-white hover:underline mr-1">
                    {n.user.username}
                  </Link>
                  {n.type === "like" && "liked your post."}
                  {n.type === "comment" && <span>commented: <span className="text-zinc-500">"{n.text}"</span></span>}
                  {n.type === "follow" && "started following you."}
                  {n.type === "follow_request" && "requested to follow you."}
                  <div className="text-xs text-zinc-500 mt-0.5">{n.timestamp}</div>
                </div>

                {/* Post thumbnail */}
                {n.post && (
                  <Link to={`/post/${n.post.id}`} className="shrink-0">
                    <img
                      src={n.post.image}
                      className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg border border-zinc-200 dark:border-white/10"
                      alt="Post"
                      loading="lazy"
                    />
                  </Link>
                )}
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center text-zinc-500">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-400 dark:text-zinc-500">
                <Bell className="w-8 h-8" />
              </div>
              <p>No new notifications.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
