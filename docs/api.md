# NewsNest API Documentation

## Overview

NewsNest provides a RESTful API for managing news content, user authentication, and content delivery. The API is built with Express.js and uses SQLite as the database.

## Base URL

```
http://localhost:4000/api
```

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Health Check

#### GET /api/health

Check if the API is running.

**Response:**
```json
{
  "ok": true,
  "app": "NewsNest",
  "time": "2026-05-13T06:41:44.984Z"
}
```

### Authentication

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "writer"
  }
}
```

#### POST /api/auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as registration

#### POST /api/auth/google

Authenticate using Google OAuth.

**Request Body:**
```json
{
  "credential": "google-jwt-credential"
}
```

#### GET /api/auth/me

Get current user information.

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "writer",
    "bio": "Journalist and writer",
    "avatarUrl": "https://...",
    "favoriteCategories": [...]
  }
}
```

### Content

#### GET /api/home

Get homepage content including featured articles, latest news, and categories.

**Response:**
```json
{
  "hero": { /* Article object */ },
  "featured": [ /* Array of articles */ ],
  "latest": [ /* Array of articles */ ],
  "trending": [ /* Array of articles */ ],
  "breaking": [ /* Array of articles */ ],
  "forYou": [ /* Array of articles */ ],
  "alerts": [ /* Array of articles */ ],
  "categories": [ /* Array of categories */ ],
  "favoriteCategories": [ /* Array of categories */ ]
}
```

#### GET /api/articles

Get articles with optional filtering.

**Query Parameters:**
- `q`: Search query
- `category`: Category slug
- `categories`: Comma-separated category slugs

**Response:**
```json
{
  "articles": [ /* Array of articles */ ]
}
```

#### GET /api/articles/:slug

Get a specific article by slug.

**Response:**
```json
{
  "article": { /* Article object */ },
  "comments": [ /* Array of comments */ ],
  "related": [ /* Array of related articles */ ]
}
```

#### POST /api/articles

Create a new article (requires authentication).

**Request Body:** FormData with:
- `title`: Article title
- `excerpt`: Article excerpt
- `content`: Article content
- `categoryId`: Category ID
- `image`: File (optional)
- `tags`: Comma-separated tags

**Response:**
```json
{
  "article": { /* Created article object */ }
}
```

#### GET /api/categories

Get all categories.

**Response:**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Technology",
      "slug": "technology",
      "description": "Tech news and updates"
    }
  ]
}
```

#### GET /api/categories/:slug

Get articles for a specific category.

**Response:**
```json
{
  "category": { /* Category object */ },
  "articles": [ /* Array of articles */ ]
}
```

### User Preferences

#### GET /api/me/preferences

Get user preferences (requires authentication).

**Response:**
```json
{
  "favoriteCategories": [ /* Array of categories */ ]
}
```

#### PUT /api/me/preferences

Update user preferences (requires authentication).

**Request Body:**
```json
{
  "categorySlugs": ["technology", "business"]
}
```

### Social Features

#### POST /api/articles/:id/bookmark

Bookmark an article (requires authentication).

**Response:**
```json
{
  "bookmarked": true
}
```

#### GET /api/me/bookmarks

Get user's bookmarked articles (requires authentication).

**Response:**
```json
{
  "bookmarks": [ /* Array of articles */ ]
}
```

#### POST /api/articles/:id/comments

Add a comment to an article (requires authentication).

**Request Body:**
```json
{
  "content": "Great article!"
}
```

### Communication

#### POST /api/contact

Send a contact message.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Feedback",
  "message": "I love your platform!"
}
```

#### POST /api/newsletter

Subscribe to newsletter.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Admin Endpoints (Super Admin Only)

#### GET /api/dashboard

Get dashboard statistics.

**Response:**
```json
{
  "role": "super_admin",
  "counts": {
    "articles": 150,
    "published": 120,
    "pending": 30,
    "users": 500,
    "comments": 200,
    "bookmarks": 1000
  },
  "topArticles": [ /* Array of articles */ ],
  "submissions": [ /* Array of articles */ ],
  "writers": [ /* Array of users */ ],
  "userManagement": [ /* Array of users */ ],
  "recentComments": [ /* Array of comments */ ]
}
```

## Data Types

### Article
```typescript
{
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
  publishedAt?: string;
  category: Category;
  author: User;
  tags: Tag[];
}
```

### User
```typescript
{
  id: number;
  name: string;
  email: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
  provider?: string;
  favoriteCategories?: Category[];
}
```

### Category
```typescript
{
  id: number;
  name: string;
  slug: string;
  description?: string;
}
```

## Error Handling

All errors return a JSON response with an error message:

```json
{
  "message": "Error description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- 100 requests per 15 minutes for most endpoints
- Authentication required for higher limits

## File Uploads

Article images are uploaded to `/uploads` directory and served via `/uploads/:filename`.

Supported formats: JPEG, PNG, GIF, WebP
Maximum file size: 5MB