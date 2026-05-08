import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search as SearchIcon, X } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";

export const SearchPage = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<{ users: any[] }>(`/users/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data.users);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const handleFollow = async (targetUser: any) => {
    try {
      if (targetUser.isFollowing) {
        await api.delete(`/users/${targetUser.username}/follow`);
      } else {
        await api.post(`/users/${targetUser.username}/follow`);
      }
      setResults(prev => prev.map(u => u.id === targetUser.id ? { ...u, isFollowing: !targetUser.isFollowing } : u));
    } catch {}
  };

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl min-h-dvh md:min-h-0 md:rounded-2xl md:border border-zinc-200 dark:border-white/10 p-4 transition-colors duration-300">
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-zinc-500" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-3 border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 placeholder-zinc-500 text-zinc-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-white/20 focus:border-transparent sm:text-sm transition-colors"
          placeholder="Search people by name or username…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 min-w-[44px] min-h-[44px] justify-center"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-500 mb-4 px-2 uppercase tracking-wider">
          {query ? "Results" : "Suggested"}
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          results.map(u => (
            <div key={u.id} className="flex items-center justify-between p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors">
              <Link to={`/profile/${u.username}`} className="flex items-center gap-3">
                <Avatar src={u.avatar || u.avatar_url} size="md" />
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white">{u.username}</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">{u.fullName}</div>
                </div>
              </Link>
              {u.id !== user?.id && (
                <Button size="sm" variant={u.isFollowing ? "secondary" : "default"} className="px-5" onClick={() => handleFollow(u)}>
                  {u.isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-zinc-500 text-sm">
            {query ? `No users found for "${query}"` : "Start typing to search"}
          </div>
        )}
      </div>
    </div>
  );
};
