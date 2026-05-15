# Contributing to Lenda

Thank you for your interest in contributing to Lenda! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Constructive criticism only
- No harassment or discrimination of any kind

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit with clear messages: `git commit -m "Add feature: description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

### Prerequisites
- Node.js v18+
- PostgreSQL 12+
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database configuration
npm run migrate
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Testing Requirements

Before submitting a PR:

### Backend
```bash
cd backend
npm run lint
npm test
```

### Frontend
```bash
cd frontend
npm run lint
npm run build
```

## Code Standards

### JavaScript/Node.js
- Use ESLint configuration provided
- Use 2-space indentation
- Use single quotes for strings
- Add semicolons
- Use meaningful variable names
- Document complex logic with comments

### React/Frontend
- Use functional components with hooks
- Keep components small and focused
- Use proper prop types (PropTypes or TypeScript in future)
- Use meaningful component names (PascalCase)
- Keep state management simple

### Database
- Use meaningful table/column names (snake_case)
- Add indexes for frequently queried columns
- Write migrations for schema changes
- Document schema changes in comments

## Commit Message Guidelines

Write clear, descriptive commit messages:

```
Format: [Type]: Brief description

Type options:
- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Formatting changes (no code change)
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding or updating tests
- chore: Maintenance tasks

Examples:
- feat: Add loan repayment functionality
- fix: Resolve JWT token validation error
- docs: Update API documentation
- test: Add authentication tests
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Provide a clear PR description including:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
5. Link related issues if applicable
6. Be prepared to respond to feedback

## Issue Reporting

When reporting bugs:
1. Use a clear, descriptive title
2. Provide a detailed description
3. Include steps to reproduce
4. Include expected vs actual behavior
5. Include your environment (OS, Node version, etc.)
6. Include error messages or logs

## Feature Requests

When suggesting features:
1. Use a clear, descriptive title
2. Provide a detailed description of the feature
3. Explain the use case
4. Include examples if applicable

## Documentation

- Keep README.md updated
- Document new features and APIs
- Update API documentation
- Include code comments for complex logic
- Keep CONTRIBUTING.md current

## Questions?

- Check existing issues and documentation first
- Create a new discussion or issue
- Be respectful and specific in your questions

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

Thank you for helping make Lenda better! 🎉
