# pwa-sites — PWA Audience Marketing Sites

One public static marketing site (Ministry) served by one zero-dependency Node process, deployed on the Hostinger VPS. The former Nonprofit site has been removed from the repository; see the pending production hostname transition below.

| Site | Audience | URL |
|---|---|---|
| `sites/ministry` | FFWPU / Family Fed pastors, Tribal Messiahs | https://ministry.purewaterautomations.com |

## What it is

- **`server.js`** — Node ≥22.5, zero deps. Host-header routing (ministry. → `sites/ministry`), clean URLs (`/services` → `services.html`), shared assets at `/shared/`, `POST /api/lead` → SQLite (`data/leads.db`, table `leads`) with honeypot + per-IP rate limit, optional Email Core notification via `EMAIL_CORE_URL` / `EMAIL_CORE_KEY` / `LEAD_NOTIFY_TO` env.
- **`sites/<site>/`** — plain HTML + one `styles.css` per site, layered on the shared design system.
- **`shared/ds/`** — Pure Water Automations design system (tokens + styles.css). `_ds_bundle.js` is the canvas-editor runtime — never load it in production pages.
- **`shared/assets/`** — logos, backgrounds, icons, imagery.
- **`design-src/`** — the original Claude Design canvas artboards (`.dc.html`) + landing-copy docs these pages were converted from. Reference only; not deployed.
- **`BUILD_SPEC.md`** — the conversion conventions (fidelity rules, SEO head, accessibility, lead form contract).

## Deploy (production — no dev tier)

`./deploy.sh` → rsync to `root@2.24.121.26:/opt/pwa-sites/current`, installs/restarts `pwa-sites.service` (port 8811), health-checks `/healthz`. Caddy vhosts for both subdomains reverse-proxy to 8811; DNS A records for `ministry` and `nonprofits` point at the box (managed via the Hostinger DNS API). The `nonprofits` vhost and DNS record remain live pending the hostname transition below.

Leads live on the box in `/opt/pwa-sites/data/leads.db` (survives deploys; `data/` is excluded from rsync --delete). Read them: `ssh root@2.24.121.26 "sqlite3 /opt/pwa-sites/data/leads.db 'SELECT created_at,audience,name,email,interest FROM leads ORDER BY id DESC LIMIT 20'"` (or `node -e` with node:sqlite if sqlite3 CLI is absent).

## Pending production hostname transition

The Nonprofit site (`sites/nonprofit`) has been removed from this repository and the Cloudflare preview. The production `nonprofits.purewaterautomations.com` hostname is still live (DNS A record, Caddy vhost, and the currently deployed server). Whether it is retired or redirected, and to where, is an unresolved owner decision. Until it is resolved:

- Do not deploy this branch to production. The current `server.js` no longer maps the `nonprofits.` host, so that hostname would return a plain 404.
- Do not change DNS, the live Caddyfile, or `deploy.sh` as part of repository work.
- Keep existing lead and CTA-click rows with `audience = 'nonprofit'` in `/opt/pwa-sites/data/leads.db`. Do not delete or migrate them.
- `design-src/nonprofit/`, `design-src/npo-landing-page-copy.md`, and the shared assets previously used only by Nonprofit are retained as reference for now.

## Local dev

`node server.js` → http://localhost:8811/ministry/ (path-prefix routing kicks in when the Host header isn't a prod vhost).

## Constraints

- No frameworks, no build step, no npm deps. Keep it that way.
- Never publish bracketed placeholder copy (stats, testimonials, quotes) from the copy docs.
- Primary CTA is the external assessment funnel (team.purewaterautomations.com/discover); the native lead form is the low-friction alternative — keep both.
- The main site (purewaterautomations.com root) lives on Hostinger shared hosting and is NOT this repo.
