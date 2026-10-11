# User Management Service

NestJS + PostgreSQL + Prisma implementation for the supplied user-management stories:
- Registration
- Login
- Password reset
- Profile management
- Preferences and notification settings
- Consent management

## Assumptions used in this implementation

The user story leaves several items open. This implementation uses a practical baseline so development can proceed:
- Identity uniqueness: unique email address.
- Password policy: minimum 8 chars with upper/lower/number.
- Authentication: JWT bearer token.
- Account verification: not required for initial baseline.
- Roles/authorization: self-service (`/me/*`) only.
- Password reset delivery: endpoint records a reset token server-side; external delivery provider not wired yet.
- Consent categories: `PRIVACY_POLICY`, `TERMS_OF_SERVICE`, `MARKETING_EMAIL`, `MARKETING_SMS`.

## Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`

### Current user (requires Bearer token)
- `GET /me/profile`
- `PATCH /me/profile`
- `GET /me/preferences`
- `PATCH /me/preferences`
- `GET /me/consents`
- `PUT /me/consents/:category`

## Run locally

1. Copy environment values:
   - `copy .env.example .env`
2. Install dependencies:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Run migrations:
   - `npm run prisma:migrate`
5. Start service:
   - `npm run start:dev`

## Notes

- This service intentionally avoids storing raw credentials in responses.
- Password reset tokens are stored as SHA-256 hashes.
- Replace `JWT_SECRET` before any non-local environment.
