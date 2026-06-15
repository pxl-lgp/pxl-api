# pxl-api

Backend API for PXL Automation.

## Stack

- NestJS
- TypeScript
- Drizzle ORM
- PostgreSQL
- JWT authentication, planned for Phase 2

Recommended local Node version:

```text
22.13.0
```

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment values:

   ```bash
   cp .env.example .env
   ```

3. Update `DATABASE_URL` and `JWT_SECRET`.

4. Generate database migrations:

   ```bash
   npm run db:generate
   ```

5. Run migrations after `DATABASE_URL` points to a real PostgreSQL database:

   ```bash
   npm run db:migrate
   ```

6. Create the first admin user:

   ```bash
   npm run seed:admin
   ```

7. Run the API:

   ```bash
   npm run start:dev
   ```

Health check:

```text
GET /api/health
```

Swagger docs:

```text
GET /api/docs
```

Auth endpoints:

```text
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

Client onboarding endpoints:

```text
POST /api/clients
GET /api/clients
GET /api/clients/:id
PATCH /api/clients/:id
PATCH /api/clients/:id/drive-folder
```

Creating a client also logs a pending automation event:

```text
event_name: client-created
entity_type: client
status: PENDING
```

`PATCH /api/clients/:id/drive-folder` is an automation callback endpoint for n8n. It requires the `x-pxl-automation-secret` header to match `AUTOMATION_WEBHOOK_SECRET`.

Automation endpoints:

```text
GET /api/automation/logs
```

Content endpoints:

```text
POST /api/content
GET /api/content
GET /api/content/:id
PATCH /api/content/:id
PATCH /api/content/:id/schedule
PATCH /api/content/:id/publish
```

Scheduling content sets its status to `SCHEDULED`, stores `scheduledAt`, and emits a `content-scheduled` automation event.

Publishing sends the content to every selected `platforms` target (`FACEBOOK_PAGE` and/or `INSTAGRAM`) through the Meta Graph API. The item is marked `PUBLISHED` only after every target succeeds. Per-platform results are stored in `publishResults`, so retrying after a partial failure does not duplicate successful posts.

Approval endpoints:

```text
POST /api/approvals
GET /api/approvals
GET /api/approvals/:id
PATCH /api/approvals/:id
```

AI endpoints:

```text
POST /api/ai/generate-caption
POST /api/ai/generate-hashtags
POST /api/ai/generate-reel-script
POST /api/ai/generate-brief
```

If no AI provider key is configured, the API returns deterministic fallback drafts so the portal workflow remains testable.

Analytics endpoints:

```text
POST /api/analytics
GET /api/analytics
GET /api/analytics/content/:contentItemId
GET /api/analytics/:id
PATCH /api/analytics/:id
```

Reports endpoints:

```text
POST /api/reports
GET /api/reports
GET /api/reports/:id
PATCH /api/reports/:id
```

Lead endpoints:

```text
POST /api/leads
GET /api/leads
GET /api/leads/:id
PATCH /api/leads/:id
POST /api/leads/:id/convert
```

`POST /api/leads` is public for lead capture. The list, detail, update, and conversion endpoints are protected for admins and team members.

Public onboarding endpoint:

```text
POST /api/onboarding
```

The onboarding endpoint creates a client with `ONBOARDING` status and emits the existing `client-created` automation event.

Asset endpoints:

```text
POST /api/assets
GET /api/assets
GET /api/assets/:id
PATCH /api/assets/:id
```

Assets store client-linked Drive URLs, optional content links, asset type, version, and tags.

Client portal endpoints:

```text
GET /api/client-portal/overview
GET /api/client-portal/me
GET /api/client-portal/content
GET /api/client-portal/approvals
PATCH /api/client-portal/approvals/:id
GET /api/client-portal/assets
GET /api/client-portal/reports
```

Client portal endpoints require a `CLIENT` role JWT. The API links the user to a client workspace by matching the user's email to `clients.email`.

Google Drive workspace endpoints:

```text
GET    /api/drive/clients/:clientId/items
POST   /api/drive/clients/:clientId/files
POST   /api/drive/clients/:clientId/folders
GET    /api/drive/clients/:clientId/files/:fileId/download
DELETE /api/drive/clients/:clientId/items/:fileId

GET    /api/client-portal/drive/items
POST   /api/client-portal/drive/files
GET    /api/client-portal/drive/files/:fileId/download
```

Admin and team users can browse, upload, create folders, download, and delete within a client's saved Drive folder. Client users can browse, upload, and download only inside the folder linked to their own client record.

## Meta Social Publishing

Add the server-side Meta settings:

```env
META_GRAPH_API_VERSION=v25.0
META_APP_ID=
META_APP_SECRET=
META_LOGIN_CONFIG_ID=
META_OAUTH_REDIRECT_URI=https://api.example.com/api/social-connections/meta/callback
FRONTEND_URL=https://portal.example.com
SOCIAL_TOKEN_ENCRYPTION_KEY=
```

Generate `SOCIAL_TOKEN_ENCRYPTION_KEY` with:

```text
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Each client can have multiple Meta owner authorizations. Every approved Facebook Page is stored as a separate encrypted connection, including its linked Instagram professional account when available. Content selects exact connection/platform pairs, so the same post can be sent to many Pages without sharing credentials between clients.

The Meta app needs Facebook Login for Business and approved access for `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, and `instagram_content_publish`. Add the exact callback URL to the app's valid OAuth redirect URIs. `META_LOGIN_CONFIG_ID` is recommended for the production Facebook Login for Business configuration.

Facebook Page text posts can publish without media. Instagram publishing requires a direct, publicly reachable image or video URL in `mediaUrl`.

## Google Drive Connection

The API supports two connection methods. OAuth is recommended when the files live in a personal Google account's My Drive. A service account is suitable for a Google Workspace Shared Drive.

### Option A: OAuth For My Drive

1. Open Google Cloud Console and create or select a project.
2. Enable the Google Drive API.
3. Configure the OAuth consent screen.
4. Create an OAuth client ID.
5. Generate a refresh token with this scope:

```text
https://www.googleapis.com/auth/drive
```

6. Add these values to the API environment:

```env
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
```

The Google account that authorized the refresh token must have access to every client root folder used by the portal.

### Option B: Service Account For Shared Drive

1. Enable the Google Drive API in Google Cloud Console.
2. Create a service account and JSON key.
3. Add the service account as a member of the Shared Drive or share the client folder with its email.
4. Add these values to the API environment:

```env
GOOGLE_DRIVE_CLIENT_EMAIL=
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

When both OAuth and service-account values exist, OAuth is used.

The client record must contain a valid Drive folder URL such as:

```text
https://drive.google.com/drive/folders/FOLDER_ID
```

Uploads are limited to 25 MB per request. The API verifies that every requested item is inside the client's saved root folder.

If `N8N_WEBHOOK_BASE_URL` is configured, the backend sends automation events to:

```text
{N8N_WEBHOOK_BASE_URL}/{eventName}
```

For example:

```text
{N8N_WEBHOOK_BASE_URL}/client-created
{N8N_WEBHOOK_BASE_URL}/content-scheduled
```

You can also set exact workflow URLs for n8n test or production webhooks:

```env
N8N_CLIENT_CREATED_WEBHOOK_URL=https://your-n8n-host/webhook-test/client-created
N8N_CONTENT_SCHEDULED_WEBHOOK_URL=https://your-n8n-host/webhook-test/content-scheduled
```

## Phase 1 Status

The backend scaffold, config validation, health endpoint, Drizzle schema, and initial migration are in place. A live PostgreSQL database still needs to be created before `npm run db:migrate` can apply the migration.
