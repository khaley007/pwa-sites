# Claude Code instructions

Use `docs/claude-handover.md` as the starting context for this handover. Read repository instructions that apply to the files being changed, then inspect the relevant code before editing.

## Project boundaries

- The sites use static HTML and CSS. Ministry pages reuse the shared design system in `shared/ds/` and assets in `shared/assets/`.
- Current redesign work targets Ministry. Nonprofit has been removed from the repository and preview; the production `nonprofits.` hostname transition is unresolved (see `AGENTS.md`). Do not deploy until it is resolved.
- Preserve existing routes, navigation, forms, `/api/lead`, shared assets, accessibility, and working behavior unless an approved task requires a change.
- Make narrow changes, avoid unrelated edits, and report concise milestones and checks performed.
- Run only checks relevant to the change. Do not push, deploy, or change owner production settings without explicit authorization.

## Content and review

- Do not add generic em dashes to edited website prose. Preserve programming syntax and direct quotations; flag quotation punctuation questions instead of silently changing attributed text.
- Humanization and blog work require access to the relevant approved sources. The pricing-guide DOCX is the rewrite source identified by the brief and takes precedence over the historical `PWA CONTENT.docx`; final publication approval remains separate.
- The private WIP blog implementation is intentionally absent from this public transfer. Before implementing or recreating it, obtain it through an authorized private route.
- The planned Site Review Kit belongs only in review builds. Exclude its integration and feedback data from release output.
- Do not assume shared Claude Project attachments are available in every Claude Code session. Verify access to sources before relying on them.
