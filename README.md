# NewsNest - Dynamic Newsroom Platform

A modern, full-stack newsroom platform built with React, TypeScript, Node.js, and SQLite.

## Features

- 📰 **Dynamic News Feed** - Real-time news aggregation and personalized feeds
- 👤 **User Authentication** - Google OAuth and local authentication
- 📝 **Article Management** - Create, edit, and publish articles
- 🏷️ **Categorization** - Organize content with categories and tags
- 🔍 **Search & Discovery** - Advanced search and filtering capabilities
- 📱 **Responsive Design** - Mobile-first responsive interface
- 🎨 **Dark/Light Themes** - Theme switching support
- 📊 **Analytics Dashboard** - Content performance metrics
- 🔔 **Breaking News Alerts** - Real-time notifications
- 💾 **SQLite Database** - Lightweight, file-based database

## Tech Stack

### Frontend
- **React 19** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Custom CSS** - Responsive design system

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite** - Database with better-sqlite3
- **JWT** - Authentication tokens
- **Google Auth Library** - OAuth integration

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Lakkhitha/NewsNest-Dynamic-web.git
   cd NewsNest-Dynamic-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000

## Project Structure

```
NewsNest/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── state/         # State management
│   │   └── types.ts       # TypeScript definitions
│   ├── public/            # Static assets
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── auth.ts        # Authentication logic
│   │   ├── db.ts          # Database operations
│   │   ├── index.ts       # Main server file
│   │   └── newsapi.ts     # News API integration
│   └── package.json
├── package.json           # Root workspace config
└── tsconfig.base.json    # Shared TypeScript config
```

## Available Scripts

### Root Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run start` - Start the production server

### Client Scripts
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Server Scripts
- `npm run dev` - Start with tsx watch mode
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server

## Environment Variables

Create a `.env` file in the server directory:

```env
PORT=4000
NEWSAPI_KEY=your_newsapi_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - Local login
- `POST /api/auth/register` - User registration
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user

### Content Endpoints
- `GET /api/home` - Homepage data
- `GET /api/articles` - List articles with filtering
- `GET /api/articles/:slug` - Get specific article
- `POST /api/articles` - Create new article
- `GET /api/categories` - List categories

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**Lakkhitha Kariyawasam**
- Location: Colombo, Sri Lanka
- Project: NewsNest Dynamic Newsroom Platform

---

Built with ❤️ for modern journalism</content>
<parameter name="filePath">/Users/lakkithakariyawasam/Desktop/NewsNest/README.md