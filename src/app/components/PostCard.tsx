import React from "react";
import { Link } from "react-router";
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Star } from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { cn } from "../lib/utils";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface PostCardProps {
  post: any;
  className?: string;
  isDetailed?: boolean;
  onUpdate?: (post: any) => void;
}

export const PostCard = ({ post, className, isDetailed = false, onUpdate }: PostCardProps) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = React.useState(post.isLiked);
  const [likes, setLikes] = React.useState(post.likes);
  const [isSaved, setIsSaved] = React.useState(post.isSaved);
  const [saving, setSaving] = React.useState(false);

  const handleLike = async () => {
    if (!user) return;
    const next = !isLiked;
    setIsLiked(next);
    setLikes((l: number) => next ? l + 1 : l - 1);
    try {
      if (next) {
        const r = await api.post<{ likes: number }>(`/posts/${post.id}/like`);
        setLikes(r.likes);
      } else {
        const r = await api.delete<{ likes: number }>(`/posts/${post.id}/like`);
        setLikes(r.likes);
      }
      onUpdate?.({ ...post, isLiked: next, likes: next ? post.likes + 1 : post.likes - 1 });
    } catch {
      setIsLiked(!next);
      setLikes((l: number) => next ? l - 1 : l + 1);
    }
  };

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) await api.post(`/posts/${post.id}/bookmark`);
      else await api.delete(`/posts/${post.id}/bookmark`);
      onUpdate?.({ ...post, isSaved: next });
    } catch {
      setIsSaved(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn(
      "bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border-b sm:border border-zinc-200 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] sm:rounded-3xl pb-3 sm:mb-4 overflow-hidden transition-colors duration-300",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/profile/${post.user.username}`} className="flex items-center gap-3 group min-w-0 flex-1">
          <Avatar src={post.user.avatar || post.user.avatar_url} alt={post.user.username} className="shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-semibold text-[15px] text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors truncate">
                {post.user.username}
              </div>
              {post.isCloseFriends && (
                <div className="flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold border border-emerald-500/20 shrink-0">
                  <Star className="w-3 h-3 mr-1 fill-emerald-500 text-emerald-500" />
                  Close Friends
                </div>
              )}
            </div>
            <div className="text-xs text-zinc-500">{post.timestamp}</div>
          </div>
        </Link>
        {/* 44px touch target for more button */}
        <button
          className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 active:text-zinc-600 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full -mr-2"
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      {post.image && (
        <div className="w-full bg-black/5 dark:bg-white/5">
          <img
            src={post.image}
            alt="Post content"
            className="w-full h-auto object-cover"
            style={{ maxHeight: '70vw', minHeight: '200px', objectFit: 'cover' }}
            loading="lazy"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
        <div className="flex items-center">
          {/* 44px touch targets for all action buttons */}
          <button
            onClick={handleLike}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] group rounded-full active:scale-90 transition-transform"
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart className={cn("w-6 h-6 transition-colors", isLiked ? "fill-red-500 text-red-500" : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200")} />
          </button>
          <Link
            to={`/post/${post.id}`}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] group rounded-full"
            aria-label="Comments"
          >
            <MessageCircle className="w-6 h-6 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200" />
          </Link>
          <button
            className="flex items-center justify-center min-w-[44px] min-h-[44px] group rounded-full"
            aria-label="Share"
          >
            <Share2 className="w-6 h-6 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200" />
          </button>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] group rounded-full -mr-1 active:scale-90 transition-transform"
          aria-label={isSaved ? "Unsave" : "Save"}
        >
          <Bookmark className={cn("w-6 h-6 transition-colors", isSaved ? "fill-zinc-800 dark:fill-zinc-400 text-zinc-800 dark:text-zinc-400" : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200")} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-1">
        <div className="font-semibold text-sm mb-1 text-zinc-900 dark:text-white">{likes.toLocaleString()} likes</div>
        <div className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          <Link to={`/profile/${post.user.username}`} className="font-semibold mr-2 hover:underline text-zinc-900 dark:text-white">
            {post.user.username}
          </Link>
          <span>{post.caption}</span>
        </div>
        {!isDetailed && post.commentsCount > 0 && (
          <Link to={`/post/${post.id}`} className="text-zinc-500 dark:text-zinc-500 text-sm mt-1.5 block hover:text-zinc-800 dark:hover:text-zinc-300">
            View all {post.commentsCount} comments
          </Link>
        )}
      </div>
    </div>
  );
};
