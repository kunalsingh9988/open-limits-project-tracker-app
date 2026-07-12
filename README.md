# Open Limits Project Tracker

Open Limits Project Tracker is a Supabase-backed project management web app built for teams that need one clean place to manage projects, tasks, deadlines, team roles, daily updates, links, files, passwords, and performance visibility.

The app is designed around two working modes:

- **Admin**: manages employees, projects, tasks, deadlines, roles, resources, credentials, comments, and reporting.
- **Employee**: sees only assigned projects/tasks, submits daily updates, updates task/project progress, and replies/reacts to project comments.

The current app is in a **building/testing phase**, so the login screen intentionally shows available IDs and passwords. Remove that before production use.

## Live Repository

GitHub repository:

```txt
https://github.com/kunalsingh9988/open-limits-project-tracker-app
```

## What Problem This Solves

Before this app, project tracking often required maintaining many separate Excel sheets, scattered client links, manual task lists, message threads, daily update notes, employee passwords, preview links, Figma links, and project status files.

That creates a few problems:

- It is hard for admins to know which project is overdue, close to deadline, unassigned, or delivered.
- Employees can miss updates because their work is split across multiple files and chats.
- Project links and documents are easy to lose.
- Team workload is hard to scan quickly.
- Project comments and decisions are scattered.
- Passwords and employee login details are hard to manage consistently.
- Progress tracking becomes manual and error-prone.

Open Limits Project Tracker brings these pieces into one dashboard so admins and employees can work from the same source of truth.

## Core Features

### Authentication

- Admin/Employee toggle on the login screen.
- Login with simple username and password.
- Supabase Auth powers user authentication.
- Usernames map internally to `username@openlimits.local`.
- Building-phase login panel shows current IDs/passwords from Supabase.
- Login password field includes show/hide eye toggle.

### Admin Dashboard

- Project and task overview.
- Daily update coverage.
- Missing update visibility.
- Workload snapshot by employee.
- Quick project health signals.
- Copyable weekly report summary.

### Projects

- Compact project cards for quick scanning.
- Filters for:
  - All projects
  - Delivered projects
  - Overdue projects
  - Close-deadline projects
  - Unassigned projects
- Search by project, client, status, or tag.
- Progress bar based on checklist completion.
- Team assignment summary.
- Priority indicator.
- Project status color coding.
- Dedicated project detail page under `/projects/:projectId`.

### Project Detail Page

Each project has a full detail page with:

- Completion percentage.
- Deadline and health status.
- Project status update.
- Developer/designer assignment.
- Checklist editor.
- Latest project notes.
- Named project links.
- Project documents.
- Connected project tasks.
- Project conversation thread.

### Project Links

Admins can add any kind of link with a custom display name, such as:

- Preview link
- Figma link
- Drive assets link
- Client brief
- Staging site
- Loom/video proof
- Client chat
- QA checklist

The older fixed link inputs were removed in favor of the flexible named-link system.

### Project Documents

Admins can attach project files, including:

- PDF
- DOC/DOCX
- XLS/XLSX
- FIG

Documents are stored in Supabase as project document metadata/data in the current implementation.

### Project Comments

Project comments live on the project detail page.

- Admin can post project-level comments.
- Employees can reply to comments.
- Employees can react using emoji.
- Comments work like a lightweight project chat.

### Tasks

- Admin can create and assign tasks.
- Employees only see their own tasks.
- Task cards show:
  - Project name
  - Task name
  - Assigned person
  - Priority
  - Deadline
  - Status
  - Checklist
  - Notes
- Filters for task status and urgency.
- Task checklist completion support.

### Daily Updates

Employees can submit daily project updates:

- Morning update
- Evening update
- Video/proof link

Admins can review update coverage and identify missing updates.

### Calendar

- Schedule work blocks.
- Connect calendar blocks to tasks.
- Mark planned work as To Do, Working, or Done.
- Employees see their own schedule.
- Admin can view team schedules.

### Directory

Central place for:

- SOPs
- Tutorials
- Tools
- Figma references
- Account/resource links
- Inspiration links
- Store preview links and passwords

### Team & Roles

Admin-only management area for:

- Creating employee/admin accounts.
- Setting username and password.
- Viewing stored build-phase passwords.
- Updating passwords.
- Creating job roles.
- Assigning job roles.
- Activating/deactivating users.
- Deleting users.

### Employee Color Tags

Employee color tags are managed automatically:

- App auto-selects one available high-contrast color.
- Admin can click the selected color to choose another unassigned color.
- Already assigned employee colors cannot be reused.
- Custom color selection is disabled.
- The app has 20 predefined high-contrast colors.
- After 20+ employees, the app generates additional distinct high-contrast colors.

### Performance

Performance view shows:

- Task completion percentage.
- Completed task counts.
- Overdue task counts.
- Active project count.
- Simple performance rating based on live task data.

### Settings

