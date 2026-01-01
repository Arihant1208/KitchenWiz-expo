# KitchenWiz Authentication + Authorization Spec (Backend Source-of-Truth)

## 0) Decisions Locked In
- **Backend is the source of truth** for signed-in users.
- **Guest mode exists** (device-local only).
- **Account linking = Option A (Explicit linking)**:
  - OAuth sign-in (Google/Microsoft) does **not** auto-merge with an existing email/password account.
  - If an OAuth email matches an existing manual account, the user must sign in with email/password first, then explicitly link the provider.

---

## 1) Goals
- Support sign-up/sign-in via:
  - Google (OIDC)
  - Microsoft (OIDC)
  - Email + password
- Persist session across app restarts.
- Enforce **authorization**: all API calls are scoped to the authenticated `userId`.
- Link all data to `userId`.
- Enable **Guest → Account** migration.

Non-goals (for first iteration):
- Admin roles / multi-tenant org access.
- Shared family accounts.

---

## 2) High-Level Architecture
### 2.1 Client (Expo)
- Performs OAuth using `expo-auth-session`.
- Stores refresh token in `expo-secure-store`.
- Keeps access token in memory (and optionally persisted if you accept risk).
- Uses backend API when signed-in; uses local AsyncStorage when guest.

### 2.2 Backend (Express)
- Verifies provider ID tokens (Google/Microsoft).
- Authenticates email/password.
- Issues KitchenWiz access token (JWT) + refresh token.
- Authorizes all resource routes via middleware.
- Stores all user data in Postgres keyed by `user_id`.

---

## 3) Identity + Account Linking (Option A)
### 3.1 Entities
- `users`: the KitchenWiz account.
- `user_identities`: linked provider identities (google/microsoft).
- `user_passwords`: password hash for manual login.

### 3.2 Linking rules
- OAuth sign-in creates a new `users` row **only** if the provider subject (`sub`) is not known.
- If OAuth returns an email that matches an existing user, we **do not auto-link**.

### 3.3 Required user-facing behavior
When user taps "Continue with Google/Microsoft":
- If provider identity exists: login succeeds.
- Else if provider email matches an existing `users.email`:
  - return an error code: `ACCOUNT_EXISTS_USE_PASSWORD_TO_LINK`
  - client shows: "This email already has an account. Sign in with email/password first, then link Google/Microsoft from Profile."
- Else:
  - create new user + identity, login succeeds.

### 3.4 Explicit linking UX
From Profile (when signed in):
- "Link Google" and "Link Microsoft" actions.
- Linking requires a valid provider ID token. Backend verifies token and attaches to current `user_id`.

---

## 4) Session Model
### 4.1 Tokens
- **Access token (JWT)**: short-lived (e.g., 30 minutes)
  - sent as `Authorization: Bearer <accessToken>`
- **Refresh token**: long-lived (e.g., 30 days)
  - stored on device via `SecureStore`
  - stored on server as a **hash** (never store raw)
  - rotated on refresh

### 4.2 Logout
- Client deletes refresh token from SecureStore.
- Backend marks refresh token as revoked.

---

## 5) Authorization Rules
All resource routes must require authentication.
- Backend middleware verifies access token and sets `req.user = { id: userId }`.
- All SQL must include `WHERE user_id = $1`.

Error behavior:
- Missing/invalid token: `401 Unauthorized`
- Authenticated but attempting to access another user’s resource (should not be possible if queries are scoped): `404` or `403` (choose one; recommended: `404` to reduce leakage).

---

## 6) Backend API (Proposed)
### 6.1 Auth endpoints
- `POST /api/auth/signup`
  - body: `{ email: string, password: string, name?: string }`
  - returns: `{ user: {id,email,name}, accessToken, refreshToken }`

- `POST /api/auth/login`
  - body: `{ email: string, password: string }`
  - returns: `{ user, accessToken, refreshToken }`

- `POST /api/auth/oauth/google`
  - body: `{ idToken: string }`
  - returns: `{ user, accessToken, refreshToken }`
  - may return: `409` with code `ACCOUNT_EXISTS_USE_PASSWORD_TO_LINK`

