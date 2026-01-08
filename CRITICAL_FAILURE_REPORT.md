
## Database connectivity failure blocking end-to-end testing
- **Files touched:** None (environment/config only).
- **Error message / stack trace:**
  - `Login error: AggregateError [ENETUNREACH]: connect ENETUNREACH 3.147.243.31:5432` (and other IPs) from `DatabaseStorage.getUserByEmail` in `server/auth.ts`.
  - `Failed to load resource: the server responded with a status of 500 (Internal Server Error)` during UI login.
- **Failing API request + response:**
  - `POST http://localhost:5000/api/auth/login` with `{ "email": "student1@mcec.com", "password": "Student1" }` → `HTTP/1.1 500 Internal Server Error` `{ "message": "Login failed" }`.
- **Attempts:**
  1. Started server with dev DB URL `postgresql://postgres:password@helium/heliumdb?sslmode=disable` → `getaddrinfo ENOTFOUND helium` during chat retention and DB access.
  2. Started server with prod DB URL `postgresql://neondb_owner:npg_2HUDVI9KrSzF@ep-weathered-hall-ae55khq3.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require` and `SESSION_SECRET=dev-secret` → `ENETUNREACH` errors on DB connections, login API 500.
