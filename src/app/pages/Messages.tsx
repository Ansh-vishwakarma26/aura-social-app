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
    // Poll conversations every 5 seconds
    const interval = setInterval(fetchConvos, 5000);
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
    // Poll active chat every 2 seconds for new messages
    const interval = setInterval(fetchChat, 2000);
    return () => clearInterval(interval);
  }, [username, navigate]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-2xl overflow-hidden min-h-[calc(100vh-4rem)] flex items-center justify-center animate-pulse">
      <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
    </div>
  );

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl md:border md:border-zinc-200 dark:border-white/10 md:rounded-2xl overflow-hidden flex h-[calc(100vh-4rem)] transition-colors duration-300">
      
      {/* Conversations List Pane */}
      {showList && (
        <div className="flex flex-col w-full">
          <div className="p-4 border-b border-zinc-200 dark:border-white/10 sticky top-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-10 space-y-4">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Messages</h1>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-zinc-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-zinc-200 dark:border-white/10 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                placeholder="Search people to chat..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {searchQuery.length > 0 ? (
              // Search Results
              searching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(u => (
                  <button
                    key={u.id}
                    className="w-full p-4 flex items-center gap-4 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors text-left border-b border-zinc-100 dark:border-white/5 last:border-0"
                    onClick={() => {
                      setSearchQuery("");
                      navigate(`/messages/${u.username}`);
                    }}
                  >
                    <Avatar src={u.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate">{u.fullName}</div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">@{u.username}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-sm">No users found</div>
              )
            ) : (
              // Conversations
              conversations.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                  <p>No messages yet.</p>
                  <p className="text-sm mt-2">Start a conversation by visiting someone's profile!</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.user.username}
                    onClick={() => navigate(`/messages/${conv.user.username}`)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors text-left border-b border-zinc-100 dark:border-white/5 last:border-0"
                  >
                    <Avatar src={conv.user.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold text-zinc-900 dark:text-white truncate pr-2">{conv.user.fullName}</span>
                      </div>
                      <p className={cn("text-sm truncate", conv.unreadCount ? "text-zinc-900 dark:text-white font-semibold" : "text-zinc-500 dark:text-zinc-400")}>
                        {conv.latestMessage.isMine && "You: "}{conv.latestMessage.text}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
                    )}
                  </button>
                ))
              )
            )}
          </div>
        </div>
      )}

      {/* Active Chat Pane */}
      {showChat && (
        <div className="flex-1 flex flex-col min-w-0 bg-white/30 dark:bg-black/20 w-full">
          {chatUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-zinc-200 dark:border-white/10 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 flex items-center gap-3">
                <button onClick={() => navigate('/messages')} className="p-2 -ml-2 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-900 dark:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button onClick={() => navigate(`/profile/${chatUser.username}`)} className="flex items-center gap-3 text-left">
                  <Avatar src={chatUser.avatar} size="sm" />
                  <div>
                    <h2 className="font-bold text-zinc-900 dark:text-white leading-tight hover:underline">{chatUser.fullName}</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight">@{chatUser.username}</p>
                  </div>
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 pb-20">
                    <button onClick={() => navigate(`/profile/${chatUser.username}`)}>
                      <Avatar src={chatUser.avatar} size="xl" className="mb-4 opacity-50 hover:opacity-100 transition-opacity" />
                    </button>
                    <p>Say hi to {chatUser.fullName}!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const prevMine = i > 0 && messages[i-1].isMine === msg.isMine;
                    return (
                      <div key={msg.id} className={cn("flex flex-col max-w-[75%]", msg.isMine ? "ml-auto items-end" : "mr-auto items-start", prevMine ? "mt-1" : "mt-4")}>
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
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} className="p-3 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 flex gap-2 items-end">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Message..."
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-white placeholder:text-zinc-500 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-white/20 resize-none min-h-[44px] max-h-32 transition-colors"
                  rows={1}
                />
                <button 
                  type="submit" 
                  disabled={!text.trim() || sending}
                  className="p-3 text-white bg-emerald-600 rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors shrink-0 mb-0.5"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Loading...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
