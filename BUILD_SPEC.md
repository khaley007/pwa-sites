# pwa-sites — Build Spec (production conversion of design-canvas artboards)

One static marketing site (Ministry; Nonprofit removed, see `AGENTS.md`), one repo, one zero-dep Node server (`server.js`, already built).

| Site | Audience | Prod host | Source artboards | Copy doc |
|---|---|---|---|---|
| `sites/ministry` | FFWPU / Family Fed pastors, Tribal Messiahs | ministry.purewaterautomations.com | `design-src/ministry/*.dc.html` | `design-src/church-bookkeeping-landing-page-copy.md` |

## Pages

**ministry/**: `index.html` (Ministry Home), `services.html`, `pricing.html`, `church-bookkeeping.html`, `our-heart.html`, `contact.html` (new — lead form).

Internal links use clean URLs (`/services`, `/pricing`, `/contact` …). The server maps `/services` → `services.html`. Home is `/`.

## Conversion rules

1. **Fidelity first.** The artboards ARE the approved design. Reproduce their layout, colors, spacing, copy, and imagery faithfully. Enhancements allowed: responsiveness, semantics, SEO, accessibility, performance — never a visual redesign.
2. **Inline styles → classes.** Move artboard inline styles into one per-site stylesheet `sites/<site>/styles.css` layered on top of the design-system tokens. Reuse token variables (`var(--color-navy-900)` etc.) instead of raw hex where a token exists.
3. **Design system**: link in `<head>` in this order:
   `/shared/ds/tokens/fonts.css, base.css, colors.css, typography.css, spacing.css, radius.css, shadows.css, motion.css`, then `/shared/ds/styles.css`, then the site `styles.css`. Do NOT load `_ds_bundle.js` (canvas-editor runtime, not for production).
4. **`x-import ... Button`** → real `<a>` styled as the DS button (variants visible in artboard inline styles + `shared/ds/styles.css`). `style-hover="..."` attributes → `:hover` rules in the stylesheet.
5. **`dc-import` partials** (Nav / Footer / FounderVideo) → build the partial's HTML once, then paste identical markup into every page of that site. Keep the two sites' navs/footers separate (they differ).
6. **Responsive**: artboards are desktop-first with some `clamp()`. Add media queries at 1024px and 768px: stack multi-column grids, reduce hero padding (~188px → ~96px top on mobile), nav collapses to a hamburger (`[data-nav-toggle]` + `[data-nav-menu]`, wired by `/shared/js/site.js`). No horizontal scroll at 375px wide — verify.
7. **Assets**: reference as `/shared/assets/...`. Fix artboard-relative paths (`../assets/...` → `/shared/assets/...`).
8. **Accessibility**: one `<h1>` per page, semantic landmarks (`header/nav/main/footer`), real alt text on meaningful images (empty alt on decorative), visible focus states, skip-to-content link, color contrast AA (watch light-sky text on white).
9. **SEO head per page**: unique `<title>` (≤60 chars, keyword-led), meta description (≤155 chars), canonical URL (prod host), Open Graph + Twitter card tags (og:image `/shared/assets/logo.png` until a real card exists), `lang="en"`.
   JSON-LD: `Organization` + `ProfessionalService` on home; `FAQPage` where a page has FAQ content; `BreadcrumbList` on subpages.
   Keyword targets — ministry: church bookkeeping, virtual assistant for churches, ministry admin support, FFWPU community terms where natural.
10. **Copy docs are canonical for wording** where they overlap artboards (they are newer drafts). Bracketed `[placeholder]` items in the copy docs: OMIT — never publish placeholder stats, testimonials, or quotes. No invented numbers or testimonials anywhere.
11. **Lead form** (`contact.html` + a short form section near the bottom of `index.html`): fields name*, email*, organization, phone (optional), interest (select), message; hidden `website` honeypot input (`style="position:absolute;left:-9999px"`, `tabindex="-1"`, `autocomplete="off"`); `<form data-lead-form>`, a `<p data-form-status role="status">`, submit posts JSON to `/api/lead` via `/shared/js/site.js` (already built — just include `<script src="/shared/js/site.js" defer>`). Keep the external "Book a Free Assessment" (`https://team.purewaterautomations.com/discover`) CTA as the primary conversion path; the form is the low-friction alternative.
12. **Per-site extras**: `robots.txt` (allow all + sitemap line), `sitemap.xml` (absolute prod URLs), favicon links to `/shared/assets/logo.png`.
13. **Footer**: keep real contact details from artboards (mailto purewaterva58@gmail.com, tel +1 908 357 7801, socials). Add `/contact` link.
14. **No frameworks, no build step, no npm deps.** Plain HTML/CSS + the one shared JS file.

## Verify before finishing

- Every page loads via `node server.js` (port 8811): `/ministry/`, `/ministry/services`, … `/ministry/contact` all 200.
- No references to `.dc.html`, `support.js`, `image-slot.js`, `_ds_bundle.js`, or `x-dc`/`dc-import`/`x-import` tags remain.
- All internal links resolve; all asset paths exist on disk.
