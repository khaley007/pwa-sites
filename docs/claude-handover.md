# Claude browser handover

## Verified public baseline

This handover starts from the `khaley007/pwa-sites` branch `redesign/pwa-websites` at `968fa16e9da0327678fbc9a500446a51151a6773`. This public transfer contains only these handover documents; the local WIP blog implementation and internal source bundle are intentionally absent.

## Project context

The repository serves static marketing sites. Ministry pages use the shared design system under `shared/ds/` and shared assets under `shared/assets/`. Preserve the existing route behavior, forms, `/api/lead`, navigation, accessibility, and working interactions while making scoped changes.

Current website redesign work targets Ministry. Nonprofit has since been removed from the repository and Cloudflare preview; the production hostname transition remains unresolved (see `AGENTS.md`). Do not change owner production hostnames or deployment behavior as part of that work without explicit resolution and authorization.

## Source access and content

Humanization and blog work require access to the relevant approved source material. The brief identifies the pricing-guide DOCX as the rewrite target; it takes precedence over the historical `PWA CONTENT.docx`. The historical file is not included here. Verify access to the applicable source and its approved facts before drafting. Do not infer editorial or publication approval from a task brief or prior implementation.

The private WIP blog implementation exists separately and is intentionally absent from this public transfer. Obtain it through an authorized private route before implementing or recreating that work. Do not assume that shared Claude Project attachments are available in every Claude Code session; verify access directly.

## Planned review tooling

The Site Review Kit is integrated for review builds only (see Architecture notes). Required behavior includes comments, drawing/highlighting, a Review/Live view toggle, and persistent feedback. Exclude the integration and feedback data from release output, and preserve `/api/lead`.

## Current state (updated for account migration)

- Branch `handover/claude-browser`, before this docs commit, at `b4ce671844e41df11baf3fae46d002c8b1a8c12a`: Style pass 1: blog hero ripples, navy glow treatment, card shadows
- Last 15 commits, newest first:
- `b4ce671` Style pass 1: blog hero ripples, navy glow treatment, card shadows
- `42c36ac` Services: floating detail panels, placeholder cards, removed info bar
- `fb91305` Services: portfolio-led layout with featured project
- `3d422da` Blog card: square crop, full gradient, centred label
- `4aa5605` Add files via upload
- `ef50023` Blog card: clipped image with navy overlay and label
- `e9f98d7` Blog: card and social preview image
- `962e92a` Add files via upload
- `626e151` Pricing: card dividers, scrollable table, River recommended
- `c74f5b2` Pricing: polished entry and custom cards, button contrast
- `86047e2` Training card order; Stream recommended; blog matches new packages
- `c91e06d` Pricing: three packages plus hourly and custom options
- `2939f0f` Footer social icons; matching leadership sections
- `d5d33b9` Review fixes: leadership titles, blog dates, contact icons
- `868ca06` Carousel: 4 s hold, click to pause, side-card nav, zoom view

## Branch roles

- `handover/claude-browser`: the Claude Code working branch. Commit locally, push only when a task says so.
- `redesign/pwa-websites`: the Cloudflare Pages production branch. It is fast-forwarded manually from the working branch.
- Owner live deployment is separate and runs through `deploy.sh`. Do not change it from this branch work.

## Architecture notes

- Pages live in `sites/ministry/` (plain HTML, one shared `styles.css`). `server.js` is a zero-dependency Node server that serves them locally.
- `shared/` is not edited: `shared/js/site.js` and `shared/ds/` stay as they are. Assets are in `shared/assets/`.
- Styles go in `sites/ministry/styles.css` under section prefixes: `.work-` (homepage carousel and tiles), `.svc-` (Services page), `.pricing-`, `.blog-card`, `.contact-`, `.footer-social`, and the style-pass classes `.pwa-hero-ripple` (top hero ripples) and `.pwa-navy-glow` (navy gradient and glow).
- Scripts: `sites/ministry/work-carousel.js` (homepage carousel and zoom view) and `sites/ministry/svc-work.js` (Services zoom view and "What we handle" panels).
- Site Review Kit: server code in `functions/api/`, client in `vendor/site-review-kit/`. `scripts/build-cloudflare-preview.js` injects the review script into preview HTML only; release pages carry none of it.
- `server.js` serves `.mp4` with single byte-range support and returns a styled `404` page from `sites/<site>/404.html`.
- `node scripts/build-cloudflare-preview.js` writes `dist/` and runs an audit of local references.

## Working rules

- Run `git fetch origin` and confirm HEAD is level with `origin/handover/claude-browser` before starting.
- Fast-forward only; never force-push.
- Delete `dist/` after every preview build. Never edit `dist/`.
- Author commits as `Khalid <khalid.purewaterautomations@gmail.com>`.
- Never edit `shared/js/site.js` or anything in `shared/ds/`.
- No em dashes in website prose.

## Release blockers (technical)

- `deploy.sh` does not currently exclude `functions/` or `vendor/` from its rsync; add those exclusions before any live deploy so review tooling never ships.
- The production `nonprofits.` hostname transition must be decided before any deploy (see `AGENTS.md`).
- Post-deploy checks: every route returns 200, the styled 404 appears for unknown paths, `/api/lead` still works, `.mp4` plays with range requests, and no `/review/` assets are served.

## Latest style-pass commit (`b4ce671`)

Elements changed, from its diff (`sites/ministry/*.html` and `styles.css`):

- Blog hero: `.pwa-hero-ripple` gradient, two decorative ring SVGs, bottom hairline, eyebrow dot (`blog.html`).
- Blog page: "Latest article" label rule, article card shadow, new "Read the full guide" pill link.
- Footer on all 10 pages: `.pwa-navy-glow` (footer text opacity raised to 0.75 for contrast).
- Navy cards and bands (`.pwa-navy-glow`): closing CTA bands (home, services, pricing, church bookkeeping, our heart), the pricing "Need more support?" card (wavy lines removed), the bookkeeping `.safeguard` card, and the our-heart statement band.
- Card shadows set to `--shadow-md`: `.card`, `.founder-card`, `.step--white`, `.client-testimonial`, `.blog-card`.

## Next tasks

1. Confirm access to approved source materials and the private WIP implementation before any blog work.
2. Inspect the Ministry architecture and shared dependencies for the scoped redesign. Nonprofit repository removal is complete; the production hostname transition is pending.
3. Evaluate the Site Review Kit, including backend and release-output boundaries, before integration.
4. Make narrow changes and run relevant checks. Report what changed, what was checked, and any unresolved decisions concisely.

Do not deploy or change owner production behavior from this branch work.
