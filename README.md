# luminary
*a personal wisdom collection*

A minimal web app to collect, browse, and commune with your personal library of quotes and art encounters, powered by Supabase and the Claude API.

## Features

- **Commune** — ask any question answered solely from your own passages and impressions via Claude; daily featured passage and impression below
- **Passages** — browse all saved quotes; featured quote; filter by tag; add new quotes inline
- **Impressions** — log art encounters with photo, emotional reaction, mood tags, and venue; paginated grid; museum map showing all venues where you've collected art
- **Delete** — hover any card to remove it

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Database | Supabase (Postgres + Storage) |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Maps | Google Maps (Places Autocomplete + Maps JS API) |
| Fonts | Cormorant Garamond, DM Mono |

## Setup

**Prerequisites:** Node ≥ 18, a Supabase project, an Anthropic API key, a Google Maps API key.

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
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

3. Supabase — run in the SQL editor:
   ```sql
   create table quotes (
     id text primary key,
     text text not null,
     author text not null,
     source text,
     tags text[],
     added_at bigint
   );

   create table art_entries (
     id uuid primary key default gen_random_uuid(),
     photo_thumb_url text,
     photo_full_url text,
     emotional_reaction text not null,
     artist_name text,
     title text,
     mood_tags text[],
     venue_name text,
     location_lat float,
     location_lng float,
     encountered_at timestamptz default now(),
     updated_at timestamptz default now(),
     art_type text
   );
   ```

   Also create a Storage bucket named `art-photos` with public read access.

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
