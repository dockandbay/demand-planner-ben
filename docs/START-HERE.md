# START HERE — set up your own demand planner

This is a self-contained copy of the demand planner. Following the steps below,
your Claude Code will stand up your **own** database and run the app entirely in
your environment — independent of Diviyaj's setup.

## What you need first
1. Your own **Supabase account** — sign in at supabase.com (you're already an Owner of
   the shared "trade-board" project, so you can read the source data from there).
2. Your own **Anthropic API key** — console.anthropic.com.

## Then just paste this into Claude Code (opened in this folder)

```
This folder is the Dock & Bay demand planner — I want to run my own independent copy.
Please set it up end to end:

1. Read CLAUDE.md to understand how the app is wired.
2. Create my own new Supabase project for this.
3. Copy the `planner` schema + data into my new project from the SOURCE: the existing
   shared Supabase project (I'm an Owner — grab its connection string from the Supabase
   dashboard, Project Settings > Database). Use it once just to copy the data across.
4. Create a .env from .env.example with:
   - DATABASE_URL = my own new Supabase connection (the copy you just made)
   - ANTHROPIC_API_KEY = my own key
5. Run `npm install`, then start the server, and give me the local URL to open.
6. Confirm forecasts load AND save against my own database (full read + write).

Then walk me through the structure so I can start improving it.
```

That's it — from here on it's entirely your stack: your repo, your database, your keys.
Ping Diviyaj only if something won't run.
