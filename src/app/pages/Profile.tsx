import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Grid, Bookmark, X, Image, UserX, MoreHorizontal, ShieldBan, MicOff, Star, Lock, Users } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { cn } from "../lib/utils";

export const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [networkModal, setNetworkModal] = useState<"followers" | "following" | null>(null);
  const [networkList, setNetworkList] = useState<any[]>([]);
  const [networkListLoading, setNetworkListLoading] = useState(false);
  const [following, setFollowing] = useState<boolean>(false);
  const [requested, setRequested] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const profileUsername = username || currentUser?.username;
  const isOwnProfile = !username || username === currentUser?.username;

  const fetchProfile = useCallback(async () => {
    if (!profileUsername) return;
    setLoading(true);
    setIsBlocked(false);
    try {
      const userData = await api.get<{ user: any, isBlocked?: boolean }>(`/users/${profileUsername}`);
      if (userData.isBlocked) {
        setIsBlocked(true);
        setUser(null);
        setLoading(false);
        return;
      }
      
      const postsData = await api.get<{ posts: any[], isPrivate?: boolean }>(`/posts/user/${profileUsername}`);
      
      setUser(userData.user);
      setPosts(postsData.posts);
      setFollowing(userData.user.isFollowing);
      setRequested(userData.user.isRequested);
    } catch { navigate('/') }
    finally { setLoading(false); }
  }, [profileUsername, navigate]);

  const fetchSavedPosts = useCallback(async () => {
    try {
      const data = await api.get<{ posts: any[] }>('/bookmarks');
      setSavedPosts(data.posts);
    } catch {}
  }, []);

  useEffect(() => { if (activeTab === 'saved' && isOwnProfile) fetchSavedPosts(); }, [activeTab, isOwnProfile, fetchSavedPosts]);

  const openNetworkModal = useCallback(async (type: "followers" | "following") => {
    setNetworkModal(type);
    setNetworkList([]);
    setNetworkListLoading(true);
    try {
      const data = await api.get<{ users: any[] }>(`/users/${profileUsername}/${type}`);
      setNetworkList(data.users);
    } catch {}
    finally { setNetworkListLoading(false); }
  }, [profileUsername]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleFollow = async () => {
    if (!currentUser || followLoading || !user) return;
    setFollowLoading(true);
    try {
      if (following) {
        await api.delete(`/users/${user.username}/follow`);
        setFollowing(false);
        setRequested(false);
        setUser((u: any) => ({ ...u, followers: u.followers - 1, isFollowing: false, isRequested: false }));
      } else if (requested) {
        await api.delete(`/users/${user.username}/follow`);
        setRequested(false);
        setUser((u: any) => ({ ...u, isRequested: false }));
      } else {
        const res = await api.post<{ isRequested?: boolean }>(`/users/${user.username}/follow`);
        if (res.isRequested) {
          setRequested(true);
          setUser((u: any) => ({ ...u, isRequested: true }));
        } else {
          setFollowing(true);
          setUser((u: any) => ({ ...u, followers: u.followers + 1, isFollowing: true }));
        }
      }
    } catch {} finally { setFollowLoading(false); }
  };

  const handleBlock = async () => {
    try {
      await api.post(`/users/${user.username}/block`);
      setIsBlocked(true);
      setUser(null);
    } catch {}
  };

  const handleMute = async () => {
    try {
      await api.post(`/users/${user.username}/mute`);
      alert("User muted successfully");
    } catch {}
  };

  if (loading) return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-3xl overflow-hidden pb-8 animate-pulse">
      <div className="h-28 md:h-48 bg-zinc-200 dark:bg-zinc-700" />
      <div className="px-4 md:px-8 mt-14 space-y-3">
        <div className="h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );

  if (isBlocked || !user) return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-3xl overflow-hidden py-24 flex flex-col items-center justify-center">
      <UserX className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mb-4" />
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Profile Unavailable</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2">This account may have been deleted or is unavailable.</p>
    </div>
  );

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:rounded-3xl overflow-hidden pb-8 relative transition-colors duration-300">

      {/* Network Modal */}
      {networkModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setNetworkModal(null); }}>
          <div className="bg-white dark:bg-zinc-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm max-h-[80vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10">
              <h3 className="font-bold text-lg capitalize text-zinc-900 dark:text-white">{networkModal}</h3>
              <button
                onClick={() => setNetworkModal(null)}
                className="p-2 -mr-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scroll-smooth-mobile">
              {networkListLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : networkList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-sm">
                  <Users className="w-10 h-10 mb-3 text-zinc-300 dark:text-zinc-600" />
                  <p>No {networkModal} yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-white/10">
                  {networkList.map((u: any) => (
                    <li key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                      <button className="shrink-0" onClick={() => { setNetworkModal(null); navigate(`/profile/${u.username}`); }}>
                        <Avatar src={u.avatar || u.avatar_url} size="sm" className="w-10 h-10" />
                      </button>
                      <div className="flex-1 min-w-0 text-left" onClick={() => { setNetworkModal(null); navigate(`/profile/${u.username}`); }}>
                        <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate cursor-pointer hover:underline">{u.fullName}</p>
                        <p className="text-xs text-zinc-500 truncate">@{u.username}</p>
                      </div>
                      {currentUser && currentUser.id !== u.id && (
                        <Button
                          variant={u.isFollowing ? "secondary" : "default"}
                          size="sm"
                          onClick={async () => {
                            try {
                              if (u.isFollowing) {
                                await api.delete(`/users/${u.username}/follow`);
                              } else {
                                await api.post(`/users/${u.username}/follow`);
                              }
                              setNetworkList(prev => prev.map(p => p.id === u.id ? { ...p, isFollowing: !u.isFollowing } : p));
                            } catch {}
                          }}
                        >
                          {u.isFollowing ? 'Following' : 'Follow'}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header — only show on other users' profiles */}
      {!isOwnProfile && (
        <div className="md:hidden sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-white/10 px-3 h-14 flex items-center gap-2 transition-colors duration-300">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-1 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-900 dark:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg text-zinc-900 dark:text-white truncate">{user.username}</span>
        </div>
      )}

      {/* Cover & Avatar */}
      <div className="relative">
        <div
          className="h-28 md:h-48 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
          style={(user.coverImage?.startsWith('#') || user.cover_image_url?.startsWith('#')) ? { backgroundColor: user.coverImage || user.cover_image_url } : {}}
        >
          {(user.coverImage || user.cover_image_url) && !(user.coverImage || user.cover_image_url).startsWith('#') && (
            <img src={user.coverImage || user.cover_image_url} className="w-full h-full object-cover" alt="Cover" loading="lazy" />
          )}
        </div>
        <div className="absolute -bottom-10 md:-bottom-14 left-4 md:left-8 ring-4 ring-white dark:ring-zinc-900 rounded-full bg-white dark:bg-zinc-900">
          <Avatar src={user.avatar || user.avatar_url} size="xl" className="w-20 h-20 md:w-28 md:h-28" />
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 md:px-8 mt-12 md:mt-16 mb-5">
        <div className="flex justify-between items-start mb-3 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
              {user.fullName}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">@{user.username}</p>
          </div>
          <div className="flex gap-2 shrink-0 items-center">
            {isOwnProfile ? (
              <Button variant="secondary" size="sm" onClick={() => navigate('/settings')}>Edit Profile</Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/messages/${user.username}`)}>
                  Message
                </Button>
                <Button
                  size="sm"
                  variant={following || requested ? "secondary" : "default"}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {following ? "Following" : requested ? "Requested" : "Follow"}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="w-9 h-9 px-0 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-zinc-800">
                    <DropdownMenuItem onClick={async () => {
                      try {
                        if (user.isCloseFriend) {
                          await api.delete(`/users/${user.username}/close-friend`);
                          setUser({ ...user, isCloseFriend: false });
                        } else {
                          await api.post(`/users/${user.username}/close-friend`);
                          setUser({ ...user, isCloseFriend: true });
                        }
                      } catch {}
                    }} className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30">
                      <Star className={cn("w-4 h-4 mr-2", user.isCloseFriend ? "fill-emerald-600 dark:fill-emerald-400" : "")} />
                      {user.isCloseFriend ? 'Remove Close Friend' : 'Add Close Friend'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleMute} className="cursor-pointer text-zinc-700 dark:text-zinc-300">
                      <MicOff className="w-4 h-4 mr-2" />
                      Mute @{user.username}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlock} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30">
                      <ShieldBan className="w-4 h-4 mr-2" />
                      Block User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {user.bio && (
          <p className="text-sm md:text-[15px] whitespace-pre-line text-zinc-700 dark:text-zinc-300 mb-3 leading-relaxed">{user.bio}</p>
        )}

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Personality:</span>
          <span className="px-2.5 py-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400">{user.mbti}</span>
        </div>

        <div className="flex items-center gap-5 text-sm">
          <button onClick={() => openNetworkModal("following")} className="flex gap-1.5 hover:underline decoration-zinc-400">
            <span className="font-bold text-zinc-900 dark:text-white">{user.following}</span>
            <span className="text-zinc-500 dark:text-zinc-400">Following</span>
          </button>
          <button onClick={() => openNetworkModal("followers")} className="flex gap-1.5 hover:underline decoration-zinc-400">
            <span className="font-bold text-zinc-900 dark:text-white">{user.followers?.toLocaleString()}</span>
            <span className="text-zinc-500 dark:text-zinc-400">Followers</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-zinc-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab("posts")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
            activeTab === "posts" ? "text-zinc-900 dark:text-white border-t-2 border-emerald-500 -mt-[1px]" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200")}
        >
          <Grid className="w-4 h-4" /> Posts
        </button>
        {isOwnProfile && (
          <button
            onClick={() => setActiveTab("saved")}
            className={cn("flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
              activeTab === "saved" ? "text-zinc-900 dark:text-white border-t-2 border-emerald-500 -mt-[1px]" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200")}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        )}
      </div>

      {/* Grid */}
      <div className={cn("mt-0.5", user.isPrivate && !isOwnProfile && !following ? "flex flex-col items-center justify-center py-20 px-4 text-center border-t border-zinc-200 dark:border-white/10" : "grid grid-cols-3 gap-0.5")}>
        {user.isPrivate && !isOwnProfile && !following ? (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">This Account is Private</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xs">Follow this account to see their photos and videos.</p>
          </>
        ) : (activeTab === 'posts' ? posts : savedPosts).length > 0 ? (
          (activeTab === 'posts' ? posts : savedPosts).map(post => (
            <div key={post.id} className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative group cursor-pointer" onClick={() => navigate(`/post/${post.id}`)}>
              {post.image ? (
                <img src={post.image} className="w-full h-full object-cover" alt="Post" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 text-center">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-4">{post.caption}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                <div className="flex items-center font-bold gap-1 text-sm">❤️ {post.likes}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-16 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
            <div className="w-16 h-16 border-2 border-zinc-200 dark:border-zinc-600 rounded-full flex items-center justify-center mb-4">
              <Image className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{activeTab === 'saved' ? 'No Saved Posts' : 'No Posts Yet'}</h2>
            <p className="text-sm text-center">{activeTab === 'saved' ? 'Posts you save will appear here.' : 'Share your first photo on Aura.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
