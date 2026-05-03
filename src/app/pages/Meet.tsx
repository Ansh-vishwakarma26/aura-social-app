import React, { useEffect, useState } from "react";
import { Zap, ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import { Link } from "react-router";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";

// MBTI compatibility matrix
const MBTI_COMPAT: Record<string, string[]> = {
  "ENFP": ["INFJ","INTJ","ENFJ","INFP"],
  "INTJ": ["ENFP","ENTP","INFP","INTP"],
  "ESFJ": ["ISFP","ESFP","ISFJ","ESFJ"],
  "INTP": ["ENTJ","ENTP","INFP","INTJ"],
  "ENFJ": ["INFP","ISFP","ENFP","INFJ"],
  "INFJ": ["ENFP","ENTP","INFJ","ENFJ"],
  "ENTP": ["INFJ","INTJ","INTP","ENFJ"],
  "INFP": ["ENFJ","ENTJ","ENFP","INFJ"],
  "ISTJ": ["ESFP","ESTP","ISFJ","ESTJ"],
  "ISFJ": ["ESFP","ESTP","ISTJ","ESFJ"],
  "ESTJ": ["ISFP","ISTP","ISTJ","ESFJ"],
  "ESFP": ["ISTJ","ISFJ","ESTP","ESFP"],
  "ISTP": ["ESFJ","ESTJ","ISFP","ESTP"],
  "ISFP": ["ENFJ","ESFJ","ESTJ","ISTP"],
  "ESTP": ["ISTJ","ISFJ","ISTP","ESTP"],
  "ENTJ": ["INFP","INTP","ENFP","INTJ"],
};

export const Meet = () => {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [passed, setPassed] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<{ users: any[] }>('/explore/suggested')
      .then(d => setAllUsers(d.users))
      .catch(() => setAllUsers([]))
      .finally(() => setLoading(false));
  }, []);

  // Filter to compatible MBTI types
  const compatibleUsers = allUsers.filter(u => {
    const compat = MBTI_COMPAT[currentUser?.mbti || ''] || [];
    return compat.includes(u.mbti) && !passed.has(u.id);
  });

  const current = compatibleUsers[currentIndex];

  const handleLike = () => {
    if (!current) return;
    setLiked(prev => new Set([...prev, current.id]));
    // Also follow the user
    api.post(`/users/${current.username}/follow`).catch(() => {});
    handleNext();
  };

  const handlePass = () => {
    if (!current) return;
    setPassed(prev => new Set([...prev, current.id]));
    handleNext();
  };

  const handleNext = () => {
    setCurrentIndex(i => (i < compatibleUsers.length - 1 ? i + 1 : 0));
  };

  const handlePrev = () => {
    setCurrentIndex(i => (i > 0 ? i - 1 : 0));
  };

  if (loading) return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-3xl overflow-hidden p-8 min-h-[500px] flex items-center justify-center animate-pulse">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-700 mx-auto mb-4" />
        <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-700 mx-auto mb-2" />
        <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-700 mx-auto" />
      </div>
    </div>
  );

  if (!compatibleUsers.length) {
    return (
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-3xl overflow-hidden p-8 flex flex-col items-center justify-center min-h-[500px] transition-colors duration-300">
        <Zap className="w-16 h-16 text-zinc-400 dark:text-zinc-500 mb-4" />
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">No Compatible Matches</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-center">No users with compatible MBTI types found yet. Check back as more people join!</p>
        <p className="text-sm text-zinc-400 mt-3">Your type: <span className="font-bold text-emerald-400">{currentUser?.mbti}</span></p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-3xl overflow-hidden pb-8 transition-colors duration-300">
      {/* Header */}
      <div className="px-6 py-6 border-b border-zinc-200 dark:border-white/10">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">Meet Your Match</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Find people compatible with your MBTI type · <span className="font-semibold text-emerald-400">{currentUser?.mbti}</span></p>
      </div>

      {/* Card */}
      <div className="px-6 py-8">
        {current && (
          <div className="bg-white dark:bg-gradient-to-br dark:from-zinc-800 dark:to-zinc-700 rounded-3xl overflow-hidden shadow-xl dark:shadow-2xl border border-zinc-200 dark:border-white/5">
            {/* Photo */}
            <div className="relative h-96 bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <img src={current.avatar} alt={current.fullName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-zinc-950 via-transparent to-transparent" />
              {/* Overlay info */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-3xl font-bold text-white mb-1">{current.fullName}</h2>
                <p className="text-white/80 mb-3">@{current.username}</p>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-500/30 border border-emerald-500/50 rounded-full text-sm font-bold text-emerald-400">{current.mbti}</span>
                  <span className="px-3 py-1 bg-white/20 border border-white/20 rounded-full text-sm text-white">{current.followers?.toLocaleString()} followers</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="p-6 border-t border-zinc-200 dark:border-white/10">
              <p className="text-zinc-700 dark:text-zinc-300 text-base leading-relaxed">{current.bio || "No bio yet."}</p>
            </div>

            {/* Compatibility badge */}
            <div className="px-6 py-3 bg-emerald-500/10 border-t border-zinc-200 dark:border-white/10 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold text-sm">MBTI Compatible Match!</span>
            </div>

            {/* Actions */}
            <div className="p-6 flex gap-4 border-t border-zinc-200 dark:border-white/10">
              <Button
                variant="secondary"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-100 dark:bg-white/10 border-zinc-200 dark:border-white/20 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-900 dark:text-white"
                onClick={handlePass}
              >
                <X className="w-5 h-5" /> Pass
              </Button>
              <Button
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
                onClick={handleLike}
              >
                <Heart className="w-5 h-5" /> Like & Follow
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-full bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/20 text-zinc-900 dark:text-white disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex-1 mx-4">
            <div className="flex gap-1">
              {compatibleUsers.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    idx === currentIndex
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : idx < currentIndex
                      ? "bg-emerald-500/40"
                      : "bg-zinc-200 dark:bg-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-3 text-center">
              {currentIndex + 1} / {compatibleUsers.length}
            </p>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === compatibleUsers.length - 1}
            className="p-3 rounded-full bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/20 text-zinc-900 dark:text-white disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Liked users */}
        {liked.size > 0 && (
          <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-white/10">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">People You Liked ({liked.size})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allUsers.filter(u => liked.has(u.id)).map(u => (
                <Link key={u.id} to={`/profile/${u.username}`} className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors shadow-sm">
                  <img src={u.avatar} alt={u.fullName} className="w-full h-32 object-cover" />
                  <div className="p-3">
                    <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{u.fullName}</p>
                    <p className="text-xs text-zinc-500 mb-1">@{u.username}</p>
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs font-semibold text-emerald-400">{u.mbti}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
