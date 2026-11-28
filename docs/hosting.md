# Hosting without Vercel

Reknit is a standard Next.js app. `next start` (or the Docker image below) runs
it anywhere. Nothing in the code depends on Vercel.

## Easiest: Render (connects to GitHub, deploys on every push to main)
1. render.com > New > Web Service > pick this repository.
2. Runtime: **Docker** (it finds the `Dockerfile`). Or Node: build `npm ci && npm run build`, start `npm run start`.
3. Environment variables (only needed for the waitlist): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
4. Add the custom domain under Settings > Custom Domains and follow the DNS steps.

## Other hosts
- **Fly.io / Railway / Hetzner / any VPS:** build the Dockerfile and run it; it listens on port 3000.
- **Netlify:** supports Next.js through its own adapter.
- **Cloudflare:** needs the OpenNext adapter. More setup, more risk, not advised before a demo.

## Then
- Point the domain at the new host, and set `REKNIT_APP_URL` to that address when syncing the iPhone app (`docs/ios-app.md`).
- Turn off the old host and remove the Vercel GitHub integration so it stops commenting on pull requests.
- The camera needs HTTPS. Every host above provides it for custom domains.
