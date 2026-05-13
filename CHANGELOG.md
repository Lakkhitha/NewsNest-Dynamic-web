# Changelog

All notable changes to NewsNest will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with React and TypeScript
- User authentication system with JWT
- Google OAuth integration
- SQLite database with better-sqlite3
- Article management system
- Category and tag organization
- Responsive UI with dark/light themes
- Real-time breaking news alerts
- Search and filtering capabilities
- Dashboard for content management
- API documentation
- Docker containerization
- CI/CD pipeline with GitHub Actions

### Changed
- Improved error handling throughout the application
- Enhanced TypeScript types and interfaces
- Better state management with React hooks

### Fixed
- Various UI/UX improvements
- API response handling
- Database connection issues

## [0.1.0] - 2026-05-13

### Added
- Complete NewsNest application with frontend and backend
- User registration and login
- Article creation and publishing
- Category-based content organization
- Responsive design for mobile and desktop
- Basic admin dashboard
- SQLite database integration
- RESTful API endpoints
- JWT-based authentication
- File upload functionality
- Newsletter subscription
- Contact form

### Technical Details
- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Node.js, Express.js, SQLite
- **Styling**: Custom CSS with responsive design
- **Build Tools**: Vite for frontend, TypeScript compiler for backend
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens with Google OAuth option

---

## Types of Changes

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

## Contributing

When contributing to this changelog:

1. Add changes under the `[Unreleased]` section
2. Use the appropriate change type (Added, Changed, Fixed, etc.)
3. Keep descriptions clear and concise
4. Group similar changes together
5. Move changes to a version section when releasing

Example:
```
### Added
- New user profile page
- Dark mode toggle

### Fixed
- Login form validation
- Mobile navigation menu
```