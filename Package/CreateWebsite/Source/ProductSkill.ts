/**
 * Generate installable product skills from the agent corpus.
 *
 * @module @sorrell/docs-create-website/ProductSkill
 *
 * @file      ProductSkill.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    type AgentCorpus,
    AgentCorpusSchema,
    type AgentDocument,
    type AgentManifest,
    AgentManifestSchema,
    type AgentSkillArtifact,
    type DocsConfig,
    decodeDocsConfigSync,
    formatAgentDocument
} from "@sorrell/docs-core";
import {
    ArchiveService,
    AtomicWriter,
    DocsFileSystem,
    DocsPath,
    checksumText
} from "@sorrell/docs-cli";
import { Effect, Layer, Schema } from "effect";

/** @internal */
export class ProductSkillError extends Error
{
    readonly _tag: "ProductSkillError" = "ProductSkillError" as const;
    constructor(
        readonly path: string,
        message: string
    )
    {
        super(message);
    }
}
/** @internal */
export interface ProductSkillOptions {
    readonly config: DocsConfig;
    readonly corpus: AgentCorpus;
    readonly manifest: AgentManifest;
    readonly outputDirectory: string;
    readonly siteUrl?: string;
    readonly packageId?: string;
}
/** @internal */
export interface ProductSkillResult {
    readonly artifact: AgentSkillArtifact;
    readonly documents: ReadonlyArray<AgentDocument>;
}
const safeName = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "document";
const referenceName = (document: AgentDocument): string =>
    `${safeName(document.id.replace(/[:/]/g, "-"))}.md`;
const currentDocuments = (
    config: DocsConfig,
    corpus: AgentCorpus
): ReadonlyArray<AgentDocument> =>
{
    const currentVersion =
        config.versions.find(
            (version: {
                readonly label: string;
                readonly current: boolean;
                readonly id: string;
                readonly order: number;
                readonly directory: string;
                readonly version?: string;
                readonly href?: string;
            }) => version.current
        )?.id ?? "current";
    const documentationVersions = new Set(
        config.versions.map(
            (version: {
                readonly label: string;
                readonly current: boolean;
                readonly id: string;
                readonly order: number;
                readonly directory: string;
                readonly version?: string;
                readonly href?: string;
            }) => version.id
        )
    );
    return corpus.documents.filter(
        (document: {
            readonly id: string;
            readonly kind: "article" | "api-module" | "json-schema" | "component";
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
        }) =>
            document.version === undefined ||
            document.version === currentVersion ||
            !documentationVersions.has(document.version)
    );
};
const isApiModule = (document: AgentDocument): boolean =>
    document.kind === "api-module" || document.kind === "json-schema";
const isEssential = (
    document: AgentDocument,
    essentials: ReadonlyArray<string>
): boolean =>
    essentials.some(
        (value: string) =>
            value === document.id ||
            value === document.id.replace(/^article:[^:]+:/u, "")
    );
