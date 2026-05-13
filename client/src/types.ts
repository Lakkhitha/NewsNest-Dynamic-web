export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
  provider?: string;
  favoriteCategories?: Category[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

export type Tag = {
  id: number;
  name: string;
  slug: string;
};

export type Article = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  status: string;
  featured: boolean;
  breaking: boolean;
  alertLevel?: string;
  sourceName?: string;
  verifiedPublisher?: boolean;
  views: number;
  trendingScore: number;
  readingTime: number;
  trustScore: number;
  validityLabel: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  category: Category;
  author: User;
  tags: Tag[];
};

export type Comment = {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  userName: string;
  userAvatarUrl?: string;
};

export type HomePayload = {
  hero: Article | null;
  featured: Article[];
  latest: Article[];
  trending: Article[];
  breaking: Article[];
  forYou: Article[];
  alerts: Article[];
  categories: Category[];
  favoriteCategories: Category[];
};

export type ArticleDetailPayload = {
  article: Article;
  comments: Comment[];
  related: Article[];
};

export type DashboardPayload = {
  role: string;
  counts: {
    articles: number;
    published: number;
    pending: number;
    users: number;
    comments: number;
    bookmarks: number;
  };
  topArticles: Article[];
  submissions: Article[];
  writers: User[];
  userManagement?: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    provider: string;
    createdAt: string;
  }>;
  favoriteCategories?: Category[];
  recentComments: Array<{
    id: number;
    content: string;
    status: string;
    createdAt: string;
    articleTitle: string;
    userName: string;
  }>;
};

export type AuthResponse = {
  token: string;
  user: User;
};
