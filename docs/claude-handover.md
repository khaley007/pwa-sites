# Claude browser handover

Technical state of the `handover/claude-browser` working branch. Last refreshed at `388d7e7` (Nov 25, 2026).

## Project context

The repository serves a static marketing site. Ministry pages in `sites/ministry/` use the shared design system under `shared/ds/` and shared assets under `shared/assets/`. Keep existing routes, navigation, forms, `/api/lead`, accessibility and working interactions intact when making scoped changes. Do not deploy from this branch work.

## Branch roles

- `handover/claude-browser`: the working branch. Commit locally, push only when a task says so.
- `redesign/pwa-websites`: the Cloudflare Pages production branch, fast-forwarded manually from the working branch.
- Live deployment is separate and runs through `deploy.sh`; it is not changed from this branch.

## Current state

- HEAD at the last refresh: `388d7e7` VA team: HR names and titles, five new members, Eduardo removed.
- Commits since `d3f721d` (newest first):
  - `388d7e7` VA team: HR names and titles, five new members, Eduardo removed
  - `6c2254a` Navy showcase bands for Websites past work and Services work
  - `8d392d1` VA Team member update (adds five team photos)
  - `e3ee0e5` Homepage work showcase on navy band; services work panels and spacing
  - `cbbe7ad` Services: free-standing work media with captions below
  - `4fa6ed1` Homepage work carousel: free-standing 16:9 media, captions below, hidden-slide focus fix
  - `f43f303` Websites: shorter centred fit cards, 16:9 past work; hover lift on link cards
  - `dd4531c` Websites page: row packages, square past work, fit cards; nav active state; hero accent contrast
  - `4ffad1c` Add website snapshots for Websites page (adds three fit-card photos)
  - `426fb10` Sitewide: Websites nav and footer links, footer grid, tighter mobile menu
  - `2c573a9` Websites page: packages, past work, process and FAQ
  - `2826ea3` Add files via upload (adds three website snapshots)
  - `5c275df` Footer: tone-on-tone waves and watermark with one-sided fade
  - `980078f` Footer: blurred wave lines and logo watermark
  - `bc9e0a1` Style pass 2: hero ripples on plain heroes, footer waves and detail
  - `7001ee7` Review fixes: testimony date, Former title, header icon, FAQ hours

## Pages and routes

Pages live in `sites/ministry/` as plain HTML sharing one `styles.css`. Clean URLs map to the `.html` files (`/pricing` serves `pricing.html`); `server.js` and the Cloudflare Pages build both do this, and neither keeps an explicit page list.

| Route | File |
|---|---|
| `/` | `index.html` |
| `/services` | `services.html` |
| `/pricing` | `pricing.html` |
| `/church-bookkeeping` | `church-bookkeeping.html` |
| `/websites` | `websites.html` |
| `/our-heart` | `our-heart.html` |
| `/va-team` | `va-team.html` (not in the main nav; linked from `our-heart.html`) |
| `/blog` | `blog.html` |
| `/blog/church-virtual-assistant-cost` | `blog/church-virtual-assistant-cost.html` |
| `/contact` | `contact.html` |
| unknown paths | `404.html`, served with status 404 |

- `sitemap.xml` lists every page above except `404`, including `/websites` (after `/church-bookkeeping`).
- Booking route: every booking button uses `/go/discover`, a redirect defined in the `GO` table in `server.js` (and mirrored by the Cloudflare preview build). Never hardcode the target URL in a page.
- `/go/quiz` redirects to an external form, so the package quiz is not part of the page HTML or `shared/js/site.js`.
- `/api/lead` receives the contact form; the `interest` field is free text capped at 200 characters, with no allowed-values list.
- Main nav order: Home, How We Serve, Packages, Bookkeeping, Websites, Our Heart, Blog, Contact, plus the "Book a Free Assessment" button. The footer Explore column lists the same pages (with "Church Websites") in a 2 x 4 grid.

## Design rules

- Hero: ripple heroes (`.pwa-hero-ripple`) are used only on plain top heroes: 404, contact, pricing, services, va-team, blog, the blog article and websites. `index`, `church-bookkeeping` and `our-heart` keep their own heroes.
- Footer: navy glow background, faint tone-on-tone wave lines (`.footer::before`, light-blue strokes at low alpha, fading out toward the left), and a large white-logo watermark (`.footer::after`, low opacity, fading toward its upper left). Both layers sit behind content, ignore pointer events and use no blur. The watermark has its own commented block in `styles.css` so it can be removed in one deletion. Footer headings use a dot and trailing hairline; the tagline and contact column sit in translucent glass boxes.
- Navy treatment (`.pwa-navy-glow`): footer, closing CTA bands (`.cta-band`), navy cards, and the showcase sections (homepage "What we've worked on", Websites "Websites we've built", Services "Examples of our work"). Showcase sections use light text: sky-200 eyebrow on a translucent chip, white headings, white 0.8 body, and glass panels (faint white fill, thin translucent border) for cards. No waves, rings or ripples on navy bands.
- Content sections are plain, with soft shadows only (`--shadow-md`, stronger on hover). Layouts are symmetric: rows of three cards stack to one centred column on phones, and an incomplete last row is never left-aligned.
- Text contrast is at least 4.5:1 against the lightest background under the text. Measure after any colour, overlay or size change; the ripple-hero H1 accent uses a slightly darker sky shade for this reason.
- Prose has no em dashes.

