# MCEC LMS

## Overview

MCEC LMS is a comprehensive Learning Management System built for MELANIA CALVIN Educational Consultants. It replaces Moodle and combines learning delivery with scheduling, tutor management, billing, invoicing, payroll, messaging, and student progress tracking. The platform supports five core user roles: students, parents, tutors, managers, and admins (with super admin capabilities and tiered access levels).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Stack
- **Frontend**: React SPA with TypeScript, Vite bundler, wouter for routing, TanStack Query for data fetching
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui components, custom design system with glass morphism effects

### Directory Structure
- `client/` - React frontend application
- `server/` - Express backend with API routes
- `shared/` - Shared TypeScript types, schemas, and business logic policies
- `migrations/` - Drizzle database migrations

### Authentication
- Session-based authentication using express-session with PostgreSQL session store
- Email/password login for all users
- Staff accounts require @melaniacalvin.com email domain
- Fallback auth modes when Azure SSO or Twilio are not configured
- Role-based access control (RBAC) with admin levels 1-3 plus super admin

### Key Design Patterns
- Shared Zod schemas in `shared/schema.ts` for validation across client and server
- Business logic policies in `shared/` (messaging retention, report visibility rules)
- View-as functionality for super admins to preview other role experiences
- Centralized query client with consistent error handling

### Role-Based Dashboards
Each role has dedicated routes and dashboards:
- Students: courses, assignments, grades, scheduling
- Parents: child progress, invoices, attendance, progress reports
- Tutors: courses, gradebook, students, availability, proposals
- Managers: tutors, courses, operational oversight
- Admins: users, wallets, invoices, payroll, settings, super admin tools

### Billing System
- Hours wallet per student per course
- Wallet transactions for audit trail
- Invoice generation with line items
- Tutor payout management

## External Dependencies

### Database
- PostgreSQL (provisioned via Replit or external provider like Neon)
- Drizzle ORM for schema management and queries
- connect-pg-simple for session storage

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (required)
- `SESSION_SECRET` - Session encryption key (required)
- `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` - Optional, for Microsoft SSO
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` - Optional, for phone OTP
- `BOOTSTRAP_TOKEN` - One-time super admin bootstrap (optional)

### Frontend Dependencies
- TanStack Query for server state
- React Hook Form with Zod validation
- Radix UI primitives via shadcn/ui
- date-fns for date manipulation
- Framer Motion for animations
- PDFKit for report generation

### Dev/Build Tools
- Vite for frontend bundling
- esbuild for server bundling
- Vitest for testing
- TypeScript with strict mode