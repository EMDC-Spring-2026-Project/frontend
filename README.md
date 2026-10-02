# EMDC Frontend

Engineering Machine Design Competition (EMDC) Frontend Application - A modern React-based web application for managing competitions, scoring, and tabulation.

## Running the application:

### 1. Without Docker

```bash
# Requires Node.js 22.12+
npm ci
npm run dev
```

The application will be available at `http://localhost:5173`

### 2. With Docker

1. Start docker engine
2. Cd into development-environment folder
3. Run docker-compose build (if you haven't built the containers before)
4. Run docker-compose up -d / docker compose --env-file .env.docker up -d --build web django-api db
5. Navigate to localhost:7001 to see your changes
6. To close docker run: docker compose --env-file .env.docker down. 

## 🚀 CI/CD Pipeline

This project uses **GitHub Actions** for continuous integration and deployment:

- ✅ **Automated Testing**: Lint checks and TypeScript validation on every PR
- ✅ **Build Validation**: Ensures production builds succeed
- ✅ **Security Scanning**: npm audit for vulnerability detection
- ✅ **Docker Images**: Automated builds pushed to GitHub Container Registry
- ✅ **Deployment**: Templates for Vercel, Netlify, DigitalOcean, and VPS

**📖 For detailed CI/CD documentation, see [CI-CD.md](./CI-CD.md)**

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

# Project Overview:

## Tools:

- React
- Vite
- Material UI
- Zustand

## Structure:

- **frontend**: Project root

- **frontend/src**: Houses all components

- **frontend/src/assets**: Houses all images or logos

- **frontend/src/components**: Houses all components that are not pages themselves such as navbar or tables
- **frontend/src/pages**: Houses files for each page of the application

- **frontend/src/store**: Houses all store files for state manager to call api endpoints

- **frontend/src/App.tsx**: Calls main component

- **frontend/src/main.tsx**: Houses routes for each page

- **frontend/src/theme.tsx**: Houses Material UI theme with app colors and typography options
