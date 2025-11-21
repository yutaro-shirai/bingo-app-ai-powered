# Development Guide

This document provides developer-focused information for maintaining and extending the Bingo application codebase.

## Project Structure

This is a monorepo containing frontend and backend packages:

```
bingo-app-by-gemini/
├── packages/
│   ├── frontend/          # Next.js application
│   │   ├── src/
│   │   │   ├── app/       # Next.js App Router
│   │   │   │   ├── host/  # Host screen (司会画面)
│   │   │   │   ├── play/  # Participant screen (参加者画面)
│   │   │   │   └── page.tsx  # Home screen
│   │   │   └── ...
│   │   └── package.json
│   └── backend/           # NestJS application
│       ├── src/
│       │   ├── game/      # Game logic and WebSocket gateway
│       │   └── main.ts
│       └── package.json
├── docs/                  # Developer documentation
│   ├── requirements.md    # Application requirements
│   ├── api_design.md      # WebSocket API specification
│   ├── development.md     # This file
│   └── architecture.md    # System architecture
└── README.md              # User-facing documentation
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Real-time**: Socket.io-client ^4.8.1
- **Animation**: Framer Motion ^12.23.24
- **Icons**: Lucide React ^0.554.0
- **Confetti**: canvas-confetti ^1.9.4
- **QR Code**: react-qr-code ^2.0.18
- **Language**: TypeScript 5

### Backend
- **Framework**: NestJS 11
- **WebSocket**: Socket.io ^4.8.1 + @nestjs/websockets
- **Runtime**: Node.js
- **Language**: TypeScript 5
- **Testing**: Jest 30

### Infrastructure
- **Hosting**: AWS Amplify (planned)
- **Development**: Local dev servers (Next.js + NestJS)

## Development Setup

### Prerequisites
- **Node.js**: Version 20.x or higher recommended
- **npm**: Comes with Node.js
- **Git**: For version control

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd bingo-app-by-gemini
```

2. **Install root dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd packages/frontend
npm install
```

4. **Install backend dependencies**
```bash
cd packages/backend
npm install
```

### Running the Application

#### Start Backend (Terminal 1)
```bash
cd packages/backend
npm run start:dev
```
Server runs on `http://localhost:3001`

#### Start Frontend (Terminal 2)
```bash
cd packages/frontend
npm run dev
```
Application runs on `http://localhost:3000`

### Development Workflow

#### Code Structure

**Frontend Components**:
- Pages are located in `packages/frontend/src/app/`
- Each route uses Next.js App Router conventions
- Global styles in `packages/frontend/src/app/globals.css`

**Backend Services**:
- Game logic in `packages/backend/src/game/`
- WebSocket gateway handles real-time events
- Entry point: `packages/backend/src/main.ts`

#### Key Development Commands

**Frontend**:
```bash
npm run dev      # Development server with hot reload
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

**Backend**:
```bash
npm run start:dev    # Development server with watch mode
npm run build        # Build for production
npm run start:prod   # Start production server
npm run test         # Run unit tests
npm run test:e2e     # Run e2e tests
npm run lint         # Run ESLint with auto-fix
```

## Code Style and Best Practices

### TypeScript
- Use strict TypeScript typing
- Avoid `any` types where possible
- Define interfaces for data structures

### React (Frontend)
- Use functional components with hooks
- Prefer named exports for components
- Keep components focused and single-responsibility

### WebSocket Events
- Follow event naming conventions in `docs/api_design.md`
- Always validate event payloads
- Handle disconnection and reconnection gracefully

### Styling (Tailwind CSS)
- Follow "Midnight Gala" theme specifications (see `docs/requirements.md`)
- Use Tailwind utility classes
- Custom CSS only when necessary in `globals.css`

### Animation
- Use Framer Motion for complex animations
- Keep animations performant (< 60fps)
- Provide reduced-motion alternatives

## Testing Strategy

### Unit Tests
- **Frontend**: Component testing with Jest + React Testing Library
- **Backend**: Service and controller testing with Jest

### Integration Tests
- WebSocket event flow testing
- End-to-end game flow scenarios

### Manual Testing
1. Start both frontend and backend
2. Open host screen in one browser
3. Open multiple participant screens in incognito/different browsers
4. Test complete game flow: join → start → draw → bingo

## WebSocket Development

### Event Flow
Refer to [api_design.md](./api_design.md) for complete event specifications.

**Common Development Pattern**:
1. Define event in backend WebSocket gateway
2. Emit event to specific clients or broadcast
3. Listen for event in frontend Socket.io client
4. Update UI based on received data

### Debugging WebSocket
- Use browser DevTools → Network → WS tab
- Check Socket.io connection status
- Log events on both client and server
- Monitor real-time message flow

## Environment Variables

### Frontend
Create `.env.local` in `packages/frontend/`:
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Backend
Create `.env` in `packages/backend/`:
```bash
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Build and Deployment

### Local Production Build

**Frontend**:
```bash
cd packages/frontend
npm run build
npm run start
```

**Backend**:
```bash
cd packages/backend
npm run build
npm run start:prod
```

### AWS Amplify Deployment (Planned)
- Frontend: Deploy Next.js app to Amplify Hosting
- Backend: Deploy NestJS to AWS Lambda or EC2
- WebSocket: Configure API Gateway for WebSocket support

## Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Kill process on port 3000 (Windows)
npx kill-port 3000

# Kill process on port 3001
npx kill-port 3001
```

**WebSocket connection failed**:
- Ensure backend is running before frontend
- Check CORS settings in `packages/backend/src/main.ts`
- Verify `NEXT_PUBLIC_SOCKET_URL` environment variable

**Build errors**:
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Ensure all dependencies are installed

## Contributing

### Git Workflow
1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Test thoroughly (manual + automated)
4. Submit pull request for review

### Commit Message Convention
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
```

## AI-First Development Notes

This documentation is designed to be AI-readable. Key patterns:

- **Data Models**: See `docs/api_design.md` for TypeScript interfaces
- **Requirements**: See `docs/requirements.md` for feature specifications
- **Architecture**: See `docs/architecture.md` for system design
- **Code Location**: Monorepo structure clearly separated by concern

### Quick Context for AI Assistants

**User Roles**:
- Host (司会): Manages lottery drawing, displays QR code
- Participant (参加者): Plays bingo on smartphone
- Admin (管理者): Monitors and controls game state

**Key Features**:
- No login required for participants
- Real-time WebSocket synchronization
- QR code-based room joining
- Automatic bingo card generation (5x5, center FREE)
- Flashy animations with "Midnight Gala" theme

## References

- [Requirements](./requirements.md) - Complete feature specifications
- [API Design](./api_design.md) - WebSocket events and data structures
- [Architecture](./architecture.md) - System design and component interaction
- [Main README](../README.md) - User-facing documentation
