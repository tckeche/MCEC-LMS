# API integration audit report

Base URL: http://localhost:5000
Generated: 2026-01-06T21:21:35.741Z
Pages visited: 5
Captured API calls: 12
Issues found: 5

## Issues only

### GET /api/auth/user
Status: 401
Time: 13 ms
Source: ui
Type: client
Suggested fix: Auth or RBAC issue, confirm session cookie or token is present, confirm role permissions, confirm middleware ordering and route protection rules
Response preview:
```
{"message":"Unauthorized"}
```

### POST /api/auth/dev/staff-login
Status: 401
Time: 7 ms
Source: ui
Type: client
Suggested fix: Auth or RBAC issue, confirm session cookie or token is present, confirm role permissions, confirm middleware ordering and route protection rules
Response preview:
```
{"message":"Invalid email or password"}
```

### GET /api/courses
Status: 401
Time: 17 ms
Source: manifest
Type: client
Suggested fix: Auth or RBAC issue, confirm session cookie or token is present, confirm role permissions, confirm middleware ordering and route protection rules
Response preview:
```
{"message":"Unauthorized"}
```

### GET /api/tutoring-sessions
Status: 401
Time: 13 ms
Source: manifest
Type: client
Suggested fix: Auth or RBAC issue, confirm session cookie or token is present, confirm role permissions, confirm middleware ordering and route protection rules
Response preview:
```
{"message":"Unauthorized"}
```

### GET /api/hour-wallets
Status: 401
Time: 26 ms
Source: manifest
Type: client
Suggested fix: Auth or RBAC issue, confirm session cookie or token is present, confirm role permissions, confirm middleware ordering and route protection rules
Response preview:
```
{"message":"Unauthorized"}
```
