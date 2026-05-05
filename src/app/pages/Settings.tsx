import React, { useState } from "react";
import { useNavigate } from "react-router";
import { LogOut, User, Lock, ChevronRight, Moon, Shield, Zap, Camera, AlertCircle, CheckCircle2, Palette, Image as ImageIcon, Bell, Mail, BellOff, UserX, MicOff, Star, Activity, HelpCircle, AlertTriangle, FileText, ShieldBan } from "lucide-react";
import { useTheme } from "next-themes";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/utils";

const MBTI_TYPES = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];

export const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, updateUser, logout } = useAuth();
  const [selectedMBTI, setSelectedMBTI] = useState(user?.mbti || 'INFP');
  const [showMBTISelector, setShowMBTISelector] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [pushEnabled, setPushEnabled] = useState(user?.pushEnabled ?? true);
  const [emailEnabled, setEmailEnabled] = useState(user?.emailEnabled ?? true);
  const [quietMode, setQuietMode] = useState(user?.quietMode ?? false);
  const [activityStatusEnabled, setActivityStatusEnabled] = useState(user?.activityStatusEnabled ?? true);

  const [coverColor, setCoverColor] = useState(user?.coverImage?.startsWith('#') ? user.coverImage : '#18181b');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(user?.coverImage && !user.coverImage.startsWith('#') ? user.coverImage : null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Block & Mute modal state
  const [blockMuteModal, setBlockMuteModal] = useState<"blocks" | "mutes" | "close-friends" | null>(null);
  const [blockMuteList, setBlockMuteList] = useState<any[]>([]);
  const [blockMuteLoading, setBlockMuteLoading] = useState(false);

  // Static pages modal state
  const [staticModal, setStaticModal] = useState<"help" | "report" | "terms" | null>(null);

  const fetchBlockMuteList = React.useCallback(async (type: "blocks" | "mutes" | "close-friends") => {
    setBlockMuteModal(type);
    setBlockMuteLoading(true);
    setBlockMuteList([]);
    try {
      const { users } = await api.get<{ users: any[] }>(`/users/me/${type}`);
      setBlockMuteList(users);
    } catch {} finally { setBlockMuteLoading(false); }
  }, []);

  const handleUnblockUnmute = async (username: string, type: "blocks" | "mutes" | "close-friends") => {
    try {
      const endpoint = type === 'blocks' ? 'block' : type === 'mutes' ? 'mute' : 'close-friend';
      await api.delete(`/users/${username}/${endpoint}`);
      setBlockMuteList(prev => prev.filter(u => u.username !== username));
    } catch {}
  };

  const fileRef = React.useRef<HTMLInputElement>(null);
  const coverFileRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
    
    // Immediate upload
    try {
      console.log("☁️ Uploading avatar...");
      const formData = new FormData();
      formData.append("avatar", f);
      const data = await api.upload<{ url: string }>("/upload", formData);
      setAvatarUrl(data.url);
      console.log("✅ Avatar uploaded:", data.url);
    } catch (err) {
      console.error("❌ Avatar upload failed:", err);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));

    // Immediate upload
    try {
      console.log("☁️ Uploading cover...");
      const formData = new FormData();
      formData.append("cover", f);
      const data = await api.upload<{ url: string }>("/upload", formData);
      setCoverUrl(data.url);
      console.log("✅ Cover uploaded:", data.url);
    } catch (err) {
      console.error("❌ Cover upload failed:", err);
    }
  };

  const handleSave = async () => {
    console.log("💾 Save button clicked");
    setSaving(true); setSaveMsg(null);
    try {
      console.log("🚀 Sending update request to /users/me...");
      const data = await api.put<{ user: any }>('/users/me', {
        fullName,
        username,
        bio,
        mbti: selectedMBTI,
        isPrivate,
        pushEnabled,
        emailEnabled,
        quietMode,
        activityStatusEnabled,
        avatarUrl,
        coverUrl,
        coverImage: !coverUrl ? coverColor : undefined
      });
      console.log("✅ Update successful:", data);
      updateUser(data.user);
      setSaveMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (e: any) {
      setSaveMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordStatus({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setPasswordSaving(true); setPasswordStatus(null);
    try {
      await api.put('/users/password', { currentPassword: passwordForm.current, newPassword: passwordForm.new });
      setPasswordStatus({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => { setShowPasswordModal(false); setPasswordForm({ current: '', new: '', confirm: '' }); setPasswordStatus(null); }, 2000);
    } catch (e: any) {
      setPasswordStatus({ type: 'error', text: e.message });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl min-h-screen md:min-h-0 md:rounded-2xl md:border border-zinc-200 dark:border-white/10 pb-8 transition-colors duration-300">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-4 h-14 flex items-center justify-between">
        <h1 className="font-bold text-xl text-zinc-900 dark:text-white">Settings</h1>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <div className="px-4 py-6 space-y-8 max-w-lg mx-auto">
        {saveMsg && (
          <div className={cn("flex items-center gap-2 p-3 rounded-xl text-sm border", saveMsg.type === 'success'
            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
            : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400")}>
            {saveMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {saveMsg.text}
          </div>
        )}

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <Avatar src={avatarPreview || user.avatar} size="xl" className="w-24 h-24" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-emerald-500 hover:underline">
            Change Photo
          </button>
          <div>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Full Name"
              className="text-center text-xl font-bold text-zinc-900 dark:text-white bg-transparent border-b border-transparent hover:border-zinc-200 dark:hover:border-white/20 focus:border-emerald-500 focus:outline-none transition-colors w-full"
            />
            <div className="flex items-center justify-center gap-1 text-zinc-500 dark:text-zinc-400">
              <span>@</span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                className="bg-transparent border-b border-transparent hover:border-zinc-200 dark:hover:border-white/20 focus:border-emerald-500 focus:outline-none transition-colors w-32"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Bio</h3>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            className="w-full bg-zinc-100/50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none placeholder:text-zinc-400 transition-colors"
            placeholder="Tell the world about yourself…"
          />
        </div>

        {/* Profile Customization */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Profile Customization</h3>
          
          <div className="space-y-3">
            {/* Cover Preview */}
            <div 
              className="h-32 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-white/10"
              style={!coverPreview ? { backgroundColor: coverColor } : {}}
            >
              {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover" alt="Cover preview" />
              ) : (
                <Palette className="w-8 h-8 text-white/20" />
              )}
            </div>

            {/* Edit Controls */}
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => coverFileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors border border-zinc-200 dark:border-white/10"
              >
                <ImageIcon className="w-4 h-4" />
                Upload Image
              </button>
              
              <div className="flex-1 relative overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
                <div className="w-full h-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors pointer-events-none">
                  <Palette className="w-4 h-4" />
                  Pick Color
                </div>
                <input 
                  type="color" 
                  value={coverColor.startsWith('#') ? coverColor : '#18181b'}
                  onChange={(e) => {
                    setCoverColor(e.target.value);
                    setCoverPreview(null);
                    setCoverFile(null);
                  }}
                  className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] cursor-pointer opacity-0"
                />
              </div>
            </div>
            <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>
        </div>

        {/* MBTI */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Personality Type</h3>
          <div className="bg-zinc-100/50 dark:bg-zinc-800/60 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10">
            <button
              onClick={() => setShowMBTISelector(!showMBTISelector)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <Zap className="w-5 h-5" /> MBTI Type
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-sm font-bold text-emerald-400">{selectedMBTI}</span>
                <ChevronRight className={cn("w-4 h-4 text-zinc-400 transition-transform", showMBTISelector && "rotate-90")} />
              </div>
            </button>
            {showMBTISelector && (
              <div className="px-4 pb-4 grid grid-cols-4 gap-2 border-t border-zinc-200 dark:border-white/10 pt-4">
                {MBTI_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => { setSelectedMBTI(t); setShowMBTISelector(false); }}
                    className={cn("py-2 rounded-lg text-sm font-semibold transition-colors border", selectedMBTI === t
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:border-emerald-500/50")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Account</h3>
          <div className="bg-zinc-100/50 dark:bg-zinc-800/60 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 divide-y divide-zinc-200 dark:divide-white/10">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><User className="w-5 h-5" /> Edit Profile</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
            <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><Lock className="w-5 h-5" /> Change Password</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Notifications</h3>
          <div className="bg-zinc-100/50 dark:bg-zinc-800/60 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 divide-y divide-zinc-200 dark:divide-white/10">
            <div className="w-full flex items-center justify-between p-4 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <Bell className="w-5 h-5" /> Push Notifications
              </div>
              <button
                onClick={() => setPushEnabled(!pushEnabled)}
                className={cn("w-11 h-6 rounded-full relative shadow-inner transition-colors duration-300", pushEnabled ? "bg-emerald-500/50" : "bg-zinc-200")}
              >
                <div className={cn("absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300", pushEnabled ? "right-1 bg-emerald-400" : "left-1 bg-white")} />
              </button>
            </div>
            <div className="w-full flex items-center justify-between p-4 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <Mail className="w-5 h-5" /> Email Notifications
              </div>
              <button
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={cn("w-11 h-6 rounded-full relative shadow-inner transition-colors duration-300", emailEnabled ? "bg-emerald-500/50" : "bg-zinc-200")}
              >
                <div className={cn("absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300", emailEnabled ? "right-1 bg-emerald-400" : "left-1 bg-white")} />
              </button>
            </div>
            <div className="w-full flex items-center justify-between p-4 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <BellOff className="w-5 h-5" /> Quiet Mode
              </div>
              <button
                onClick={() => setQuietMode(!quietMode)}
                className={cn("w-11 h-6 rounded-full relative shadow-inner transition-colors duration-300", quietMode ? "bg-emerald-500/50" : "bg-zinc-200")}
              >
                <div className={cn("absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300", quietMode ? "right-1 bg-emerald-400" : "left-1 bg-white")} />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Interactions */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Privacy & Interactions</h3>
          <div className="bg-zinc-100/50 dark:bg-zinc-800/60 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 divide-y divide-zinc-200 dark:divide-white/10">
            <div className="w-full flex items-center justify-between p-4 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <Lock className="w-5 h-5" /> Private Account
              </div>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className={cn("w-11 h-6 rounded-full relative shadow-inner transition-colors duration-300", isPrivate ? "bg-emerald-500/50" : "bg-zinc-200")}
              >
                <div className={cn("absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300", isPrivate ? "right-1 bg-emerald-400" : "left-1 bg-white")} />
              </button>
            </div>
            <button onClick={() => fetchBlockMuteList("close-friends")} className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><Star className="w-5 h-5" /> Close Friends</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
            <button onClick={() => fetchBlockMuteList("blocks")} className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><UserX className="w-5 h-5" /> Blocked Accounts</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
            <button onClick={() => fetchBlockMuteList("mutes")} className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><MicOff className="w-5 h-5" /> Muted Accounts</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
            <div className="w-full flex items-center justify-between p-4 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <Activity className="w-5 h-5" /> Activity Status
              </div>
              <button
                onClick={() => setActivityStatusEnabled(!activityStatusEnabled)}
                className={cn("w-11 h-6 rounded-full relative shadow-inner transition-colors duration-300", activityStatusEnabled ? "bg-emerald-500/50" : "bg-zinc-200")}
              >
                <div className={cn("absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300", activityStatusEnabled ? "right-1 bg-emerald-400" : "left-1 bg-white")} />
              </button>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Preferences</h3>
          <div className="bg-zinc-100/50 dark:bg-zinc-800/60 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium">
                <Moon className="w-5 h-5" /> Dark Mode
              </div>
              <div className={cn("w-11 h-6 rounded-full relative shadow-inner transition-colors duration-300", theme === 'dark' ? "bg-emerald-500/50" : "bg-zinc-200")}>
                <div className={cn("absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-300", theme === 'dark' ? "right-1 bg-emerald-400" : "left-1 bg-white")} />
              </div>
            </button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Help & Support</h3>
          <div className="bg-zinc-100/50 dark:bg-zinc-800/60 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 divide-y divide-zinc-200 dark:divide-white/10">
            <button onClick={() => setStaticModal("help")} className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><HelpCircle className="w-5 h-5" /> Help Center</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
            <button onClick={() => setStaticModal("report")} className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><AlertTriangle className="w-5 h-5" /> Report a Problem</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
            <button onClick={() => setStaticModal("terms")} className="w-full flex items-center justify-between p-4 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 font-medium"><FileText className="w-5 h-5" /> Terms & Policies</div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="w-5 h-5 mr-2" /> Log Out
        </Button>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm border border-zinc-200 dark:border-white/10 shadow-2xl p-6">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-4">Change Password</h3>
            {passwordStatus && (
              <div className={cn("mb-4 p-3 rounded-xl text-sm border", passwordStatus.type === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400")}>
                {passwordStatus.text}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input type="password" placeholder="Current Password" required value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
              <input type="password" placeholder="New Password" required value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
              <input type="password" placeholder="Confirm New Password" required value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={passwordSaving}>{passwordSaving ? "Saving..." : "Update"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block & Mute Modal */}
      {blockMuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setBlockMuteModal(null); }}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10">
              <h3 className="font-bold text-lg capitalize text-zinc-900 dark:text-white">
                {blockMuteModal === 'blocks' ? 'Blocked Accounts' : blockMuteModal === 'mutes' ? 'Muted Accounts' : 'Close Friends'}
              </h3>
              <button onClick={() => setBlockMuteModal(null)} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-white/10">
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {blockMuteLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : blockMuteList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-sm">
                  {blockMuteModal === 'blocks' ? <ShieldBan className="w-10 h-10 mb-3 text-zinc-300 dark:text-zinc-600" /> : blockMuteModal === 'mutes' ? <MicOff className="w-10 h-10 mb-3 text-zinc-300 dark:text-zinc-600" /> : <Star className="w-10 h-10 mb-3 text-zinc-300 dark:text-zinc-600" />}
                  <p>No {blockMuteModal.replace('-', ' ')} found.</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-white/10">
                  {blockMuteList.map((u: any) => (
                    <li key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <Avatar src={u.avatar} size="sm" className="w-10 h-10" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{u.fullName}</p>
                        <p className="text-xs text-zinc-500 truncate">@{u.username}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => handleUnblockUnmute(u.username, blockMuteModal)}>
                        {blockMuteModal === 'blocks' ? 'Unblock' : blockMuteModal === 'mutes' ? 'Unmute' : 'Remove'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
              <Button variant="secondary" className="w-full" onClick={() => setBlockMuteModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Static Pages Modal */}
      {staticModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setStaticModal(null); }}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10">
              <h3 className="font-bold text-lg capitalize text-zinc-900 dark:text-white">
                {staticModal === 'help' ? 'Help Center' : staticModal === 'report' ? 'Report a Problem' : 'Terms & Policies'}
              </h3>
              <button onClick={() => setStaticModal(null)} className="p-2 -mr-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-white/10">
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed space-y-4">
              {staticModal === 'help' && (
                <>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base">Welcome to Aura Help Center</h4>
                  <p>If you're having trouble using Aura, you're in the right place. Here are some common questions:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>How do I change my profile picture?</strong> Go to Settings, click on your avatar, and upload a new image.</li>
                    <li><strong>How do I make my account private?</strong> Scroll down to "Privacy & Interactions" and toggle "Private Account".</li>
                    <li><strong>Who can see my Close Friends posts?</strong> Only people you have explicitly added to your Close Friends list can view these posts.</li>
                  </ul>
                  <p>For more specific inquiries, please contact our support team at support@aura.app.</p>
                </>
              )}
              {staticModal === 'report' && (
                <>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base">Report an Issue</h4>
                  <p>We're sorry you're experiencing problems with Aura. Please describe the issue below.</p>
                  <textarea 
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[120px]" 
                    placeholder="Briefly explain what happened or what isn't working..."
                  ></textarea>
                  <Button className="mt-2" onClick={() => { alert("Thank you for your report. We will look into it."); setStaticModal(null); }}>Submit Report</Button>
                </>
              )}
              {staticModal === 'terms' && (
                <>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base">Terms of Service</h4>
                  <p>By using Aura, you agree to our terms. We reserve the right to suspend accounts that violate our community guidelines, including spam, harassment, and posting inappropriate content.</p>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base mt-6">Privacy Policy</h4>
                  <p>Your privacy is important to us. We do not sell your personal data to third parties. Your data is used exclusively to provide and improve the Aura application experience.</p>
                  <p className="text-xs text-zinc-500 mt-4">Last updated: May 2026</p>
                </>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
              <Button variant="secondary" className="w-full" onClick={() => setStaticModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
