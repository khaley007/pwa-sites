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

Evaluation and integration of Max's Site Review Kit is planned for review builds only. Required behavior includes comments, drawing/highlighting, a Review/Live view toggle, and persistent feedback. Backend choice, upstream code review, and testing remain pending. Exclude the integration and feedback data from release output, and preserve `/api/lead`.

## Next tasks

1. Confirm access to approved source materials and the private WIP implementation before any blog work.
2. Inspect the Ministry architecture and shared dependencies for the scoped redesign. Nonprofit repository removal is complete; the production hostname transition is pending.
3. Evaluate the Site Review Kit, including backend and release-output boundaries, before integration.
4. Make narrow changes and run relevant checks. Report what changed, what was checked, and any unresolved decisions concisely.

Do not push, deploy, or change owner production behavior in this handover task.
