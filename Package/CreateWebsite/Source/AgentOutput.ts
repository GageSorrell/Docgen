/**
 * Deterministic agent-readable output for generated documentation sites.
 *
 * @module @sorrell/docs-create-website/AgentOutput
 *
 * @file      AgentOutput.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    type AgentCorpus,
    AgentCorpusSchema,
    type AgentDocument,
    type AgentManifest,
    type AgentManifestEntry,
    AgentManifestSchema,
    type AgentMarkdownDiagnostic,
    AgentSearchIndexSchema,
    type AgentSkillArtifact,
    type DocsConfig,
    decodeDocsConfigSync,
    formatAgentDocument,
    normalizeAgentMarkdown
} from "@sorrell/docs-core";
import {
    ArchiveService,
    AtomicWriter,
    DocsFileSystem,
    DocsPath
} from "@sorrell/docs-cli";
import { Data, Effect, Layer, Schema } from "effect";
import { buildProductSkill } from "./ProductSkill.js";
import { buildSearchIndex } from "@sorrell/docs-mcp";
import { createHash } from "node:crypto";
import { recordToAgentDocument } from "@sorrell/docs-api-reference";

/** @internal */
export class AgentOutputError extends Data.TaggedError("AgentOutputError")<{
    readonly path: string;
    readonly message: string;
}> {}
interface SourceFile {
    readonly relativePath: string;
    readonly content: string;
}
interface StorybookComponent {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly props?: ReadonlyArray<Record<string, unknown>>;
    readonly stories?: ReadonlyArray<Record<string, unknown>>;
}
const stableValue = (value: unknown): unknown =>
{
    if (Array.isArray(value))
    {
        return value.map(stableValue);
    }
    if (value !== null && typeof value === "object")
    {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([ left ]: [string, any], [ right ]: [string, any]) =>
                    left.localeCompare(right)
                )
                .map(([ key, entry ]: [string, any]) => [
                    key,
                    stableValue(entry)
                ])
        );
    }
    return value;
};
const stableStringify = (value: unknown): string =>
    JSON.stringify(stableValue(value));
const checksum = (value: unknown): string =>
    createHash("sha256").update(stableStringify(value)).digest("hex");
