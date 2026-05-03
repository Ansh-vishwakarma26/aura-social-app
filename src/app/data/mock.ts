export const MOCK_USERS = [
  {
    id: "1",
    username: "sarah_adventures",
    fullName: "Sarah Jenkins",
    avatar: "https://images.unsplash.com/photo-1672819030217-a1ad8307e629",
    bio: "Tech enthusiast | Travel lover 🌍 | Coffee enthusiast ☕️",
    mbti: "ENFP",
    followers: 1204,
    following: 342,
    isFollowing: false,
    coverImage: "https://images.unsplash.com/photo-1776536025707-9a0a915f85a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwY2FtcHVzJTIwYWVyaWFsfGVufDF8fHx8MTc3NzA1NDM1MHww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "2",
    username: "alex_designs",
    fullName: "Alex Rivera",
    avatar: "https://images.unsplash.com/flagged/photo-1554391812-b02bb159a2bf",
    bio: "UX Designer 🎨 | Building cool stuff",
    mbti: "INTJ",
    followers: 892,
    following: 156,
    isFollowing: true,
  },
  {
    id: "3",
    username: "aura_highlights",
    fullName: "Aura Highlights",
    avatar: "https://images.unsplash.com/photo-1763890498955-13f109b2fbd7",
    bio: "Official page for community activities 🎉",
    mbti: "ESFJ",
    followers: 5430,
    following: 12,
    isFollowing: false,
  },
  {
    id: "4",
    username: "jordan_code",
    fullName: "Jordan Smith",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    bio: "Full stack developer | Open source lover",
    mbti: "INTP",
    followers: 654,
    following: 234,
    isFollowing: false,
  },
  {
    id: "5",
    username: "emma_creative",
    fullName: "Emma Chen",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    bio: "Designer & Artist | Coffee & Creativity",
    mbti: "ENFJ",
    followers: 945,
    following: 312,
    isFollowing: false,
  },
];

export const CURRENT_USER = MOCK_USERS[0];

export const MOCK_POSTS = [
  {
    id: "p1",
    userId: "2",
    user: MOCK_USERS[1],
    image: "https://images.unsplash.com/photo-1555531469-561be9b3cb17",
    caption: "Late night work session at the new downtown cafe! The espresso here is exactly what I need to finish this project. ☕️💻 #AuraLife",
    likes: 124,
    commentsCount: 12,
    isLiked: false,
    isSaved: true,
    timestamp: "2 hours ago",
    comments: [
      {
        id: "c1",
        user: MOCK_USERS[0],
        text: "Good luck with the project! You got this!",
        timestamp: "1 hour ago",
      }
    ]
  },
  {
    id: "p2",
    userId: "3",
    user: MOCK_USERS[2],
    image: "https://images.unsplash.com/photo-1520569495996-b5e1219cb625",
    caption: "Community group sign-ups are now open for the month! Join us at the community center tomorrow. Groups available for all interests.",
    likes: 342,
    commentsCount: 45,
    isLiked: true,
    isSaved: false,
    timestamp: "5 hours ago",
    comments: []
  },
  {
    id: "p3",
    userId: "1",
    user: MOCK_USERS[0],
    image: "https://images.unsplash.com/photo-1501503069356-3c6b82a17d89",
    caption: "Finally found my favorite spot in the co-working space empty! Ready to grind on these side projects. 👩‍💻✨",
    likes: 89,
    commentsCount: 5,
    isLiked: false,
    isSaved: false,
    timestamp: "1 day ago",
    comments: []
  }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: "n1",
    type: "like",
    user: MOCK_USERS[1],
    post: MOCK_POSTS[2],
    timestamp: "10 mins ago",
    isRead: false
  },
  {
    id: "n2",
    type: "comment",
    user: MOCK_USERS[2],
    post: MOCK_POSTS[2],
    text: "Can't wait to see what you build!",
    timestamp: "1 hour ago",
    isRead: false
  },
  {
    id: "n3",
    type: "follow",
    user: MOCK_USERS[1],
    timestamp: "2 days ago",
    isRead: true
  }
];
