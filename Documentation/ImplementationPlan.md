# Sorrell Documentation, Storybook, Effect CLI, and AI Skills Monorepo

## Summary

Build a publishable toolkit that reproduces the reference Astro documentation
experience while making its branding, content, packages, navigation, and
component workbench configurable. Generated sites consist of independent
`Landing`, `Documentation`, optional `Storybook`, and optional `Mcp` application
packages. Vercel routes `/`, `/docs`, and `/storybook`, and serves the optional
MCP server on its own `mcp` subdomain. The toolkit also provides reusable React
Native Storybook infrastructure, Effect v4 RC-powered automation, six
installable AI skills, and agent access for every generated site: static
agent-readable documentation, generated product skills, and an optional MCP
server hosted on Vercel at the `mcp` subdomain.

Expose exactly one public binary:

- `sorrell-docs` — websites, web Storybook, native Storybook, content, skills, agent access, builds, API references, and publishing.

Generated websites use `Landing` for `/`, `Documentation` for `/docs`, an
optional `Storybook` package for `/storybook`, and an optional `Mcp` package
on the `mcp` subdomain (for example `mcp.example.com`). `Documentation` is
the published
dogfood site, `Website` is the web-package development sandbox, and both
`Application` subdirectories are Android/iOS Expo Storybook apps.

## Effect v4 RC Foundation

Pin the initial aligned RC release to `4.0.0-rc.117` for `effect`,
`@effect/platform-node`, and `@effect/vitest`. Commit exact versions and the
lockfile. Upgrade aligned Effect RC packages atomically after compatibility
checks; never use floating RC ranges in published manifests.

Use Effect CLI `Argument`, `Command`, `Flag`, and `Prompt`; run entrypoints with
`NodeRuntime.runMain` and `NodeServices.layer`; use `ChildProcess` and
`ChildProcessSpawner` from `effect/unstable/process` with executable and
argument arrays; and use Effect `FileSystem`, `Path`, `Terminal`, `Config`,
`Schema`, `Stream`, `Layer`, and structured logging for Node automation.
Expected failures are tagged errors with actionable messages and exit codes.
Use `@effect/vitest` and test layers for services, command handlers,
interruption, retries, and error rendering.

## Packages and public interfaces

Every published package uses the `@sorrell/docs-` prefix, lives in a PascalCase
directory beneath `Package`, sets `"private": false`, and publishes compiled
output and declarations.

| Package | Responsibility |
| --- | --- |
| `@sorrell/docs-core` | Schema-backed configuration and shared domain models. |
| `@sorrell/docs-ui` | Astro layouts, React islands, tokens, landing sections, documentation chrome, MDX primitives, Copy for LLM controls, and assets. |
| `@sorrell/docs-astro` | Astro integration, `/docs` base-path content, Markdown/MDX, routes, article/reference-page integration, Pagefind, redirects, SEO, OG images, and verification. |
| `@sorrell/docs-cli` | Shared Effect services, layers, errors, process execution, atomic filesystem operations, logging, and CLI utilities. |
| `@sorrell/docs-storybook-web` | Independent React/Vite Storybook application, `/storybook` base-path configuration, themes, Autodocs, decorators, and build helpers. |
| `@sorrell/docs-api-reference` | Effect-based TypeDoc and Doxygen XML discovery, mixed-language datasets, validation, checksums, snapshots, restore, and rollback inputs. |
| `@sorrell/docs-react-native-storybook` | Expo/Storybook providers, persistence, Metro integration, decorators, controls, and native article primitives. |
| `@sorrell/docs-create-website` | The `sorrell-docs` binary and website/content/build/publication, web Storybook, and Expo/native Storybook commands. |
| `@sorrell/docs-skills` | Canonical AI skills and Effect-based installation services, including Codex/Claude Code targets and external skill sources; no competing binary. |
| `@sorrell/docs-mcp` | Read-only Effect `McpServer` toolkit over the agent corpus, build-time search index, and an HTTP handler with `Vercel` and `Stdio` entry modules; no binary. |

`defineDocsConfig()` is backed by Effect Schema and covers metadata, tokens,
navigation, versions, landing content, packages, API sources, redirects,
Storybook, agent access, repository links, normalized route prefixes, Vercel
project maps, and release manifests. Runtime decoding diagnostics include the failing path
and expected value. The binary supports prompts and
equivalent non-interactive flags, supported package managers, and refuse
non-empty destinations.

