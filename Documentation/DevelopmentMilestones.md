# Development Milestones

> Normative reference: `Documentation/ImplementationPlan.md`, titled
> **“Sorrell Documentation, Storybook, Effect CLI, and AI Skills Monorepo.”**

Implement milestones strictly in numerical order. Do not begin a milestone
until the preceding completion gate passes. When a milestone exposes an
incomplete public API needed by later work, keep it explicitly experimental
until its consumer milestone validates it.

## Milestone 1 — Repository and Governance Foundation

Establish the structure and rules on which every later milestone depends.

Deliverables:

- Save the normative implementation plan and this milestone document.
- Complete `AGENTS.md`, including nested Markdown/MDX content, directory responsibilities, Effect conventions, responsive requirements, and mandatory `agent-browser` testing.
- Configure npm workspaces for packages, scripts, applications, `Documentation`, and `Website`.
- Add shared Node 24 and strict TypeScript 6 configuration, using `@sorrell/tsconfig`, plus the shared ESLint configuration under `Configuration`.
- Reserve `sorrell-docs` as the sole public executable.
- Add CI scaffolding for workspace checks without deployment.

Completion gate:

- A clean install succeeds.
- Workspace discovery and baseline lint/typecheck commands run successfully.
- No package violates PascalCase or the `"private": false` rule.

## Milestone 2 — Effect v4 RC Runtime Baseline

Pin the aligned Effect RC packages, create `@sorrell/docs-cli`, establish
Effect CLI/process imports, implement filesystem/path/terminal/temp/atomic
write/process services, add lint guards, and test interruption and exit
failures.

## Milestone 3 — Core Configuration and Domain Models

Implement `@sorrell/docs-core` with schemas, normalization, diagnostics,
navigation/content/API/generated-project models, including API-reference
breadcrumbs, categories, export counts, introduction versions, source records,
stable links, normalized route prefixes, Vercel project maps, and release
manifests, plus deterministic theme fixtures without Node-only imports in
browser consumers.

## Milestone 4 — Effect Automation Services

Implement workspace discovery, package managers, templates, safe targets,
manifests, Git/GitHub/Vercel/archive/checksum/retry services, scoped temporary
directories, atomic promotion, bounded checks, and sequential orchestration.

## Milestone 5 — Web UI and Theme System

Implement `@sorrell/docs-ui`, its responsive landing and documentation chrome,
MDX primitives, assets, semantic light/dark tokens, the accessible `Copy for
LLM` document control, API-reference shell, grouped sidebar, breadcrumbs,
declaration metadata rows, source-link treatments, signature blocks, and the
`Website` sandbox. Verify representative layouts, keyboard navigation,
clipboard fallback behavior, and accessibility with `agent-browser`.

## Milestone 6 — Astro Documentation Platform

Implement `@sorrell/docs-astro`, content collections, Markdown/MDX processing,
routes, versions, redirects, permalinks, highlighting, search metadata,
canonical/OG metadata, 404 handling, Pagefind, top-of-content `Copy for LLM`
integration for articles, and the initial `Documentation` dogfood application
mounted at the normalized documentation prefix, defaulting to `/docs`.

## Milestone 7 — Independent Web Storybook at `/storybook`

Implement `@sorrell/docs-storybook-web` as an independent React/Vite
application package with Docs, Autodocs, controls, themes, prop inference,
development routing, production base-path configuration, and representative
story/example/article fixtures. Verify theme synchronization and all nested
`/storybook/` assets with `agent-browser`.

## Milestone 8 — API Reference and Snapshot Pipeline

Implement `@sorrell/docs-api-reference` with programmatic TypeDoc discovery and
Doxygen XML parsing, named C++ project inputs, mixed-language multi-package datasets, validation, checksums, snapshots, publish/resolve/
restore, Astro API pages, normalized content for the top-of-page `Copy for
LLM` control, and the complete Effect-style reference-page view model and
layout contract, including breadcrumbs, grouped package/module navigation,
export counts, introduction metadata, GitHub source links, declaration kind
badges, TypeScript and C++ signature highlighting, signature copy controls,
stable anchors, and the `On this page` table of contents. Consume Doxygen XML
prepared by the project build; do not invoke Doxygen from the site generator.
Support separately configured Unreal projects and plugins through their
`.uproject` and `.uplugin` descriptors, including documented standalone enums.

## Milestone 9 — `sorrell-docs` CLI and Three-Package Website Generator

Implement `@sorrell/docs-create-website` and generate `Landing`,
`Documentation`, and optional `Storybook` workspace packages with matching
base paths, package manifests, Vercel project metadata, deployment manifests,
route-aware links, native Storybook, API, development, build, and verify
commands with prompt/non-interactive parity, staged validation, atomic
promotion, and interruption cleanup. Storybook-disabled projects omit the
Storybook package, route, dependency, and deployment configuration.

