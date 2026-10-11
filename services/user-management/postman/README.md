# Postman Files (Non-orchestrator)

This folder contains local Postman artifacts generated directly from the implemented routes.

## Files

- user-management.collection.json
- user-management.local.environment.json

## Import and run

1. Import both JSON files into Postman.
2. Select environment: user-management-local.
3. Ensure API is running at http://localhost:3000.
4. Run requests in this order:
   1) Auth/Register
   2) Auth/Login
   3) Protected routes under Profile, Preferences, Consents

## Notes

- Login test script stores access_token into environment automatically.
- Confirm Password Reset needs a valid reset_token value from your reset flow handling.
- consent_category must be one of: PRIVACY_POLICY, TERMS_OF_SERVICE, MARKETING_EMAIL, MARKETING_SMS.

## Automated run

Run the full non-orchestrator API smoke test from the service root:

`npm run test:api:postman`

What it does:

1. Verifies API availability on `localhost:3000` and PostgreSQL on `localhost:5432`.
2. Runs `prisma generate` and `prisma db push`.
3. Executes Postman requests in sequence via Newman: Register -> Login -> Profile -> Preferences -> Consents.
4. Uses a timestamped email to avoid duplicate registration collisions.
