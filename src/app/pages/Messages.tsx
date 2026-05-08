import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Send, ArrowLeft, MessageSquare, Search as SearchIcon } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { cn } from "../lib/utils";

export const Messages = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [chatUser, setChatUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // User search for new chat
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get<{ users: any[] }>(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.users);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Fetch conversations list
  useEffect(() => {
    const fetchConvos = async () => {
      try {
        const data = await api.get<{ conversations: any[] }>('/messages');
        setConversations(data.conversations);
      } catch (e) {} finally { setLoading(false); }
    };
    fetchConvos();
    // Poll conversations every 8 seconds (conservative to save battery)
    const interval = setInterval(fetchConvos, 8000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Fetch active chat
  useEffect(() => {
    if (!username) {
      setChatUser(null);
      setMessages([]);
      return;
    }
    const fetchChat = async () => {
      try {
        const data = await api.get<{ user: any, messages: any[] }>(`/messages/${username}`);
        setChatUser(data.user);
        setMessages(data.messages);
      } catch (e) {
        navigate('/messages', { replace: true });
      }
    };
    fetchChat();
    // Poll active chat every 3 seconds
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [username, navigate]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Reset height to auto first to correctly shrink
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || sending || !chatUser) return;
    
    const optimisticMsg = {
      id: 'temp-' + Date.now(),
      text: text.trim(),
      isMine: true,
      senderId: currentUser?.id,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setSending(true);
    
    try {
      const data = await api.post<{ message: any }>(`/messages/${username}`, { text: optimisticMsg.text });
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const showList = !username;
  const showChat = !!username;

  if (loading) return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-2xl overflow-hidden flex items-center justify-center animate-pulse"
      style={{ height: 'calc(100dvh - 56px - 68px - env(safe-area-inset-bottom, 0px))' }}>
      <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
    </div>
  );

  return (
    <div
      className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-2xl overflow-hidden flex transition-colors duration-300"
      style={{ height: 'calc(100dvh - 56px - 68px - env(safe-area-inset-bottom, 0px))' }}
    >
      
      {/* Conversations List Pane */}
      {showList && (
        <div className="flex flex-col w-full">
          <div className="p-4 border-b border-zinc-200 dark:border-white/10 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 space-y-3">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Messages</h1>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-2.5 border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors text-sm"
                placeholder="Search people to chat..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scroll-smooth-mobile hide-scrollbar">
            {searchQuery.length > 0 ? (
              // Search Results
              searching ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(u => (
                  <button
                    key={u.id}
                    className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-white/5 active:bg-zinc-100 dark:active:bg-white/5 transition-colors text-left border-b border-zinc-100 dark:border-white/5 last:border-0"
                    onClick={() => {
                      setSearchQuery("");
                      navigate(`/messages/${u.username}`);
                    }}
                  >
                    <Avatar src={u.avatar || u.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate">{u.fullName}</div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">@{u.username}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-10 text-zinc-500 text-sm">No users found</div>
              )
            ) : (
              // Conversations
              conversations.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No messages yet.</p>
                  <p className="text-sm mt-1">Start a conversation by visiting someone's profile!</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.user.username}
                    onClick={() => navigate(`/messages/${conv.user.username}`)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-white/5 active:bg-zinc-100 dark:active:bg-white/5 transition-colors text-left border-b border-zinc-100 dark:border-white/5 last:border-0"
                  >
                    <Avatar src={conv.user.avatar || conv.user.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-semibold text-[15px] text-zinc-900 dark:text-white truncate pr-2">{conv.user.fullName}</span>
                        {conv.unreadCount > 0 && (
                          <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                        )}
                      </div>
                      <p className={cn("text-sm truncate", conv.unreadCount ? "text-zinc-900 dark:text-white font-medium" : "text-zinc-500 dark:text-zinc-400")}>
                        {conv.latestMessage.isMine && "You: "}{conv.latestMessage.text}
                      </p>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>
      )}

      {/* Active Chat Pane */}
      {showChat && (
        <div className="flex-1 flex flex-col min-w-0 w-full">
          {chatUser ? (
            <>
              {/* Chat Header */}
              <div className="px-3 py-3 border-b border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md z-10 flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate('/messages')}
                  className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 active:bg-zinc-200 text-zinc-900 dark:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate(`/profile/${chatUser.username}`)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <Avatar src={chatUser.avatar || chatUser.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <h2 className="font-bold text-[15px] text-zinc-900 dark:text-white leading-tight truncate">{chatUser.fullName}</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight truncate">@{chatUser.username}</p>
                  </div>
                </button>
              </div>

              {/* Messages Area — scrollable, overscroll contained */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth-mobile hide-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 min-h-[200px]">
                    <button onClick={() => navigate(`/profile/${chatUser.username}`)}>
                      <Avatar src={chatUser.avatar || chatUser.avatar_url} size="xl" className="mb-4 opacity-60 hover:opacity-100 transition-opacity" />
                    </button>
                    <p className="text-sm">Say hi to {chatUser.fullName}!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const prevMine = i > 0 && messages[i-1].isMine === msg.isMine;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[80%]",
                          msg.isMine ? "ml-auto items-end" : "mr-auto items-start",
                          prevMine ? "mt-0.5" : "mt-3"
                        )}
                      >
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words",
                          msg.isMine 
                            ? "bg-emerald-600 text-white rounded-br-sm" 
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-sm"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* Message Input — uses safe-area aware padding */}
              <form
                onSubmit={handleSend}
                className="chat-input-bar bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 flex gap-2 items-end px-3 pt-3 shrink-0"
              >
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Message..."
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white placeholder:text-zinc-500 rounded-2xl px-4 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-white/20 resize-none min-h-[44px] max-h-[120px] transition-colors leading-relaxed"
                  rows={1}
                  style={{ fontSize: '16px' }} /* Prevent iOS zoom */
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="p-3 text-white bg-emerald-600 rounded-full hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 transition-colors shrink-0 mb-0.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
