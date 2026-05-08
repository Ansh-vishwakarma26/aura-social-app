import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ImageIcon, X } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";

export const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isCloseFriends, setIsCloseFriends] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("image", f);
      const data = await api.upload<{ url: string }>("/upload", formData);
      setImageUrl(data.url);
    } catch (err) {
      setError("Image upload failed. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!caption.trim()) { setError("Please write something for your post."); return; }
    setError(""); setSubmitting(true);
    try {
      await api.post("/posts", {
        caption: caption.trim(),
        isCloseFriends,
        imageUrl
      });
      navigate("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl min-h-dvh md:min-h-0 md:rounded-2xl md:border border-zinc-200 dark:border-white/10 flex flex-col transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-3 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-1 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 active:bg-zinc-200 text-zinc-900 dark:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Cancel"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-semibold text-lg text-zinc-900 dark:text-white">New Post</span>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !caption.trim() || uploading}
          className="px-5"
        >
          {submitting ? "Sharing…" : "Share"}
        </Button>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="p-4 flex-1">
        {/* Caption row */}
        <div className="flex gap-3 mb-5">
          <Avatar src={user.avatar || user.avatar_url} className="shrink-0" />
          <textarea
            className="flex-1 text-[17px] text-zinc-900 dark:text-white placeholder:text-zinc-400 bg-transparent focus:outline-none resize-none min-h-[80px] pt-1 transition-colors leading-relaxed"
            placeholder="What's going on around campus?"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            style={{ fontSize: '16px' }}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Image preview / upload zone */}
        {preview ? (
          <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 group mb-5">
            <img src={preview} className="w-full max-h-[60vw] object-cover" alt="Upload preview" />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <button
              onClick={() => { setPreview(null); setImageUrl(null); }}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 transition-opacity min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-200 dark:border-white/20 rounded-2xl text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-white/40 hover:text-zinc-600 dark:hover:text-zinc-300 active:border-zinc-400 transition-colors bg-zinc-50 dark:bg-white/5 mb-5"
          >
            <ImageIcon className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Tap to add a photo</span>
            <span className="text-xs mt-1 text-zinc-400">PNG, JPG, WebP up to 10MB</span>
          </button>
        )}

        {/* Close Friends toggle */}
        <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-white/10">
          <div className="flex flex-col mr-4">
            <span className="font-semibold text-zinc-900 dark:text-white text-sm">Close Friends Only</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Only your close friends will see this.</span>
          </div>
          <button
            onClick={() => setIsCloseFriends(!isCloseFriends)}
            className={`w-12 h-7 rounded-full relative shadow-inner transition-colors duration-300 shrink-0 ${isCloseFriends ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
            role="switch"
            aria-checked={isCloseFriends}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full shadow-sm transition-all duration-300 ${isCloseFriends ? "right-1 bg-white" : "left-1 bg-white dark:bg-zinc-400"}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