const frontmatterValue = (content: string, key: string): string | undefined =>
    content
        .match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]
        ?.trim()
        .replace(/^['"]|['"]$/g, "");
const withoutFrontmatter = (content: string): string =>
    content.replace(/^---[\s\S]*?---\s*/u, "");
const sourceSlug = (relativePath: string): string =>
    relativePath
        .replace(/\\/g, "/")
        .replace(/\.(?:md|mdx)$/u, "")
        .replace(/(?:^|\/)index$/u, "");
const absoluteUrl = (siteUrl: string, path: string): string =>
    new URL(
        path.startsWith("/") ? path : `/${path}`,
        `${siteUrl.replace(/\/+$/, "")}/`
    ).toString();
const readFiles = (
    fileSystem: typeof DocsFileSystem.Service,
    path: typeof DocsPath.Service,
    directory: string,
    relative: string = ""
): Effect.Effect<ReadonlyArray<SourceFile>, unknown> =>
    Effect.gen(function* ()
    {
        if (!(yield* fileSystem.exists(directory)))
        {
            return [];
        }
        const names = [ ...(yield* fileSystem.readDirectory(directory)) ].sort(
            (left: string, right: string) => left.localeCompare(right)
        );
        const files: Array<SourceFile> = [];
        for (const name of names)
        {
            const absolute = path.join(directory, name);
            const nested = relative === "" ? name : `${relative}/${name}`;
            if (yield* fileSystem.isDirectory(absolute))
            {
                const nestedFiles = yield* readFiles(
                    fileSystem,
                    path,
                    absolute,
                    nested
                );
                files.push(...nestedFiles);
            }
            else if (/\.(?:md|mdx)$/u.test(name))
            {
                const content = yield* fileSystem.readText(absolute);
                files.push({ content, relativePath: nested });
            }
        }
        return files;
    });
const documentationDocuments = (
    config: DocsConfig,
    files: ReadonlyArray<SourceFile>,
    siteUrl: string
): {
    readonly documents: ReadonlyArray<AgentDocument>;
    readonly diagnostics: ReadonlyArray<string>;
} =>
{
    const documents: Array<AgentDocument> = [];
    const diagnostics: Array<string> = [];
    const versions =
        config.versions.length === 0
            ? [
                {
                    current: true,
                    directory: ".",
                    id: "current",
                    label: "v1 (Latest)",
                    order: 0,
                    version: "1"
                }
            ]
            : config.versions;
    for (const version of versions)
    {
        for (const file of files)
        {
            const slug = sourceSlug(file.relativePath);
            const route =
                version.id === "current"
                    ? `${config.routing.documentationPrefix}${slug === "" ? "/" : `/${slug}`}`
                    : `${config.routing.documentationPrefix}/${version.id}${slug === "" ? "/" : `/${slug}`}`;
            const normalized = normalizeAgentMarkdown(
                withoutFrontmatter(file.content)
            );
            const description = frontmatterValue(file.content, "description");
            diagnostics.push(
                ...normalized.diagnostics.map(
                    (diagnostic: AgentMarkdownDiagnostic) =>
                        `${file.relativePath}:${diagnostic.line}: ${diagnostic.message}`
                )
            );
            documents.push({
                id: `article:${version.id}:${slug || "index"}`,
                kind: "article",
                title:
                    frontmatterValue(file.content, "title") ??
                    slug.split("/").at(-1) ??
                    "Documentation",
                ...(description === undefined ? {} : { description }),
                content: normalized.markdown,
                metadata: { sourcePath: file.relativePath },
                url: absoluteUrl(siteUrl, route),
                version: version.id
            });
        }
    }
    return { diagnostics, documents };
};
const apiDocuments = (
    config: DocsConfig,
    raw: string | undefined,
    siteUrl: string
): ReadonlyArray<AgentDocument> =>
{
    if (raw === undefined)
    {
        return [];
    }
    try
    {
        const dataset = JSON.parse(raw) as {
            readonly records?: ReadonlyArray<
                Parameters<typeof recordToAgentDocument>[0]
            >;
        };
        return (dataset.records ?? []).map(
            (record: {
                readonly packageId: string;
                readonly packageName: string;
                readonly module: string;
                readonly displayName: string;
                readonly version: string;
                readonly summary: string;
                readonly breadcrumbs: ReadonlyArray<{
                    readonly label: string;
                    readonly current: boolean;
                    readonly href?: string;
                }>;
                readonly categories: ReadonlyArray<{
                    readonly id: string;
                    readonly label: string;
                    readonly order: number;
                    readonly collapsed: boolean;
                }>;
                readonly declarations: ReadonlyArray<{
                    readonly id: string;
                    readonly name: string;
                    readonly kind:
                        | "function"
                        | "const"
                        | "class"
                        | "interface"
                        | "type"
                        | "variable"
                        | "namespace";
                    readonly categoryId: string;
                    readonly description: string;
                    readonly signature: string;
                    readonly introductionVersion?: string;
                    readonly source?: {
                        readonly repositoryUrl: string;
                        readonly revision: string;
                        readonly file: string;
                        readonly line?: number;
                        readonly endLine?: number;
                    };
                    readonly link?: {
                        readonly href: string;
                        readonly external: boolean;
                        readonly label?: string;
                    };
                }>;
                readonly exportCount: number;
                readonly introductionVersion?: string;
                readonly source?: {
                    readonly repositoryUrl: string;
                    readonly revision: string;
                    readonly file: string;
                    readonly line?: number;
                    readonly endLine?: number;
                };
                readonly link?: {
                    readonly href: string;
                    readonly external: boolean;
                    readonly label?: string;
                };
            }) =>
            {
                const document = recordToAgentDocument(record);
                return {
                    ...document,
                    metadata: { packageId: record.packageId },
                    url: absoluteUrl(
                        siteUrl,
                        document.url.startsWith("http")
                            ? new URL(document.url).pathname
                            : document.url.replace(
                                /^\/docs/u,
                                config.routing.documentationPrefix
                            )
                    )
                };
            }
        );
    }
    catch
    {
        return [];
    }
};
const componentDocuments = (
    config: DocsConfig,
    raw: string | undefined,
    siteUrl: string
): ReadonlyArray<AgentDocument> =>
{
    if (!config.storybook.enabled || raw === undefined)
    {
        return [];
    }
    try
    {
        const manifest = JSON.parse(raw) as {
            readonly components?: ReadonlyArray<StorybookComponent>;
        };
        return (manifest.components ?? []).map(
            (component: StorybookComponent) => ({
                id: `component:${component.id}`,
                kind: "component" as const,
                title: component.title,
                ...(component.description === undefined
                    ? {}
                    : { description: component.description }),
                content: [
                    component.description ?? "",
                    ...(component.props === undefined ||
                    component.props.length === 0
                        ? []
                        : [
                            "## Props",
                            ...component.props.map(
                                (prop: Record<string, unknown>) =>
                                    `- ${String(prop.name ?? "prop")}: ${String(prop.type ?? "unknown")}` +
                                      `${prop.required === true ? " (required)" : ""}`
                            )
                        ]),
                    ...(component.stories === undefined ||
                    component.stories.length === 0
                        ? []
                        : [
                            "## Stories",
                            ...component.stories.map(
                                (story: Record<string, unknown>) =>
                                    `- ${String(story.title ?? story.id ?? "Story")}`
                            )
                        ])
                ]
                    .filter(Boolean)
                    .join("\n\n"),
                metadata: {
                    props: component.props ?? [],
                    stories: component.stories ?? []
                },
                url: absoluteUrl(
                    siteUrl,
                    `${config.routing.storybookPrefix}/?path=/docs/${component.id}`
                )
            })
        );
    }
    catch
    {
        return [];
    }
};
const markdownPath = (
    path: typeof DocsPath.Service,
    dist: string,
    markdownUrl: string,
    documentationPrefix: string
): string =>
{
    const pathname =
        new URL(markdownUrl).pathname
            .replace(new RegExp(`^${documentationPrefix}`), "")
            .replace(/^\//u, "")
            .replace(/\/$/u, "") || "index";
    return path.join(dist, pathname);
};
const markdownUrlFor = (
    config: DocsConfig,
    siteUrl: string,
    document: AgentDocument
): string =>
    document.kind === "component"
        ? absoluteUrl(
            siteUrl,
            `${config.routing.documentationPrefix}/agent/components/` +
                  `${document.id.replace(/^component:/u, "")}.md`
        )
        : document.url.endsWith("/")
            ? `${document.url}index.md`
            : `${document.url}.md`;
const versionKey = (document: AgentDocument): string =>
    document.version ?? "current";
const dogfoodConfig = (): DocsConfig =>
    decodeDocsConfigSync({
        agent: {
            enabled: true,
            essentials: [],
            mcp: { enabled: true },
            skill: { enabled: false, name: "sorrell-documentation" }
        },
        metadata: {
            description:
                "Documentation generated with Sorrell documentation tooling.",
            name: "Sorrell Documentation",
            title: "Sorrell Documentation",
            url: "https://docs.sorrell.sh"
        },
        storybook: { enabled: true },
        versions: [
            {
                current: true,
                directory: ".",
                id: "current",
                label: "v1.0.1 (Latest)",
                order: 0,
                version: "1.0.1"
            },
            {
                current: false,
                directory: "v1",
                id: "v1",
                label: "v1",
                order: 1,
                version: "v1"
            }
        ]
    });
/** @internal */
export interface AgentOutputOptions {
    readonly generatedAt?: string;
    readonly revision?: string;
}
/** @internal */
export interface AgentOutputResult {
    readonly manifest: AgentManifest;
    readonly corpus: AgentCorpus;
}
const deterministicGeneratedAt = (options: AgentOutputOptions): string =>
    options.generatedAt ?? "1970-01-01T00:00:00.000Z";
const buildAgentOutputEffect = (
    target: string,
    options: AgentOutputOptions
): Effect.Effect<
    AgentOutputResult,
    unknown,
    DocsFileSystem | DocsPath | AtomicWriter | ArchiveService
> =>
    Effect.gen(function* ()
    {
        const fileSystem = yield* DocsFileSystem;
        const path = yield* DocsPath;
        const writer = yield* AtomicWriter;
        const generatedSite = yield* fileSystem.exists(
            path.join(target, "docs.config.json")
        );
        const config = generatedSite
            ? decodeDocsConfigSync(
                JSON.parse(
                    yield* fileSystem.readText(
                        path.join(target, "docs.config.json")
                    )
                )
            )
            : dogfoodConfig();
        if (!config.agent.enabled)
        {
            const staleAgentDirectory = path.join(
                generatedSite ? target : path.join(target, "Documentation"),
                "dist",
                "agent"
            );
            if (yield* fileSystem.exists(staleAgentDirectory))
            {
                yield* fileSystem.remove(staleAgentDirectory, {
                    recursive: true
                });
            }
            return {
                corpus: {
                    checksum: checksum([]),
                    documents: [],
                    generatedAt: deterministicGeneratedAt(options),
                    version: 1
                },
                manifest: {
                    checksum: checksum([]),
                    documents: [],
                    generatedAt: deterministicGeneratedAt(options),
                    skills: [],
                    version: 1,
                    versions: []
                }
            };
        }
        const siteUrl = config.metadata.url || "http://localhost:4321";
        const documentationRoot = generatedSite
            ? path.join(target, "Documentation")
            : path.join(target, "Documentation");
        const files = yield* readFiles(
            fileSystem,
            path,
            path.join(documentationRoot, "Source", "content", "docs")
        );
        const articleResult = documentationDocuments(config, files, siteUrl);
        if (articleResult.diagnostics.length > 0)
        {
            return yield* Effect.fail(
                new AgentOutputError({
                    message: articleResult.diagnostics.join("\n"),
                    path: target
                })
            );
        }
        const apiPath = path.join(
            documentationRoot,
            "Source",
            "data",
            "ApiReference.json"
        );
        const apiRaw = yield* fileSystem
            .exists(apiPath)
            .pipe(
                Effect.flatMap((exists: boolean) =>
                    exists
                        ? fileSystem.readText(apiPath)
                        : Effect.succeed(undefined)
                )
            );
        const componentPath = path.join(
            target,
            "Storybook",
            "Distribution",
            "agent",
            "components.json"
        );
        const componentRaw = yield* fileSystem
            .exists(componentPath)
            .pipe(
                Effect.flatMap((exists: boolean) =>
                    exists
                        ? fileSystem.readText(componentPath)
                        : Effect.succeed(undefined)
                )
            );
        const documents = [
            ...articleResult.documents,
            ...apiDocuments(config, apiRaw, siteUrl),
            ...componentDocuments(config, componentRaw, siteUrl)
        ].sort(
            (
                left: {
                    readonly id: string;
                    readonly kind: "article" | "api-module" | "component";
                    readonly url: string;
                    readonly content: string;
                    readonly title: string;
                    readonly version?: string;
                    readonly source?: {
                        readonly repositoryUrl: string;
                        readonly revision: string;
                        readonly file: string;
                        readonly line?: number;
                        readonly endLine?: number;
                    };
                    readonly description?: string;
                    readonly metadata?: {
                        readonly [x: string]: unknown;
                    };
                    readonly context?: string;
                },
                right: {
                    readonly id: string;
                    readonly kind: "article" | "api-module" | "component";
                    readonly url: string;
                    readonly content: string;
                    readonly title: string;
                    readonly version?: string;
                    readonly source?: {
                        readonly repositoryUrl: string;
                        readonly revision: string;
                        readonly file: string;
                        readonly line?: number;
                        readonly endLine?: number;
                    };
                    readonly description?: string;
                    readonly metadata?: {
                        readonly [x: string]: unknown;
                    };
                    readonly context?: string;
                }
            ) =>
                left.url.localeCompare(right.url) ||
                left.id.localeCompare(right.id)
        );
        const generatedAt = deterministicGeneratedAt(options);
        const corpus: AgentCorpus = {
            generatedAt,
            ...(options.revision === undefined
                ? {}
                : { sourceRevision: options.revision }),
            checksum: checksum({ documents, sourceRevision: options.revision }),
            documents,
            version: 1
        };
        const entries: ReadonlyArray<AgentManifestEntry> = documents.map(
            (document: {
                readonly id: string;
                readonly kind: "article" | "api-module" | "component";
                readonly url: string;
                readonly content: string;
                readonly title: string;
                readonly version?: string;
                readonly source?: {
                    readonly repositoryUrl: string;
                    readonly revision: string;
                    readonly file: string;
                    readonly line?: number;
                    readonly endLine?: number;
                };
                readonly description?: string;
                readonly metadata?: {
                    readonly [x: string]: unknown;
                };
                readonly context?: string;
            }) => ({
                id: document.id,
                kind: document.kind,
                markdownUrl: markdownUrlFor(config, siteUrl, document),
                title: document.title,
                url: document.url,
                ...(document.version === undefined
                    ? {}
                    : { version: document.version }),
                checksum: checksum(formatAgentDocument(document))
            })
        );
        const versions = [ ...new Set(documents.map(versionKey)) ].sort();
        const baseManifest: AgentManifest = {
            checksum: checksum({
                entries,
                mcpEndpoint: config.agent.mcp.enabled
                    ? config.mcpEndpoint
                    : undefined,
                skills: [],
                versions
            }),
            documents: entries,
            generatedAt,
            skills: [],
            version: 1,
            versions,
            ...(config.agent.mcp.enabled
                ? { mcpEndpoint: config.mcpEndpoint }
                : {})
        };
        const documentationDist = path.join(documentationRoot, "dist");
        const landingDist = generatedSite
            ? path.join(target, "Landing", "Distribution")
            : documentationDist;
        if (yield* fileSystem.exists(documentationDist))
        {
            const previousMarkdown = yield* readFiles(
                fileSystem,
                path,
                documentationDist
            );
            for (const previous of previousMarkdown)
            {
                yield* fileSystem.remove(
                    path.join(documentationDist, previous.relativePath)
                );
            }
            const previousAgent = path.join(documentationDist, "agent");
            if (yield* fileSystem.exists(previousAgent))
            {
                yield* fileSystem.remove(previousAgent, { recursive: true });
            }
        }
        yield* fileSystem.makeDirectory(
            path.join(documentationDist, "agent", "corpus")
        );
        yield* fileSystem.makeDirectory(landingDist);
        for (const version of versions)
        {
            const versionDocuments = documents.filter(
                (document: {
                    readonly id: string;
                    readonly kind: "article" | "api-module" | "component";
                    readonly url: string;
                    readonly content: string;
                    readonly title: string;
                    readonly version?: string;
                    readonly source?: {
                        readonly repositoryUrl: string;
                        readonly revision: string;
                        readonly file: string;
                        readonly line?: number;
                        readonly endLine?: number;
                    };
                    readonly description?: string;
                    readonly metadata?: {
                        readonly [x: string]: unknown;
                    };
                    readonly context?: string;
                }) => versionKey(document) === version
            );
            const versionCorpus: AgentCorpus = {
                ...corpus,
                checksum: checksum({
                    documents: versionDocuments,
                    sourceRevision: options.revision
                }),
                documents: versionDocuments
            };
            yield* writer.writeText(
                path.join(
                    documentationDist,
                    "agent",
                    "corpus",
                    `${version}.json`
                ),
                `${JSON.stringify(versionCorpus, null, 2)}\n`
            );
            const description =
                config.agent.description === undefined
                    ? ""
                    : `${config.agent.description}\n\n`;
            const versionEntries = entries.filter(
                (entry: {
                    readonly id: string;
                    readonly kind: "article" | "api-module" | "component";
                    readonly url: string;
                    readonly title: string;
                    readonly checksum: string;
                    readonly markdownUrl: string;
                    readonly version?: string;
                }) =>
                    versionDocuments.some(
                        (document: {
                            readonly id: string;
                            readonly kind:
                                | "article"
                                | "api-module"
                                | "component";
                            readonly url: string;
                            readonly content: string;
                            readonly title: string;
                            readonly version?: string;
                            readonly source?: {
                                readonly repositoryUrl: string;
                                readonly revision: string;
                                readonly file: string;
                                readonly line?: number;
                                readonly endLine?: number;
                            };
                            readonly description?: string;
                            readonly metadata?: {
                                readonly [x: string]: unknown;
                            };
                            readonly context?: string;
                        }) => document.id === entry.id
                    )
            );
            const llms = versionEntries
                .map(
                    (entry: {
                        readonly id: string;
                        readonly kind: "article" | "api-module" | "component";
                        readonly url: string;
                        readonly title: string;
                        readonly checksum: string;
                        readonly markdownUrl: string;
                        readonly version?: string;
                    }) =>
                        `- [${entry.title}](${entry.markdownUrl}) — ${
                            versionDocuments.find(
                                (document: {
                                    readonly id: string;
                                    readonly kind:
                                        | "article"
                                        | "api-module"
                                        | "component";
                                    readonly url: string;
                                    readonly content: string;
                                    readonly title: string;
                                    readonly version?: string;
                                    readonly source?: {
                                        readonly repositoryUrl: string;
                                        readonly revision: string;
                                        readonly file: string;
                                        readonly line?: number;
                                        readonly endLine?: number;
                                    };
                                    readonly description?: string;
                                    readonly metadata?: {
                                        readonly [x: string]: unknown;
                                    };
                                    readonly context?: string;
                                }) => document.id === entry.id
                            )?.description ?? entry.kind
                        }`
                )
                .join("\n");
            const full = versionDocuments
                .map(
                    (document: {
                        readonly id: string;
                        readonly kind: "article" | "api-module" | "component";
                        readonly url: string;
                        readonly content: string;
                        readonly title: string;
                        readonly version?: string;
                        readonly source?: {
                            readonly repositoryUrl: string;
                            readonly revision: string;
                            readonly file: string;
                            readonly line?: number;
                            readonly endLine?: number;
                        };
                        readonly description?: string;
                        readonly metadata?: {
                            readonly [x: string]: unknown;
                        };
                        readonly context?: string;
                    }) => formatAgentDocument(document)
                )
                .join("\n\n---\n\n");
            const destination =
                version === "current"
                    ? documentationDist
                    : path.join(documentationDist, version);
            yield* fileSystem.makeDirectory(destination);
            yield* writer.writeText(
                path.join(destination, "llms.txt"),
                `# Documentation\n\n${description}${llms}\n`
            );
            yield* writer.writeText(
                path.join(destination, "llms-full.txt"),
                `${full}\n`
            );
        }
        if (config.agent.mcp.enabled)
        {
            yield* writer.writeText(
                path.join(documentationDist, "agent", "search-index.json"),
                `${JSON.stringify(buildSearchIndex(corpus, corpus.checksum), null, 2)}\n`
            );
        }
        for (const document of documents)
        {
            const entry = entries.find(
                (candidate: {
                    readonly id: string;
                    readonly kind: "article" | "api-module" | "component";
                    readonly url: string;
                    readonly title: string;
                    readonly checksum: string;
                    readonly markdownUrl: string;
                    readonly version?: string;
                }) => candidate.id === document.id
            );
            if (entry !== undefined)
            {
                const targetPath = markdownPath(
                    path,
                    documentationDist,
                    entry.markdownUrl,
                    config.routing.documentationPrefix
                );
                yield* fileSystem.makeDirectory(path.dirname(targetPath));
                yield* writer.writeText(
                    targetPath,
                    formatAgentDocument(document)
                );
            }
        }
        let skills: ReadonlyArray<AgentSkillArtifact> = [];
        if (config.agent.skill.enabled)
        {
            const skillDirectory = path.join(
                documentationDist,
                "agent",
                "skills",
                config.agent.skill.name
            );
            const skillResult = yield* buildProductSkill({
                config,
                corpus,
                manifest: baseManifest,
                outputDirectory: skillDirectory,
                siteUrl
            });
            skills = [
                {
                    ...skillResult.artifact,
                    archive: absoluteUrl(
                        siteUrl,
                        `${config.routing.documentationPrefix}/agent/skills/${config.agent.skill.name}/`
                    ),
                    directory: absoluteUrl(
                        siteUrl,
                        `${config.routing.documentationPrefix}/agent/skills/${config.agent.skill.name}.zip`
                    )
                }
            ];
        }
        const manifest: AgentManifest = {
            ...baseManifest,
            checksum: checksum({
                entries,
                mcpEndpoint: config.agent.mcp.enabled
                    ? config.mcpEndpoint
                    : undefined,
                skills,
                versions
            }),
            skills
        };
        yield* writer.writeText(
            path.join(documentationDist, "agent", "manifest.json"),
            `${JSON.stringify(manifest, null, 2)}\n`
        );
        const skillLinks = skills
            .map(
                (skill: {
                    readonly name: string;
                    readonly directory: string;
                    readonly archive: string;
                    readonly checksum: string;
                }) => `- [Product skill](${skill.directory})`
            )
            .join("\n");
        const versionLinks = versions
            .map((version: string) =>
            {
                const versionPrefix =
                    version === "current" ? "" : `${version}/`;
                const llmsPath =
                    `${config.routing.documentationPrefix}/${versionPrefix}llms.txt`;
                return `- [${version} documentation](${absoluteUrl(siteUrl, llmsPath)})`;
            })
            .join("\n");
        const mcpLink = config.agent.mcp.enabled
            ? `\n- [MCP endpoint](${config.mcpEndpoint})`
            : "";
        yield* writer.writeText(
            path.join(landingDist, "llms.txt"),
            [
                "# Documentation\n\n",
                config.agent.description === undefined
                    ? ""
                    : `${config.agent.description}\n\n`,
                versionLinks,
                `\n- [Agent manifest](${absoluteUrl(
                    siteUrl,
                    `${config.routing.documentationPrefix}/agent/manifest.json`
                )})`,
                skillLinks === "" ? "" : `\n${skillLinks}`,
                mcpLink,
                "\n"
            ].join("")
        );
        return { corpus, manifest };
    });
export/** @internal */
const buildAgentOutput = (
    target: string,
    options: AgentOutputOptions = {}
): Effect.Effect<AgentOutputResult, unknown> =>
    buildAgentOutputEffect(target, options).pipe(
        Effect.provide(
            Layer.mergeAll(
                DocsFileSystem.layer,
                DocsPath.layer,
                AtomicWriter.layer,
                ArchiveService.layer
            )
        )
    );
export/** @internal */
const verifyAgentOutput = (
    target: string
): Effect.Effect<void, unknown> =>
    Effect.gen(function* ()
    {
        const fileSystem = yield* DocsFileSystem;
        const path = yield* DocsPath;
        const generatedSite = yield* fileSystem.exists(
            path.join(target, "docs.config.json")
        );
        const config = generatedSite
            ? decodeDocsConfigSync(
                JSON.parse(
                    yield* fileSystem.readText(
                        path.join(target, "docs.config.json")
                    )
                )
            )
            : dogfoodConfig();
        if (!config.agent.enabled)
        {
            return;
        }
        const manifestPath = path.join(
            target,
            "Documentation",
            "dist",
            "agent",
            "manifest.json"
        );
        const manifest = Schema.decodeUnknownSync(AgentManifestSchema)(
            JSON.parse(yield* fileSystem.readText(manifestPath))
        );
        const calculatedManifestChecksum = checksum({
            entries: manifest.documents,
            mcpEndpoint: manifest.mcpEndpoint,
            skills: manifest.skills ?? [],
            versions: manifest.versions
        });
        if (calculatedManifestChecksum !== manifest.checksum)
        {
            return yield* Effect.fail(
                new AgentOutputError({
                    message: "agent manifest checksum does not match",
                    path: manifestPath
                })
            );
        }
        for (const version of manifest.versions)
        {
            const corpusPath = path.join(
                target,
                "Documentation",
                "dist",
                "agent",
                "corpus",
                `${version}.json`
            );
            const corpus = Schema.decodeUnknownSync(AgentCorpusSchema)(
                JSON.parse(yield* fileSystem.readText(corpusPath))
            );
            if (
                checksum({
                    documents: corpus.documents,
                    sourceRevision: corpus.sourceRevision
                }) !== corpus.checksum
            )
            {
                return yield* Effect.fail(
                    new AgentOutputError({
                        message: "agent corpus checksum does not match",
                        path: corpusPath
                    })
                );
            }
            for (const document of corpus.documents)
            {
                const entry = manifest.documents.find(
                    (candidate: {
                        readonly id: string;
                        readonly kind: "article" | "api-module" | "component";
                        readonly url: string;
                        readonly title: string;
                        readonly checksum: string;
                        readonly markdownUrl: string;
                        readonly version?: string;
                    }) => candidate.id === document.id
                );
                if (
                    entry === undefined ||
                    entry.checksum !== checksum(formatAgentDocument(document))
                )
                {
                    return yield* Effect.fail(
                        new AgentOutputError({
                            message: `document checksum does not match for ${document.id}`,
                            path: corpusPath
                        })
                    );
                }
                const markdownPathValue =
                    new URL(entry.markdownUrl).pathname
                        .replace(
                            new RegExp(
                                `^${config.routing.documentationPrefix}`
                            ),
                            ""
                        )
                        .replace(/^\//u, "") || "index";
                const markdownPathValueAbsolute = path.join(
                    target,
                    "Documentation",
                    "dist",
                    `${markdownPathValue.replace(/\.md$/u, "")}.md`
                );
                if (!(yield* fileSystem.exists(markdownPathValueAbsolute)))
                {
                    return yield* Effect.fail(
                        new AgentOutputError({
                            message: `Markdown twin is missing for ${document.id}`,
                            path: markdownPathValueAbsolute
                        })
                    );
                }
            }
        }
        if (config.agent.mcp.enabled)
        {
            const indexPath = path.join(
                target,
                "Documentation",
                "dist",
                "agent",
                "search-index.json"
            );
            const index = Schema.decodeUnknownSync(AgentSearchIndexSchema)(
                JSON.parse(yield* fileSystem.readText(indexPath))
            );
            if (
                index.entries.length !== manifest.documents.length ||
                index.entries.some(
                    (entry: {
                        readonly id: string;
                        readonly terms: ReadonlyArray<string>;
                        readonly version?: string;
                    }) =>
                        !manifest.documents.some(
                            (document: {
                                readonly id: string;
                                readonly kind:
                                    | "article"
                                    | "api-module"
                                    | "component";
                                readonly url: string;
                                readonly title: string;
                                readonly checksum: string;
                                readonly markdownUrl: string;
                                readonly version?: string;
                            }) => document.id === entry.id
                        )
                )
            )
            {
                return yield* Effect.fail(
                    new AgentOutputError({
                        message:
                            "agent search index does not match the manifest",
                        path: indexPath
                    })
                );
            }
        }
        if (config.agent.skill.enabled)
        {
            const skill = manifest.skills?.find(
                (value: {
                    readonly name: string;
                    readonly directory: string;
                    readonly archive: string;
                    readonly checksum: string;
                }) => value.name === config.agent.skill.name
            );
            const skillDirectory = path.join(
                target,
                "Documentation",
                "dist",
                "agent",
                "skills",
                config.agent.skill.name
            );
            if (
                skill === undefined ||
                !(yield* fileSystem.exists(
                    path.join(skillDirectory, "SKILL.md")
                )) ||
                !(yield* fileSystem.exists(`${skillDirectory}.zip`))
            )
            {
                return yield* Effect.fail(
                    new AgentOutputError({
                        message: "generated product skill is missing",
                        path: skillDirectory
                    })
                );
            }
            const metadata = JSON.parse(
                yield* fileSystem.readText(
                    path.join(skillDirectory, ".sorrell-product-skill.json")
                )
            ) as {
                readonly checksum?: string;
            };
            if (metadata.checksum !== skill.checksum)
            {
                return yield* Effect.fail(
                    new AgentOutputError({
                        message:
                            "generated product skill checksum does not match its manifest",
                        path: skillDirectory
                    })
                );
            }
        }
    }).pipe(
        Effect.provide(Layer.mergeAll(DocsFileSystem.layer, DocsPath.layer))
    );
