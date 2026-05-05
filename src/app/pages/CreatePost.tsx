import React, { useEffect, useState } from "react";
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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isCloseFriends, setIsCloseFriends] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    
    // Immediate upload
    try {
      console.log("☁️ Uploading post image...");
      const formData = new FormData();
      formData.append("image", f);
      const data = await api.upload<{ url: string }>("/upload", formData);
      setImageUrl(data.url);
      console.log("✅ Image uploaded:", data.url);
    } catch (err) {
      console.error("❌ Image upload failed:", err);
    }
  };

  const handleSubmit = async () => {
    if (!caption.trim()) { setError("Please write something for your post."); return; }
    setError(""); setSubmitting(true);
    try {
      console.log("🚀 Creating new post...");
      
      console.log("📤 Sending post request to /api/posts...");
      await api.post("/posts", {
        caption: caption.trim(),
        isCloseFriends,
        imageUrl
      });
      console.log("✅ Post created!");
      navigate("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-2xl md:border border-zinc-200 dark:border-white/10 flex flex-col transition-colors duration-300">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-900 dark:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-semibold text-lg text-zinc-900 dark:text-white">New Post</span>
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !caption.trim()}>
          {submitting ? "Sharing…" : "Share"}
        </Button>
      </div>

      {error && <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <div className="p-4 flex-1">
        <div className="flex gap-4">
          <Avatar src={user.avatar} />
          <textarea
            className="flex-1 text-lg text-zinc-900 dark:text-white placeholder:text-zinc-500 bg-transparent focus:outline-none resize-none min-h-[100px] pt-1 transition-colors"
            placeholder="What's going on around campus?"
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {preview ? (
          <div className="relative mt-4 ml-14 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 group">
            <img src={preview} className="w-full max-h-[400px] object-cover" alt="Upload preview" />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mt-4 ml-14">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-200 dark:border-white/20 rounded-2xl text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-white/40 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10"
            >
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Click to upload a photo</span>
              <span className="text-xs mt-1 text-zinc-400">PNG, JPG, WebP up to 10MB</span>
            </button>
          </div>
        )}

        <div className="mt-6 ml-14 flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-white/10">
          <div className="flex flex-col">
            <span className="font-semibold text-zinc-900 dark:text-white text-sm">Close Friends Only</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Only your close friends will see this post.</span>
          </div>
          <button
            onClick={() => setIsCloseFriends(!isCloseFriends)}
            className={`w-11 h-6 rounded-full relative shadow-inner transition-colors duration-300 ${isCloseFriends ? "bg-emerald-500/50" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300 ${isCloseFriends ? "right-1 bg-emerald-400" : "left-1 bg-white"}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