Settings no longer use local storage sync as the primary backend.

Supabase is now the source of truth for app data.

## Tech Stack

- **React 19**
- **TypeScript**
- **Vite**
- **Zustand**
- **Supabase**
  - Auth
  - Postgres database
  - Realtime subscriptions
- **Vercel**
  - Frontend hosting
  - Serverless API routes
- **Lucide React**
- **Recharts**
- **date-fns**
- **Tailwind/PostCSS tooling**

## Project Structure

```txt
.
├── api/
│   ├── create-user.js
│   ├── ensure-admin-profile.js
│   ├── login-credentials.js
│   └── update-password.js
├── src/
│   ├── assets/
│   ├── lib/
│   │   └── supabase.ts
│   ├── App.tsx
│   ├── config.ts
│   ├── main.tsx
│   ├── store.ts
│   ├── styles.css
│   ├── types.ts
│   └── utils.ts
├── supabase/
│   ├── add_account_credentials.sql
│   ├── empty_database.sql
│   ├── project_detail_upgrade.sql
│   └── schema.sql
├── .env.example
├── package.json
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

## Environment Variables

Create a local `.env.local` file based on `.env.example`.

Required variables:

```txt
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Important Security Note

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used by the browser.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server-only values used by API routes.
- Never expose the service role key in frontend code.
- The current login screen intentionally displays passwords for building/testing. Remove this before production.

## Supabase Setup

### 1. Create a Supabase Project

Create a project in Supabase and collect:

- Project URL
- Anon/publishable key
- Service role key

### 2. Run the Schema

Open Supabase SQL Editor and run:

```txt
supabase/schema.sql
```

This creates the required tables, functions, policies, grants, and realtime publication setup.

### 3. Existing Database Upgrade

If the base schema already exists and you only need the latest project detail upgrades, run:

```txt
supabase/project_detail_upgrade.sql
```

This adds:

- Project documents
- Project named links
- Comment replies
- Comment emoji reactions
- Comment update policy

### 4. Optional Cleanup

For a clean development reset, review:

```txt
supabase/empty_database.sql
```

Only run reset/cleanup SQL when you are sure you want to remove data.

## Vercel Setup

In Vercel, add these project environment variables:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

The serverless API routes depend on the server-only Supabase values:

- `/api/create-user`
- `/api/update-password`
- `/api/ensure-admin-profile`
- `/api/login-credentials`

After updating environment variables, redeploy the project.

## Local Development

Install dependencies:

```bash
npm install
```

Start local dev server:

```bash
npm run dev
```

The app runs at:

```txt
http://127.0.0.1:5173/
```

Build locally:

```bash
npm run build
```

Run TypeScript checks:

```bash
npm run typecheck
```

Preview the production build:

```bash
npm run preview
```

## How To Use The App

### Admin Guide

#### 1. Log In As Admin

1. Open the app.
2. Select the **Admin** toggle.
3. Use the shown admin ID/password during the build phase.
4. Click **Log in as Admin**.

#### 2. Create Employees

1. Go to **Team & Roles**.
2. Enter employee name.
3. Enter username.
4. Enter password.
5. Select job role.
6. Choose access level.
7. Use the auto-selected color tag or click it to choose another available color.
8. Click **Add account**.

The employee is created in Supabase Auth and stored in the app profiles table.

#### 3. Update Employee Passwords

1. Go to **Team & Roles**.
2. Find the employee row.
3. Update the password field.
4. Click the check button to save.

The login screen will reflect the changed password from Supabase.

#### 4. Add Job Roles

1. Go to **Team & Roles**.
2. Use the **Job Roles** input.
3. Add roles like:
   - Shopify Developer
   - UI/UX Designer
   - Graphic Designer
   - Operations Lead

#### 5. Create A Project

1. Go to **Projects**.
2. Click **Add Project**.
3. Enter project name.
4. Add client username.
5. Set deadline.
6. Assign developer/designer.
7. Select status.
8. Add named links.
9. Attach project documents.
10. Click **Add project**.

#### 6. Add New Developer Or Designer While Creating A Project

1. In the Add Project form, open Developer or Designer dropdown.
2. Choose **Add new developer** or **Add new designer**.
3. Enter name, username, password, and color tag.
4. Create the employee.
5. The new employee is selected for the project.

#### 7. Manage Project Details

1. Go to **Projects**.
2. Click **Open detail** on a project card.
3. Edit:
   - Status
   - Deadline
   - Team assignment
   - Checklist
   - Latest note
   - Links
   - Documents
4. Review connected tasks.
5. Post project comments for the team.

#### 8. Add Project Comments

1. Open a project detail page.
2. Use the project conversation area.
3. Add an admin note.
4. Employees can reply and react.

#### 9. Create Tasks

1. Go to **Tasks**.
2. Click **Add Task**.
3. Select employee.
4. Select project.
5. Add task description.
6. Set priority and deadline.
7. Add checklist items.

