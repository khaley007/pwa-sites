# Site Review Kit (vendored)

Review-only feedback layer for the Cloudflare preview build. Not part of the production site.

- Upstream: https://github.com/hjmaxwong/site-review-kit
- Commit: `26e169effe00416e8b141be20d9b4c3ea99d66b5`
- License: MIT (see `LICENSE`)

## Files

- `review.js`, `review.css`: copied unchanged from upstream `client/`.
- The matching Cloudflare Pages Functions are in `/functions/api/`, copied unchanged from upstream `servers/cloudflare/functions/api/`.

## How it is used

`scripts/build-cloudflare-preview.js` copies these two files to `dist/review/` and adds the review script tag before `</body>` on every generated page. Source pages in `sites/ministry/` do not reference the kit, and `server.js` never serves `vendor/` or `functions/`.

The API needs the Pages D1 binding `DB` and the secret `REVIEW_PASSCODE`. Without them it returns 503 and stays locked. Never commit the passcode or a `.dev.vars` file.

To update, copy the same files from a newer upstream commit and change the commit SHA above.
