# Contributing to NewsNest

Thank you for your interest in contributing to NewsNest! We welcome contributions from developers of all skill levels. This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Commit Convention](#commit-convention)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. By participating, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Show empathy towards other contributors
- Help create a positive community

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/NewsNest-Dynamic-web.git
   cd NewsNest-Dynamic-web
   ```
3. Set up the upstream remote:
   ```bash
   git remote add upstream https://github.com/Lakkhitha/NewsNest-Dynamic-web.git
   ```

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
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
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── auth.ts        # Authentication logic
│   │   ├── db.ts          # Database operations
│   │   └── index.ts       # Main server file
├── .github/               # GitHub configuration
├── docs/                  # Documentation
└── tests/                 # Test files
```

## Contributing Guidelines

### Issues

- Check existing issues before creating new ones
- Use issue templates when available
- Provide detailed descriptions and steps to reproduce
- Label issues appropriately

### Branches

- Use descriptive branch names: `feature/add-user-auth`, `fix/login-validation`
- Create branches from `main`
- Keep branches focused on single features/fixes

### Code Style

- Follow the existing code style
- Use TypeScript for type safety
- Write descriptive variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Commits

- Write clear, descriptive commit messages
- Use present tense: "Add feature" not "Added feature"
- Reference issues when applicable: `fix: resolve login issue #123`

## Commit Convention

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat: add dark mode toggle
fix: resolve memory leak in article component
docs: update API documentation
style: format code with Prettier
refactor: simplify authentication logic
test: add unit tests for utils functions
chore: update dependencies
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write tests for new features
- Ensure tests pass before submitting PR
- Aim for good test coverage
- Use descriptive test names

## Pull Request Process

1. **Create a branch** from `main`
2. **Make your changes** following the guidelines above
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Commit your changes** with clear messages
6. **Push your branch** to your fork
7. **Create a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots for UI changes
   - Test results

### PR Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, your PR will be merged
- Your contribution will be acknowledged

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## Questions?

If you have questions about contributing, feel free to:

- Open a discussion in the GitHub repository
- Check existing issues and documentation
- Contact the maintainers

Thank you for contributing to NewsNest! 🎉