const skillMarkdown = (
    config: DocsConfig,
    documents: ReadonlyArray<AgentDocument>,
    siteUrl: string
): string =>
{
    const essentials = documents.filter(
        (document: {
            readonly id: string;
            readonly kind: "article" | "api-module" | "json-schema" | "component";
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
        }) =>
            document.kind === "article" &&
            isEssential(document, config.agent.essentials)
    );
    const apiModules = documents.filter(isApiModule);
    const name = config.agent.skill.name;
    const description =
        config.agent.description ?? "Product documentation skill.";
    const lines = [
        "---",
        `name: ${name}`,
        `description: ${description.replace(/[\r\n]+/gu, " ")}`,
        "---",
        "",
        `# ${config.metadata.title}`,
        "",
        description,
        "",
        "Use this skill to answer questions about the documented product. Prefer the " +
            "references below over assumptions, and follow canonical links when more context is needed.",
        "",
        "## Essentials",
        ""
    ];
    if (essentials.length === 0)
    {
        lines.push("No curated essentials were configured.");
    }
    else
    {
        for (const document of essentials)
        {
            lines.push(
                `- [${document.title}](references/${referenceName(document)}) — ` +
                    `${document.description ?? "Product documentation article."}`
            );
        }
    }
    lines.push("", "## API modules", "");
    if (apiModules.length === 0)
    {
        lines.push("No API modules were generated.");
    }
    else
    {
        for (const document of apiModules)
        {
            lines.push(
                `- [${document.title}](references/${referenceName(document)}) — ` +
                    `${document.context ?? "API reference module."}`
            );
        }
    }
    lines.push(
        "",
        "## Live indexes",
        "",
        `- [Documentation index](${siteUrl}${config.routing.documentationPrefix}/llms.txt)`,
        `- [Agent manifest](${siteUrl}${config.routing.documentationPrefix}/agent/manifest.json)`,
        ...(config.agent.mcp.enabled
            ? [ `- [MCP endpoint](${config.mcpEndpoint})` ]
            : [])
    );
    return `${lines.join("\n")}\n`;
};
const selectedDocuments = (
    config: DocsConfig,
    corpus: AgentCorpus,
    packageId: string | undefined
): ReadonlyArray<AgentDocument> =>
{
    const documents = currentDocuments(config, corpus);
    const selected =
        packageId === undefined
            ? documents
            : documents.filter(
                (document: {
                    readonly id: string;
                    readonly kind: "article" | "api-module" | "json-schema" | "component";
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
                }) => document.id.startsWith(`${packageId}:`)
            );
    const essentialRank = new Map(
        config.agent.essentials.map((value: string, index: number) => [
            value,
            index
        ])
    );
    return [ ...selected ].sort(
        (
            left: {
                readonly id: string;
                readonly kind: "article" | "api-module" | "json-schema" | "component";
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
                readonly kind: "article" | "api-module" | "json-schema" | "component";
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
        {
            const leftRank =
                essentialRank.get(left.id.replace(/^article:[^:]+:/u, "")) ??
                Number.MAX_SAFE_INTEGER;
            const rightRank =
                essentialRank.get(right.id.replace(/^article:[^:]+:/u, "")) ??
                Number.MAX_SAFE_INTEGER;
            return (
                leftRank - rightRank ||
                left.kind.localeCompare(right.kind) ||
                left.title.localeCompare(right.title)
            );
        }
    );
};
const writeSkillDirectory = (
    fileSystem: typeof DocsFileSystem.Service,
    path: typeof DocsPath.Service,
    writer: typeof AtomicWriter.Service,
    outputDirectory: string,
    config: DocsConfig,
    documents: ReadonlyArray<AgentDocument>,
    siteUrl: string
): Effect.Effect<void, unknown> =>
    Effect.gen(function* ()
    {
        yield* fileSystem.makeDirectory(
            path.join(outputDirectory, "references")
        );
        yield* fileSystem.makeDirectory(path.join(outputDirectory, "agents"));
        const readMe = skillMarkdown(config, documents, siteUrl);
        if (readMe.length > 8000)
        {
            return yield* Effect.fail(
                new ProductSkillError(
                    path.join(outputDirectory, "SKILL.md"),
                    "SKILL.md exceeds " +
                        "the " +
                        "8000 " +
                        "character " +
                        "skill " +
                        "budget"
                )
            );
        }
        if (
            /\b(?:TODO|TBD|FIXME)\b|\{\{[^}]+\}\}|<PLACEHOLDER>/iu.test(readMe)
        )
        {
            return yield* Effect.fail(
                new ProductSkillError(
                    path.join(outputDirectory, "SKILL.md"),
                    "SKILL.md contains " +
                        "an " +
                        "unfinished " +
                        "placeholder"
                )
            );
        }
        yield* writer.writeText(path.join(outputDirectory, "SKILL.md"), readMe);
        yield* writer.writeText(
            path.join(outputDirectory, "agents", "openai.yaml"),
            [
                `name: ${config.agent.skill.name}`,
                `description: ${config.agent.description ?? "Product documentation skill."}`,
                "invocation:",
                "  keywords: [product documentation, API reference]",
                ""
            ].join("\n")
        );
        for (const document of documents.filter(
            (value: {
                readonly id: string;
                readonly kind: "article" | "api-module" | "json-schema" | "component";
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
            }) =>
                (value.kind === "article" &&
                    isEssential(value, config.agent.essentials)) ||
                isApiModule(value)
        ))
        {
            yield* writer.writeText(
                path.join(
                    outputDirectory,
                    "references",
                    referenceName(document)
                ),
                formatAgentDocument(document)
            );
        }
    });
export/** @internal */
const buildProductSkill = (
    options: ProductSkillOptions
): Effect.Effect<
    ProductSkillResult,
    unknown,
    DocsFileSystem | DocsPath | AtomicWriter | ArchiveService
> =>
    Effect.gen(function* ()
    {
        const fileSystem = yield* DocsFileSystem;
        const path = yield* DocsPath;
        const writer = yield* AtomicWriter;
        const archive = yield* ArchiveService;
        const documents = selectedDocuments(
            options.config,
            options.corpus,
            options.packageId
        );
        const siteUrl = options.siteUrl ?? options.config.metadata.url;
        yield* writeSkillDirectory(
            fileSystem,
            path,
            writer,
            options.outputDirectory,
            options.config,
            documents,
            siteUrl
        );
        const files = [
            "SKILL.md",
            "agents/openai.yaml",
            ...documents
                .filter(
                    (value: {
                        readonly id: string;
                        readonly kind: "article" | "api-module" | "json-schema" | "component";
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
                    }) =>
                        (value.kind === "article" &&
                            isEssential(
                                value,
                                options.config.agent.essentials
                            )) ||
                        isApiModule(value)
                )
                .map(referenceName)
        ].sort();
        const checksummed = [];
        for (const file of files)
        {
            checksummed.push(
                `${file}\0${yield* fileSystem.readText(path.join(options.outputDirectory, file))}`
            );
        }
        const checksum = checksumText(checksummed.join("\0"));
        yield* writer.writeText(
            path.join(
                options.outputDirectory,
                ".sorrell-product-skill.json" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    "" +
                    ""
            ),
            `${JSON.stringify({ checksum, name: options.config.agent.skill.name, version: 1 }, null, 2)}\n`
        );
        const archivePath = `${options.outputDirectory}.zip`;
        yield* archive.createZip(options.outputDirectory, archivePath);
        return {
            artifact: {
                archive: archivePath,
                checksum,
                directory: options.outputDirectory,
                name: options.config.agent.skill.name
            },
            documents
        };
    });
export/** @internal */
const buildPackageProductSkill = (
    target: string,
    packageId: string,
    outputDirectory: string
): Effect.Effect<ProductSkillResult, unknown> =>
    Effect.gen(function* ()
    {
        const fileSystem = yield* DocsFileSystem;
        const path = yield* DocsPath;
        const config = decodeDocsConfigSync(
            JSON.parse(
                yield* fileSystem.readText(
                    path.join(target, "docs.config.json")
                )
            )
        );
        const manifest = Schema.decodeUnknownSync(AgentManifestSchema)(
            JSON.parse(
                yield* fileSystem.readText(
                    path.join(
                        target,
                        "Documentation",
                        "dist",
                        "agent",
                        "manifest.json"
                    )
                )
            )
        );
        const corpus = Schema.decodeUnknownSync(AgentCorpusSchema)(
            JSON.parse(
                yield* fileSystem.readText(
                    path.join(
                        target,
                        "Documentation",
                        "dist",
                        "agent",
                        "corpus",
                        "current.json"
                    )
                )
            )
        );
        return yield* buildProductSkill({
            config,
            corpus,
            manifest,
            outputDirectory,
            packageId,
            siteUrl: config.metadata.url
        });
    }).pipe(
        Effect.provide(
            Layer.mergeAll(
                DocsFileSystem.layer,
                DocsPath.layer,
                AtomicWriter.layer,
                ArchiveService.layer
            )
        )
    );