Every article and API/reference page includes an accessible `Copy for LLM`
button at the top of the document content. It copies a normalized,
model-friendly representation of that page, including its title, version or
package context, canonical URL, and documentation content. The control is not
rendered on unrelated landing, navigation, Storybook, or utility pages. Its
text comes from the shared agent-document formatter (see
[Agent access](#agent-access)) and is byte-identical to the page's Markdown
twin.

### API reference presentation contract

Generated TypeDoc and Doxygen reference pages must reproduce the API-reference experience
of the Effect v4 reference page at
`https://effect.website/docs/v4/api/platform-deno/DenoChildProcessSpawner`.
The generated reference shell includes:

- The documentation header with Docs, Onboarding, Guides, Reference, version
  selection, search, repository/community links, and theme controls where those
  features are enabled by the site configuration.
- A reference sidebar showing the API-reference label, package name, package
  version, grouped modules, collapsible categories, and the active module.
- Breadcrumbs in the form `API REFERENCE / {version} / {package} / {module}`.
- A module header containing the module name, summary, rendered JSDoc prose,
  export count, `Added in {version}` metadata, and a GitHub source link.
- Category sections such as Layers, Models, and Transforming, with stable
  anchors and an `On this page` table of contents that follows those sections
  and declarations.
- Declaration entries with their name, kind badge such as `INTERFACE`,
  description, `Added in {version}` metadata, GitHub source link, and a
  syntax-highlighted signature block with a copy control.

The API data model must retain package/module identity, source language, category and
declaration ordering, declaration kind, export counts, introduction versions,
JSDoc content, signature text, source file and line information, repository
revision, and canonical links. Source links must resolve to stable GitHub URLs
for the exact generated revision. The layout must preserve the three-column
desktop experience and provide usable sidebar and table-of-contents behavior at
smaller widths. C++ projects consume Doxygen XML generated by the project build;
each configured project identifies its XML directory and contributes documented
public namespaces, classes, structs, and groups as reference pages with public
members. A site may combine Doxygen projects with TypeDoc packages and JSON
Schemas.

## CLI contracts

### Generated website packages and Vercel routing

Generated websites are workspaces containing up to four independently
buildable application packages:

- `Landing` owns `/`, the public custom domain, and the root `/llms.txt`.
- `Documentation` is an Astro application built with the configured
  documentation prefix, defaulting to `/docs`.
- `Storybook` is an optional React/Vite application built with the configured
  Storybook prefix, defaulting to `/storybook`.
- `Mcp` is an optional Vercel function application serving the read-only MCP
  endpoint at the root of the `mcp` subdomain. It is not routed through
  Landing, and the public domain has no `/mcp` route.

When Storybook or the MCP server is disabled, its package, dependencies, route
or subdomain, Vercel project, and deployment are omitted.

The landing package receives generated Vercel rewrites after child deployments
are available. It rewrites the documentation and Storybook prefixes, including
nested paths and assets, to immutable child deployment URLs or stable aliases.
Child deployment URLs never appear in canonical URLs, generated navigation, or
agent output.

The normalized configuration exposes `documentationPrefix`, `storybookPrefix`,
and, when MCP is enabled, the absolute `mcpEndpoint`. It validates leading
slashes, disallows trailing slashes and overlapping prefixes, and exposes a
Vercel project map for `landing`, `documentation`, optional `storybook`, and
optional `mcp` packages. `mcpEndpoint` is `https://mcp.` followed by the public
domain's host, with any leading `www.` removed.

`sorrell-docs` provides `init`, `add article|package|version`, `dev`, `build`,
`verify`, `storybook init|dev|build|verify`, `storybook add story|example|article`,
`story init|dev|generate|verify`, `story add story|example|article`,
`api generate|validate|snapshot|restore`, `deploy preview|production|rollback`,
`skills list|install|update|uninstall`, and `agent build|verify|skill|mcp`. The
`story` group owns Expo and React Native Storybook creation and authoring; the
`storybook` group owns web Storybook; the `agent` group owns agent output for
the documented product. `dev` runs the web packages behind temporary local
routing and the optional MCP server on its own local port; `build` builds
Documentation, optional Storybook, agent output, and the optional MCP server
before Landing and emits a release manifest; deployment publishes child Vercel
projects first, generates Landing rewrites, points the `mcp` subdomain at the
verified MCP deployment, publishes Landing last, verifies the shared routes and
MCP endpoint, and records the complete release; rollback restores a previous
release manifest, including the MCP deployment behind the subdomain.
All commands use Effect-managed subprocesses with structured concurrency and
interruption cleanup.

## Web and native Storybook

The independent web Storybook package uses `@storybook/react-vite`, `@storybook/addon-docs`,
Autodocs, controls, Doc Blocks, official themes, inferred props, and a theme
message bridge at `/storybook/`. Its production build uses the normalized
`/storybook/` base path, is deployed as its own Vercel project, is excluded
from Pagefind and the documentation sitemap, and is `noindex`. The Landing
project owns the public rewrite to it.

The React Native package provides provider composition, persistent selection,
Metro integration, controls, gesture/safe-area/keyboard providers, theme
overrides, decorators, and `Article` primitives. Both Expo applications must
remain compatible with Android and iOS development clients.

## Agent access

Every generated site can expose its product documentation to AI agents through
static agent output, a generated product skill, and an optional hosted MCP
server. All three are built from one agent corpus. They describe the documented
product and are distinct from the six workflow skills, which describe
`sorrell-docs` itself.

- **Document model.** `@sorrell/docs-core` defines the `AgentDocument` schema
  (`article`, `api-module`, or `component`), the agent-manifest, corpus, and
  search-index schemas, and the single formatter used by Copy for LLM, Markdown
  twins, `llms-full.txt`, product-skill references, and MCP responses. API
  documents include declaration kinds, `Added in` metadata, and source links.
  MDX primitives render as Markdown, and no JSX or raw HTML reaches agent
  documents. The `agent` configuration block holds `enabled` (default `true`),
  an author-written `description`, curated `essentials`, `skill`, and `mcp`.
- **Static output.** A build stage after Documentation, Pagefind, and optional
  Storybook writes a `.md` twin beside every article, API module, and component
  page (linked with `rel="alternate"`), per-version `llms.txt` and
  `llms-full.txt`, `agent/manifest.json`, and `agent/corpus/{version}.json`.
  Component documents come from a build-time web Storybook component manifest.
  Landing emits the root `/llms.txt`. Agent files are `noindex` and excluded
  from Pagefind and the sitemap.
- **Product skills.** When enabled, the build generates a `SKILL.md` with an
  author-written description, overview, curated essentials, and API index, plus
  version-pinned `references/`, and publishes it beneath
  `{documentationPrefix}/agent/skills/{name}/`. `agent skill --package`
  writes a package-scoped skill that ships in npm tarballs, and
  `skills install --from` installs product skills through the managed
  installer. Product skills never enter `Skill` or `@sorrell/docs-skills`.
- **MCP server.** `@sorrell/docs-mcp` uses `McpServer` and `Toolkit` from
  `effect/unstable/ai` (no `@modelcontextprotocol/sdk`) to serve the read-only
  tools `search_docs`, `get_document`, `get_api`, `list_versions`,
  `list_packages`, and `list_components`, plus one resource per document keyed
  by canonical URL. The generated `Mcp` package bundles its release's corpus
  and lexical search index, validated at build time and loaded per version on
  first use, and serves `McpServer.layerHttp` through `HttpRouter.toWebHandler`.
  It makes no outbound requests and requires no authentication. A
  `{mcpEndpoint}/health` route reports the release id and corpus checksum.
  Release manifests pair it with the exact Documentation and API snapshot
  revisions, and a checksum mismatch blocks promotion. `agent mcp --source`
  serves the same toolkit over stdio.
- **MCP subdomain.** `agent.mcp` holds only `enabled`. There is no host,
  route, or prefix setting.
  - The `Mcp` Vercel project owns the `mcp` subdomain, so each MCP call counts
    as one Vercel request rather than two through a Landing rewrite.
  - Deployment adds the subdomain to the project and reports the DNS record
    needed when the domain does not use Vercel DNS.
  - Previews are verified through the MCP preview deployment URL.
  - Production points the subdomain at the verified deployment through a Vercel
    alias immediately before Landing. A post-promotion `{mcpEndpoint}/health`
    check, retried on a bounded schedule, must report the new release id and
    checksum before Landing is published.
  - If any step fails, the subdomain returns to the previous MCP deployment and
    the previous Landing deployment is restored. Rollback runs the same check.

## Automation, skills, and repository implementation

Use reusable Effect services for workspace discovery, package-manager
selection, templates, safe targets, manifests, Git, Vercel, archives,
checksums, retries, and atomic promotion. Keep npm and GitHub Actions thin.
Store six skill bundles directly under `Skill` in directories named after
their canonical kebab-case install names, use `sorrell-docs` in examples, install to Codex by
default or Claude Code with `--agent claude`, and refuse unmanaged installation
collisions.

Establish npm workspaces for both Expo apps, generated `Landing`/`Documentation`/
optional `Storybook` applications, `Documentation`, packages, scripts, and
`Website`; centralize the Node 24 and strict TypeScript 6 compiler baseline
under `Configuration`, keep tool-specific policy beside its tool, allow nested
documentation content; and use
`agent-browser` at desktop, tablet, and feasible mobile widths.

The full plan also requires API snapshots, Pagefind, Vercel project rewrites,
release manifests, child-first deployment, package-consumer tests, Expo
exports/prebuilds, and final browser verification of `/`, `/docs`, versioned
and API-reference paths, and optional `/storybook`, plus preview verification
of agent output, generated product skills, and the optional MCP endpoint on the
`mcp` subdomain.
These are ordered by
`Documentation/DevelopmentMilestones.md` and are intentionally implemented
only after their preceding gates pass.
