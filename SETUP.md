# ROADS-LOS Setup Guide

Follow these steps to get the project running locally so it looks and behaves exactly like the Replit environment.

---

## Prerequisites

- **Node.js v20.20.0** (use [nvm](https://github.com/nvm-sh/nvm) to match the exact version)
- **PostgreSQL** (v15 or later)
- **npm** (comes with Node)

---

## 1. Clone the repo

```bash
git clone https://github.com/bennorthrup/ROADS-LOS.git
cd ROADS-LOS
```

---

## 2. Install the correct Node version

If you use nvm:

```bash
nvm install
nvm use
```

This reads the `.nvmrc` file and installs/uses Node v20.20.0.

---

## 3. Install dependencies

```bash
npm install
```

---

## 4. Set up environment variables

Create a `.env` file in the project root with these values:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/roads_los
SESSION_SECRET=any-random-string-here
NODE_ENV=development
```

Replace `username`, `password`, and `roads_los` with your local PostgreSQL credentials and database name.

### Create the database

```bash
createdb roads_los
```

Or via psql:

```sql
CREATE DATABASE roads_los;
```

---

## 5. Push the database schema

```bash
npm run db:push
```

This uses Drizzle to create all the required tables.

---

## 6. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:5000**

---

## Important: Fonts

The project uses **Source Sans Pro** from Google Fonts. The font is loaded via a `<link>` tag in `client/index.html`, so it loads automatically from the internet — no local font installation needed. Just make sure you have internet access when running the app.

If you're working offline, you would need to download the font files and serve them locally, but this shouldn't be necessary for normal development.

---

## Project Structure

```
client/                  # Frontend (React + Vite)
  index.html             # Entry HTML (loads fonts here)
  public/                # Static assets (PDFs, favicon)
  src/
    components/loan/     # Loan-specific UI components
    pages/               # Route pages
    styles/
      design-tokens.css  # All design tokens (colors, spacing, typography)
    lib/
      design-tokens.ts   # TypeScript token exports
server/                  # Backend (Express)
shared/                  # Shared types and schemas
```

---

## Design Tokens

All visual styling uses CSS custom properties defined in `client/src/styles/design-tokens.css`. These are the **Rural First** variable mode tokens from Figma. Do not add new tokens without team approval.

Key token categories:
- `--roads-text-*` — Text colors
- `--roads-bg-*` — Background colors
- `--roads-border-*` — Border colors
- `--roads-spacing-*` — Spacing values
- `--roads-radius-*` — Border radius values
- `--roads-font-family` — Font family (Source Sans Pro)

Typography utility classes (defined in the same file):
- `headline-100` / `headline-200` / `headline-300`
- `body-100` / `body-200-strong`
- `caption-100` / `caption-100-strong`
- `label-strong`

---

## Common Issues

### Visuals look different from the Replit version

1. **Wrong Node version** — Make sure you're on v20.20.0 (`node -v`)
2. **Font not loading** — Check your internet connection; Source Sans Pro loads from Google Fonts
3. **Missing dependencies** — Run `npm install` again
4. **Database not set up** — Run `npm run db:push` to create tables
5. **Missing .env** — Make sure `DATABASE_URL` and `SESSION_SECRET` are set

### Port already in use

The app defaults to port 5000. If that's taken, you can set a different port:

```bash
PORT=3000 npm run dev
```

---

## Building for Production

```bash
npm run build
npm start
```

This compiles the frontend and starts the Express server in production mode.
