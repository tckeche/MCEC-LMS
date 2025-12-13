# MCEC LMS - Learning Management System

## Overview

MCEC LMS is a comprehensive learning management system designed for educational institutions. It provides role-based dashboards for students, parents, tutors, managers, and administrators to manage courses, assignments, grades, and announcements. The platform emphasizes information clarity, role-appropriate interfaces, and professional educational-grade aesthetics inspired by modern productivity platforms like Linear, Notion, and Google Classroom.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Typography**: Inter (body text) and Space Grotesk (headings) via Google Fonts
- **Theme Support**: Light/dark mode with system preference detection

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful endpoints under `/api` prefix with role-based access control

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions and type exports
- **Migrations**: Drizzle Kit for schema migrations (`drizzle-kit push`)
- **Key Tables**: users, courses, enrollments, assignments, submissions, grades, announcements, parentChildren, sessions, tutorAvailability, sessionProposals, tutoringSessions, hourWallets

### Authentication & Authorization
- **Auth Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL sessions table with 7-day TTL
- **Role System**: Five user roles - student, parent, tutor, manager, admin
- **Access Control**: Middleware-based role verification with `isActive` status checks

### Project Structure
```
client/           # React frontend application
  src/
    components/   # Reusable UI components
    pages/        # Route-based page components organized by role
    hooks/        # Custom React hooks
    lib/          # Utility functions and query client
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Database operations interface
  replitAuth.ts   # Authentication setup
shared/           # Shared code between client and server
  schema.ts       # Drizzle schema definitions and types
```

### Key Design Patterns
- **Shared Types**: Schema types exported from `shared/schema.ts` ensure type safety across client and server
- **Storage Interface**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Query Invalidation**: Consistent use of React Query for data fetching with proper cache invalidation
- **Role-Based UI**: Components conditionally render based on user role from auth context

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **Required Secrets**: `SESSION_SECRET`, `REPL_ID`, `ISSUER_URL`

### UI Libraries
- **Radix UI**: Accessible primitive components (dialogs, dropdowns, forms, etc.)
- **shadcn/ui**: Pre-styled component collection configured in `components.json`
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation

### Form Handling
- **React Hook Form**: Form state management
- **Zod**: Schema validation with `@hookform/resolvers` integration
- **drizzle-zod**: Generate Zod schemas from Drizzle table definitions

### Development Tools
- **Vite**: Frontend build tool with HMR support
- **esbuild**: Production server bundling
- **TypeScript**: Type checking across the entire codebase