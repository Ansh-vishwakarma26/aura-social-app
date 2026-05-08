import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Image } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { PostCard } from "../components/PostCard";
import { Avatar } from "../components/ui/Avatar";

export const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await api.get<{ posts: any[] }>('/posts/feed');
      setPosts(data.posts);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handlePostUpdate = useCallback((updatedPost: any) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  }, []);

  return (
    <div className="w-full pb-8">
      {/* Quick Post Creator — desktop floating card, mobile tap-to-create */}
      <div className="hidden md:flex bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-3xl p-4 mb-6 items-center gap-4 transition-colors duration-300">
        {user && <Avatar src={user.avatar || user.avatar_url} alt={user.username} />}
        <Link to="/create" className="flex-1 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 backdrop-blur-md shadow-inner transition-colors rounded-full px-4 py-2.5 text-zinc-500 dark:text-zinc-300 text-sm text-left border border-zinc-200 dark:border-white/10">
          What's on your mind?
        </Link>
        <Link to="/create" className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
          <Image className="w-6 h-6" />
        </Link>
      </div>

      {/* Mobile Post Creator — compact version */}
      <div className="md:hidden flex bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border-b border-zinc-200 dark:border-white/10 px-4 py-3 items-center gap-3 transition-colors duration-300 mb-0.5">
        {user && <Avatar src={user.avatar || user.avatar_url} alt={user.username} className="w-8 h-8 shrink-0" />}
        <Link
          to="/create"
          className="flex-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-full px-4 py-2 text-zinc-400 dark:text-zinc-500 text-sm text-left border border-zinc-200 dark:border-white/10"
        >
          What's on your mind?
        </Link>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <div className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        posts.map(post => <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />)
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-white/10 backdrop-blur-md border border-zinc-200 dark:border-white/10 shadow-sm rounded-full flex items-center justify-center mb-4 text-zinc-400 dark:text-zinc-500">
            <Image className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No posts yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">Follow more friends and groups to see their updates here.</p>
          <Link to="/explore" className="text-emerald-400 font-semibold hover:underline">Explore Aura</Link>
        </div>
      )}
    </div>
  );
};