## Shared patterns and where they live

- `.pwa-hero-ripple`: ripple hero (gradient, two decorative ring SVGs with `aria-hidden`, bottom hairline, eyebrow dot). Markup is copied from `blog.html`; CSS in the "Style pass 1" block of `styles.css`.
- `.pwa-navy-glow`: gradient plus soft glow, hides `.cta-glow` and `.statement-glow`. Showcase sections add `.work-showcase` (homepage) or `.web-showcase` (Websites past work, Services work) for the light-text and glass variants.
- Hover lift: uses the CSS `scale` property (not `transform`, which the `.reveal` animation controls). `scale: 1.03` with a stronger shadow, 200 ms ease. Under `prefers-reduced-motion` only the shadow changes. Applied to the Websites fit cards and past-work images, the blog listing card, the Services work media, and the homepage centre-slide media. Cards that only contain a button (package cards) do not lift.
- Nav active state: `aria-current="page"` on the page's own nav link, styled by `.nav-menu > a[aria-current="page"]`. `va-team` and `404` have no nav item and no active link.
- `sites/ministry/work-carousel.js`: homepage carousel (4 s hold, click to pause with a "Paused" badge, side-card navigation, Shift+wheel, swipe, double-click zoom, reduced-motion handling). Links and buttons inside `aria-hidden` side slides get `tabindex="-1"` (original value kept in `data-work-tab`) and are restored when the slide becomes the centre.
- `sites/ministry/svc-work.js`: zoom view for `.svc-zoom-trigger` buttons (Services work media and Websites past work) and the Services "What we handle" detail panels.
- `.web-` prefix: CSS for the Websites page (package rows, past-work frames, fit cards, steps, costs). Package cards have the ids `package-basic`, `package-standard` and `package-complex`, and the fit cards link to them.
- Other prefixes in `styles.css`: `.work-` (homepage carousel and tiles), `.svc-` (Services), `.pricing-`, `.blog-card`, `.contact-`, `.footer-`, `.team-` (team cards).

## Image conventions

- Team photos: 400 x 400 WebP, lowercase hyphenated names (for example `shyla-blessy.webp`). Cards render them as 148 px circles. Keep existing filenames when a displayed name changes.
- Website snapshots (`website-<name>.webp`): 1440 x 810 (16:9). Past-work frames are 16:9 with `object-fit: cover`; the zoom view shows the full image.
- Fit-card photos (`website-fit-<package>.webp`): 1200 x 800 (3:2), used as card backgrounds under a navy overlay.
- Homepage and Services work media are near-square (about 1.0 to 1.17); five of the six homepage slides use `object-fit: contain` on a neutral or white frame because a 16:9 crop would cut content.

## Architecture notes

- `server.js` is a zero-dependency Node server for local use. It serves `.mp4` with single byte-range support and returns the styled `404.html` with status 404.
- `shared/` is not edited: `shared/js/site.js` and `shared/ds/` stay as they are. Shared assets are in `shared/assets/`.
- Site Review Kit: server code in `functions/api/`, client in `vendor/site-review-kit/`. `scripts/build-cloudflare-preview.js` injects the review script into preview HTML only; release pages carry none of it.
- `node scripts/build-cloudflare-preview.js` writes `dist/` and audits local references (links, anchors, forms, the review script on every page, and the CTA redirects).

## Working rules

- Run `git fetch origin` and confirm HEAD is level with `origin/handover/claude-browser` before starting.
- Fast-forward only; never force-push.
- Delete `dist/` after every preview build. Never edit `dist/`.
- Author commits as `Khalid <khalid.purewaterautomations@gmail.com>`.
- Never edit `shared/js/site.js` or anything in `shared/ds/`.
- No em dashes in website prose.
- Check overflow at 393, 1025 and 1440 px on any edited page.

## Release notes (technical)

- `deploy.sh` does not currently exclude `functions/` or `vendor/` from its rsync; add those exclusions before any live deploy so review tooling never ships.
- Post-deploy checks: every route returns 200, the styled 404 appears for unknown paths, `/api/lead` still works, `.mp4` plays with range requests, and no `/review/` assets are served.