#### 10. Track Daily Updates

1. Go to **Updates**.
2. Review submitted updates.
3. Check missing updates.
4. Use dashboard coverage metrics.

#### 11. Manage Calendar

1. Go to **Calendar**.
2. Select employee.
3. Add scheduled work blocks.
4. Connect work to tasks if needed.

#### 12. Manage Directory

1. Go to **Directory**.
2. Add SOPs, tools, tutorials, links, accounts, and inspiration.
3. Add store preview links and passwords.

#### 13. Review Performance

1. Go to **Performance**.
2. Review task completion percentage.
3. Check overdue tasks.
4. Review project/task load by employee.

### Employee Guide

#### 1. Log In As Employee

1. Open the app.
2. Select the **Employee** toggle.
3. Use the shown employee ID/password during the build phase.
4. Click **Log in as Employee**.

#### 2. View Assigned Work

Employees can only see work assigned to them:

- Assigned projects
- Assigned tasks
- Own calendar
- Relevant updates

#### 3. Update Project Status

1. Go to **Projects**.
2. Open assigned project.
3. Update status when work progresses.
4. Add notes if needed.

#### 4. Complete Checklist Items

1. Open project or task.
2. Check off completed items.
3. Progress updates automatically.

#### 5. Submit Daily Updates

1. Go to **Updates**.
2. Select project.
3. Add morning update.
4. Add evening update.
5. Add video/proof link if available.
6. Save update.

#### 6. Reply To Project Comments

1. Open the project detail page.
2. Read admin comments.
3. Reply with progress/context.
4. React using emoji when appropriate.

#### 7. Manage Calendar Work

1. Go to **Calendar**.
2. Review scheduled work.
3. Mark tasks/work blocks as done when complete.

## Build-Phase Login Behavior

During development, the login screen shows available credentials.

Current behavior:

- Admin toggle shows admin credentials only.
- Employee toggle shows employee credentials only.
- Credential cards can fill the login form.
- ID and password can be copied directly.
- Password field has show/hide toggle.
- Credentials are loaded from Supabase using the server API route.
- The list auto-refreshes while the login screen is open.

Before production, remove or disable the build-phase credential display.

## Data Model Overview

The app uses these main Supabase tables:

- `profiles`
- `account_credentials`
- `job_roles`
- `projects`
- `tasks`
- `daily_client_updates`
- `calendar_slots`
- `resource_links`
- `store_previews`
- `comments`
- `activity_log`
- `notifications`

## API Routes

### `/api/create-user`

Creates Supabase Auth users and app profiles.

Used by:

- Team & Roles account creation
- Inline project developer/designer creation

### `/api/update-password`

Updates Supabase Auth password and stored build-phase password.

Used by:

- Team & Roles password editing

### `/api/ensure-admin-profile`

Repairs the primary admin profile when the Supabase Auth user exists but the app profile is missing.

### `/api/login-credentials`

Returns current build-phase login credentials from Supabase.

Used by:

- Login screen build-phase credential panel

## Scripts

```bash
npm run dev
```

Starts Vite local development server.

```bash
npm run typecheck
```

Runs TypeScript checks without emitting files.

```bash
npm run build
```

Runs TypeScript checks and creates a production build.

```bash
npm run preview
```

Previews the production build locally.

## Quality Checklist

Before pushing changes:

```bash
npm run typecheck
npm run build
```

Recommended manual checks:

- Login as admin.
- Login as employee.
- Create employee.
- Update employee password.
- Confirm login screen shows changed password.
- Create project.
- Add named project link.
- Attach project document.
- Open project detail page.
- Add project comment.
- Reply/react as employee.
- Create task.
- Update task checklist.
- Submit daily update.
- Verify employee cannot see unassigned projects/tasks.
- Verify Vercel deployment has all required environment variables.

## Deployment Flow

1. Make changes locally.
2. Run checks:

```bash
npm run typecheck
npm run build
```

3. Commit changes.
4. Push to `main`.
5. Vercel deploys automatically.

## Known Build-Phase Notes

- Login credentials are visible by design during the building/testing phase.
- Passwords are stored in `account_credentials` so admins can view/update employee passwords.
- Remove visible credentials before production.
- Project documents are currently stored in project data. For large production files, Supabase Storage would be a better long-term file backend.
- The production bundle is currently large enough for Vite to show a chunk-size warning. This does not block the build, but future code-splitting could improve load performance.

## Production Hardening Ideas

Before using this for sensitive production work, consider:

- Remove login-screen credential display.
- Stop storing plaintext passwords.
- Move project documents to Supabase Storage.
- Add email/password reset flow.
- Add audit exports.
- Add stricter role-based policies for sensitive resources.
- Add automated tests.
- Add loading skeletons for slower networks.
- Add pagination for very large project/task lists.
- Add code splitting to reduce bundle size.

## License

ISC
