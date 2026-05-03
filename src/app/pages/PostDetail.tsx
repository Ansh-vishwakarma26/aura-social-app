import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { PostCard } from "../components/PostCard";
import { Avatar } from "../components/ui/Avatar";

export const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      const data = await api.get<{ post: any }>(`/posts/${id}`);
      setPost(data.post);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const handleComment = async () => {
    if (!commentText.trim() || submitting || !user) return;
    setSubmitting(true);
    try {
      const data = await api.post<{ comment: any }>(`/posts/${id}/comments`, { text: commentText.trim() });
      setPost((p: any) => ({
        ...p,
        comments: [...(p.comments || []), data.comment],
        commentsCount: (p.commentsCount || 0) + 1,
      }));
      setCommentText("");
    } catch {} finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-2xl overflow-hidden flex flex-col min-h-screen animate-pulse">
      <div className="h-14 border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80" />
      <div className="h-96 bg-zinc-200 dark:bg-zinc-700 m-4 rounded-2xl" />
    </div>
  );

  if (!post) return null;

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-2xl overflow-hidden flex flex-col min-h-screen md:min-h-[calc(100vh-4rem)] transition-colors duration-300">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-4 h-14 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-900 dark:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-semibold text-lg text-zinc-900 dark:text-white">Post</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        <PostCard post={post} isDetailed className="border-b-4 border-zinc-100 dark:border-white/5 md:border-b md:rounded-none md:mb-0" onUpdate={setPost} />

        <div className="p-4 space-y-4">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Comments</h3>
          {(post.comments || []).length > 0 ? (
            post.comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar src={comment.user.avatar} size="sm" className="mt-1" />
                <div className="flex-1">
                  <div className="bg-zinc-100/80 dark:bg-zinc-800/70 rounded-2xl rounded-tl-none px-4 py-2.5 inline-block">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-white mr-2">{comment.user.username}</span>
                    <span className="text-[15px] text-zinc-700 dark:text-zinc-300">{comment.text}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 ml-2">{comment.timestamp}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-zinc-500 py-8 text-sm">No comments yet. Be the first to start the conversation!</div>
          )}
        </div>
      </div>

      {user && (
        <div className="fixed md:absolute bottom-[68px] md:bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 p-3 flex gap-3 items-end pb-4 md:pb-3">
          <Avatar src={user.avatar} size="sm" className="mb-1" />
          <div className="flex-1 relative">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              placeholder={`Add a comment…`}
              className="w-full bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-white placeholder:text-zinc-500 rounded-2xl px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-200 dark:focus:ring-white/20 resize-none min-h-[44px] max-h-32 transition-colors"
              rows={1}
            />
            {commentText.trim() && (
              <button onClick={handleComment} disabled={submitting} className="absolute right-3 bottom-2.5 text-zinc-900 dark:text-white font-semibold p-1 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