## Milestone 10 — React Native Storybook Library

Implement `@sorrell/docs-react-native-storybook`, provider composition,
persistence, Metro integration, controls, decorators, article primitives, and
fixture-level story/example/article coverage.

## Milestone 11 — `sorrell-docs story` CLI and Expo Applications

Implement the `story` command group in `sorrell-docs`, Expo project
generation, native commands, and both required applications with
Android/iOS-compatible Effect-managed Expo and Storybook processes.

## Milestone 12 — AI Skill Suite and Installer

Create the six canonical skill bundles, metadata, package them in
`@sorrell/docs-skills`, and implement project/user scoped list/install/update/
uninstall behavior with managed-collision protection for Codex (default) and
Claude Code (`--agent claude`) install targets.

## Milestone 13 — Vercel Routing and Release Automation

Add normal and snapshot Vercel configuration for independent Landing,
Documentation, and optional Storybook projects. Generate Landing-owned rewrites
for `/docs` and `/storybook`, including nested paths, assets, redirects, and
configurable route prefixes. Implement child-first deployment, Landing-last
routing publication, release manifests, exact revision/API/Storybook pairing,
rollback to retained child deployments, validated redacted environment
configuration, thin GitHub Actions, and bounded safe retries.

## Milestone 14 — Agent-Readable Documentation Output

Add the shared `AgentDocument` model, agent-manifest and corpus schemas, and
single formatter to `@sorrell/docs-core`. Replace the separate Copy for LLM
models in `@sorrell/docs-ui` and `@sorrell/docs-api-reference` with them, and
add declaration kind, `Added in` metadata, and source links to API-module
documents. Add the `agent` configuration block, the web Storybook component
manifest, and the agent-output build stage, which emits Markdown twins,
per-version `llms.txt` and `llms-full.txt`, `agent/manifest.json`, and
`agent/corpus/{version}.json`. Landing emits the root `/llms.txt`. Add
`sorrell-docs agent build|verify`, noindex headers, and Pagefind and sitemap
exclusion, and update the authoring and publishing skills. Gate: Copy for LLM
text and Markdown twins are byte-identical, no JSX or raw HTML leaks into agent
documents, repeated builds are deterministic, and a Vercel preview serves the
agent files.

## Milestone 15 — Generated Product Skills

Generate the site's product skill (`SKILL.md` plus version-pinned
`references/`) from the agent corpus, requiring an author-written
`agent.description`. Add package-scoped `sorrell-docs agent skill`, publish
skill directories and archives beneath the documentation prefix, and add
`skills install --from`. Keep product skills out of `Skill` and
`@sorrell/docs-skills`. Gate: generated skills pass the skill quick validator
and install into Codex and Claude Code targets, and a behavioral fixture
confirms that version-specific API questions route to the matching reference.

## Milestone 16 — Hosted MCP Server

Implement `@sorrell/docs-mcp` with `McpServer` and `Toolkit` from
`effect/unstable/ai`, a build-time lexical search index, and the read-only
`search_docs`, `get_document`, `get_api`, `list_versions`, `list_packages`, and
`list_components` tools, with `Vercel` and `Stdio` entry modules. Validate the
corpus and index at build time, then verify checksums and load versions on
first use at runtime. Add `agent.mcp.enabled`, the normalized `mcpEndpoint`
(`https://mcp.` plus the public host without a leading `www.`), and a
no-store `{mcpEndpoint}/health` route that reports the release id and corpus
checksum. Generate the optional `Mcp` application package as its own Vercel
function project serving the root of the `mcp` subdomain, with no Landing
rewrite and no `/mcp` route. Deployment adds the subdomain, reports DNS records
when needed, verifies previews through their deployment URLs, and points the
subdomain at the verified deployment through a Vercel alias before Landing. A
bounded post-promotion health check must pass before Landing is published, and
any failure restores the previous MCP and Landing deployments. Add
`sorrell-docs agent mcp` over stdio and a local MCP port in `dev`. Gate: an MCP
client completes initialization and tool calls against the preview deployment
and, in an authorized test project, on the `mcp` subdomain; corpus-checksum
mismatches block promotion; post-promotion failures roll back; and MCP-disabled
sites omit the package, subdomain, and project.

## Milestone 17 — Final Documentation, Packaging, and Release Readiness

Complete GFM documentation for the generated workspace packages, Vercel
routing, and agent access, package-consumer tests, binary-manifest checks,
cleanup, the full CI matrix, packed-artifact skill validation, generated-site
and Expo consumer tests, and final `agent-browser` verification of `/`,
`/docs`, versioned/API-reference paths, optional `/storybook`,
desktop/tablet/mobile layouts, theme, search, Storybook, and accessibility
scenarios. Verify agent output, a generated product skill, and the MCP
endpoint on the `mcp` subdomain.
