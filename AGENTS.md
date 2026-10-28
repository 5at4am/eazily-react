# Eazily project guidance

Before changing UI, inspect the route, its real data and actions, existing components, shared CSS tokens, and relevant project docs. Read `DESIGN.md`; load only the design skill(s) relevant to the request. Keep the existing React 19 + Vite + plain CSS architecture and hand-built components; do not add a UI framework or animation dependency without a clear need.

For UI work, identify the audience and most important usability problem first. Reuse existing tokens and components, then implement a deliberate visual direction with responsive behavior, visible focus, readable text, and reduced-motion support. Preserve authentication, role gates, data flows, and existing interactions. Do not invent sample business data in real workspaces.

After implementation, run targeted tests plus lint/build when feasible. Use available browser automation to inspect representative phone and desktop widths; report clearly if rendered visual inspection was not possible. Check for clipping, horizontal overflow, obscured controls, broken actions, and inconsistent component states. Update `DESIGN.md` only when a deliberate shared design decision changes.

## Installed design skills

- `ui-ux-pro-max`: `.opencode/skills/ui-ux-pro-max/SKILL.md`; use for design-system research, UX recommendations, stack guidance, and its search tool when a UI task needs exploration.
- `impeccable`: `.opencode/skills/impeccable/SKILL.md`; invoke as `/impeccable <command>` (for example `/impeccable critique` or `/impeccable polish`) for focused critique/review.
- `design-taste-frontend`: `.agents/skills/design-taste-frontend/SKILL.md`; invoke/read for art direction and app-screen audits. Follow its app-screen workflow for dashboards, not its marketing-page workflow.
- `frontend-design`: `.agents/skills/frontend-design/SKILL.md`; read for distinctive frontend design decisions and self-critique.

OpenCode discovers project skills from `.opencode/skills/` and `.agents/skills/`. Use only the relevant skills for a task; do not run all of them by default. Diagram Design and Frontend Slides are intentionally not installed: this application has no diagram-generation or presentation feature.