- `POST /api/auth/oauth/microsoft`
  - body: `{ idToken: string }`
  - returns: `{ user, accessToken, refreshToken }`
  - may return: `409` with code `ACCOUNT_EXISTS_USE_PASSWORD_TO_LINK`

- `POST /api/auth/refresh`
  - body: `{ refreshToken: string }`
  - returns: `{ accessToken, refreshToken }` (rotated)

- `POST /api/auth/logout`
  - body: `{ refreshToken: string }`
  - returns: `{ ok: true }`

### 6.2 Linking endpoints (explicit linking)
- `POST /api/auth/link/google`
  - auth: required
  - body: `{ idToken: string }`
  - returns: `{ ok: true }`

- `POST /api/auth/link/microsoft`
  - auth: required
  - body: `{ idToken: string }`
  - returns: `{ ok: true }`

### 6.3 Data endpoints (existing)
All must be scoped by `req.user.id`.
- `/api/user`
- `/api/inventory`
- `/api/recipes`
- `/api/meal-plan`
- `/api/shopping-list`

---

## 7) Database Schema (Proposed)
### 7.1 New tables
- `users`
  - `id uuid primary key`
  - `email text unique null`
  - `name text null`
  - `created_at timestamptz not null default now()`

- `user_passwords`
  - `user_id uuid primary key references users(id) on delete cascade`
  - `password_hash text not null`

- `user_identities`
  - `id uuid primary key`
  - `user_id uuid not null references users(id) on delete cascade`
  - `provider text not null check (provider in ('google','microsoft'))`
  - `provider_sub text not null`
  - `email text null`
  - `created_at timestamptz not null default now()`
  - unique(`provider`, `provider_sub`)

- `refresh_tokens`
  - `id uuid primary key`
  - `user_id uuid not null references users(id) on delete cascade`
  - `token_hash text not null`
  - `created_at timestamptz not null default now()`
  - `expires_at timestamptz not null`
  - `revoked_at timestamptz null`

### 7.2 Existing domain tables
Add `user_id uuid not null references users(id)` to:
- inventory
- recipes
- meal_plan
- shopping_list
- any other persisted feature tables

Add indexes:
- `create index on <table>(user_id);`

---

## 8) Frontend UX Spec
### 8.1 Entry behavior
- App starts in `loading` state.
- If refresh token exists:
  - call `/api/auth/refresh` to get access token
  - load server data
- Else:
  - show guest experience (local data)

### 8.2 Guest mode
- Guest data stored in AsyncStorage (current behavior).
- Guest can navigate entire app.
- When Guest taps any "Sign in" CTA:
  - open Auth screen.

### 8.3 Auth screen
Buttons:
- Continue with Google
- Continue with Microsoft
- Sign in with Email
- Create account

For email/password:
- Email input
- Password input
- Name input for signup

### 8.4 Guest → Signed-in migration prompt
After first successful sign-in on a device that has guest data:
- Prompt: "Upload your guest data to this account?"
  - Yes: upload local data to backend (scoped to user) then clear local guest storage
  - Not now: keep local guest data, but app will operate in signed-in mode using server data (guest data remains on device until user explicitly migrates later)

---

## 9) Security Requirements
- Passwords:
  - use `bcrypt` hashing
  - constant-time comparisons
- OAuth:
  - verify ID token signature, issuer, audience, exp
- Tokens:
  - refresh tokens stored hashed, rotated
  - access token short-lived
- API:
  - rate-limit auth endpoints
  - avoid user enumeration errors (generic messages for login)

---

## 10) Implementation Phases (Recommended)
1. **DB + backend auth scaffolding**
   - schema migrations
   - auth routes
   - JWT middleware
2. **Per-user authorization on all routes**
   - remove `MOCK_USER_ID`
   - add `user_id` filters to SQL
3. **Frontend auth + session**
   - Auth screen
   - secure storage for refresh token
   - API client attaches bearer token
4. **Guest migration**
   - upload prompt
   - endpoints to upsert user data
5. **Explicit linking UI**
   - Profile: link Google/Microsoft

---

## 11) Open Questions (Optional)
- Should we allow “Create separate account anyway” when OAuth email matches an existing manual account? (Default: **No**, force password sign-in then link.)
- Should server accept bulk upload of guest data as one endpoint (`/api/migrate`) or per resource? (Default: one endpoint.)
