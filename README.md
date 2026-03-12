# luminary
*a personal wisdom library*

A minimal web app to save, browse, and query a personal collection of quotes, powered by Supabase and the Claude API.

## Features

- **Library** — browse all saved quotes; daily featured quote; filter by tag
- **Add Quote** — save a quote with author, source, and tags (preset + custom)
- **Ask** — ask a question answered solely from your own quotes via Claude
- **Delete** — hover any quote card to remove it from your library

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Database | Supabase (Postgres) |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Fonts | Cormorant Garamond, DM Mono |

## Setup

**Prerequisites:** Node ≥ 18, a Supabase project, an Anthropic API key.

1. Clone & install
   ```bash
   git clone <repo-url>
   cd luminary
   npm install
   ```

2. Environment variables — create `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

3. Supabase table — run in the SQL editor:
   ```sql
   create table quotes (
     id text primary key,
     text text not null,
     author text not null,
     source text,
     tags text[],
     added_at bigint
   );
   ```

4. Run
   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
