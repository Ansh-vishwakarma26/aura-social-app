import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { TrendingUp, Users } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";

export const Explore = () => {
  const { user } = useAuth();
  const [trending, setTrending] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ posts: any[] }>('/explore/trending'),
      api.get<{ users: any[] }>('/explore/suggested'),
    ]).then(([t, s]) => {
      setTrending(t.posts);
      setSuggested(s.users);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleFollow = async (targetUser: any) => {
    try {
      if (targetUser.isFollowing) {
        await api.delete(`/users/${targetUser.username}/follow`);
      } else {
        await api.post(`/users/${targetUser.username}/follow`);
      }
      setSuggested(prev => prev.map(u => u.id === targetUser.id ? { ...u, isFollowing: !targetUser.isFollowing } : u));
    } catch {}
  };

  return (
    <div className="pb-8">
      <div className="hidden md:block mb-6 px-4 md:px-0">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Explore</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Discover what's happening in your world</p>
      </div>

      <div className="space-y-8">
        {/* Suggested */}
        <div className="px-4 md:px-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-zinc-900 dark:text-white">
              <Users className="w-5 h-5 text-emerald-400" /> Suggested Connections
            </h2>
            <Link to="/search" className="text-emerald-400 text-sm font-semibold hover:underline">See all</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {loading ? [1,2,3,4].map(i => (
              <div key={i} className="snap-start flex-shrink-0 w-36 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 rounded-3xl p-4 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-auto mb-3" />
                <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700 mx-auto mb-2" />
                <div className="h-3 w-12 rounded bg-zinc-200 dark:bg-zinc-700 mx-auto" />
              </div>
            )) : suggested.map(u => (
              <div key={u.id} className="snap-start flex-shrink-0 w-36 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-sm rounded-3xl p-4 flex flex-col items-center text-center transition-colors duration-300">
                <Avatar src={u.avatar || u.avatar_url} size="lg" className="mb-3" />
                <Link to={`/profile/${u.username}`} className="font-semibold text-sm text-zinc-900 dark:text-white hover:underline line-clamp-1 w-full">{u.username}</Link>
                <div className="text-xs text-zinc-500 mb-2 line-clamp-1 w-full">{u.fullName}</div>
                <span className="px-2 py-1 mb-2 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">{u.mbti}</span>
                <Button size="sm" variant={u.isFollowing ? "secondary" : "default"} className="w-full text-xs h-7" onClick={() => handleFollow(u)}>
                  {u.isFollowing ? "Following" : "Follow"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Trending */}
        <div className="px-0 md:px-0">
          <div className="flex items-center gap-2 mb-4 px-4 md:px-0">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-lg text-zinc-900 dark:text-white">Trending in Aura</h2>
          </div>
          <div className="grid grid-cols-3 gap-0.5 sm:gap-2">
            {loading ? [1,2,3,4,5].map(i => (
              <div key={i} className={`aspect-square rounded-xl bg-zinc-200 dark:bg-zinc-700 animate-pulse ${i === 0 ? 'col-span-2 row-span-2' : ''}`} />
            )) : trending.slice(0, 7).map((post, i) => (
              <Link
                to={`/post/${post.id}`}
                key={post.id}
                className={`relative bg-zinc-100 dark:bg-zinc-800/50 group aspect-square overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-colors ${i === 0 ? "col-span-2 row-span-2" : "col-span-1"}`}
              >
                {post.image && <img src={post.image} className="w-full h-full object-cover" alt="Trending" />}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white font-semibold text-sm">
                    ❤️ {post.likes}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
