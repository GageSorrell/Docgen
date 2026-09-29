/**
 * MCP transport and tool definitions for documentation corpora.
 *
 * @module @sorrell/docs-mcp/Server
 *
 * @file      Server.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    type AgentCorpus,
    AgentCorpusSchema,
    type AgentDocument,
    AgentDocumentSchema,
    type AgentManifest,
    AgentManifestSchema,
    type AgentSearchIndex,
    AgentSearchIndexSchema
} from "@sorrell/docs-core";
import { Context, Effect, Layer, Schema } from "effect";
import {
    HttpRouter,
    HttpServer,
    HttpServerResponse
} from "effect/unstable/http";
import {
    McpProtocol,
    McpServer as McpServerModule,
    Tool,
    Toolkit
} from "effect/unstable/ai";

/** @internal */
export class McpCorpus extends Context.Service<
    McpCorpus,
    {
        readonly corpus: AgentCorpus;
        readonly manifest: AgentManifest;
        readonly index: AgentSearchIndex;
    }
>()("sorrell/docs-mcp/McpCorpus") { }

/** @internal */
export interface McpSource
{
    readonly corpus: AgentCorpus;
    readonly manifest: AgentManifest;
    readonly index: AgentSearchIndex;
}

const wordPattern = /[a-z0-9][a-z0-9_-]*/giu;

const termsFor = (document: AgentDocument): ReadonlyArray<string> =>
    [
        ...new Set(
            `${document.id} ${document.title} ${document.description ?? ""} ${document.content}`
                .toLocaleLowerCase()
                .match(wordPattern) ?? [ ]
        )
    ].sort();

export/** @internal */
const buildSearchIndex = (
    corpus: AgentCorpus,
    checksum: string
): AgentSearchIndex => ({
    checksum,
    entries: corpus.documents
        .map(
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
            }) => ({
                id: document.id,
                ...(document.version === undefined
                    ? {}
                    : { version: document.version }),
                terms: termsFor(document)
            })
        )
        .sort(
            (
                left: {
                    terms: ReadonlyArray<string>;
                    version?: string;
                    id: string;
                },
                right: {
                    terms: ReadonlyArray<string>;
                    version?: string;
                    id: string;
                }
            ) =>
                `${left.version ?? ""}:${left.id}`.localeCompare(
                    `${right.version ?? ""}:${right.id}`
                )
        ),
    version: 1
});

const score = (document: AgentDocument, query: string): number =>
{
    const terms = termsFor(document);
    return query
        .toLocaleLowerCase()
        .split(/\s+/u)
        .filter(Boolean)
        .reduce(
            (total: number, term: string) =>
                total +
                (terms.includes(term)
                    ? 3
                    : terms.some((value: string) => value.includes(term))
                        ? 1
                        : 0),
            0
        );
};

export/** @internal */
const searchDocuments = (
    corpus: AgentCorpus,
    query: string,
    version?: string,
    limit: number = 20
): ReadonlyArray<AgentDocument> =>
    corpus.documents
        .filter(
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
            }) => version === undefined || document.version === version
        )
        .map(
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
            }) => ({ document, score: score(document, query) })
        )
        .filter(
            (value: {
                document: {
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
                };
                score: number;
            }) => value.score > 0
        )
        .sort(
            (
                left: {
                    document: {
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
                    };
                    score: number;
                },
                right: {
                    document: {
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
                    };
                    score: number;
                }
            ) =>
                right.score - left.score ||
                left.document.title.localeCompare(right.document.title)
        )
        .slice(0, Math.max(1, Math.min(limit, 100)))
        .map(
            (value: {
                document: {
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
                };
                score: number;
            }) => value.document
        );
const SearchDocs = Tool.make("search_docs", {
    description: "Search the versioned documentation corpus.",
    parameters: Schema.Struct({
        limit: Schema.optional(Schema.Number),
        query: Schema.String,
        version: Schema.optional(Schema.String)
    }),
    success: Schema.Array(AgentDocumentSchema)
});
const GetDocument = Tool.make("get_document", {
    description:
        "Get one documentation article, API module, or component by id.",
    parameters: Schema.Struct({
        id: Schema.String,
        version: Schema.optional(Schema.String)
    }),
    success: AgentDocumentSchema
});
const GetApi = Tool.make("get_api", {
    description: "Get one TypeScript module or JSON Schema API reference by id.",
    parameters: Schema.Struct({
        id: Schema.String,
        version: Schema.optional(Schema.String)
    }),
    success: AgentDocumentSchema
});
const ListVersions = Tool.make("list_versions", {
    description: "List documentation versions.",
    success: Schema.Array(Schema.String)
});
const ListPackages = Tool.make("list_packages", {
    description:
        "List package ids represented in the current documentation corpus.",
    success: Schema.Array(Schema.String)
});
const ListComponents = Tool.make("list_components", {
    description: "List Storybook component documentation.",
    success: Schema.Array(AgentDocumentSchema)
});
export/** @internal */
const DocumentationToolkit = Toolkit.make(
    SearchDocs,
    GetDocument,
    GetApi,
    ListVersions,
    ListPackages,
    ListComponents
);
export/** @internal */
const findDocument = (
    corpus: AgentCorpus,
    id: string,
    version?: string,
    kind?: AgentDocument["kind"]
): Effect.Effect<AgentDocument, never> =>
{
    const value = corpus.documents.find(
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
            document.id === id &&
            (version === undefined || document.version === version) &&
            (kind === undefined || document.kind === kind || (kind === "api-module" && document.kind === "json-schema"))
    );
    return value === undefined
        ? Effect.die(`Documentation document not found: ${id}`)
        : Effect.succeed(value);
};
const toolkitLayer = Layer.effectContext(
    Effect.gen(function* ()
    {
        const source = yield* McpCorpus;
        return yield* DocumentationToolkit.toHandlers({
            get_api: ({
                id,
                version
            }: {
                readonly id: string;
                readonly version?: string | undefined;
            }) => findDocument(source.corpus, id, version, "api-module"),
            get_document: ({
                id,
                version
            }: {
                readonly id: string;
                readonly version?: string | undefined;
            }) => findDocument(source.corpus, id, version),
            list_components: () =>
                Effect.succeed(
                    source.corpus.documents.filter(
                        (document: AgentDocument) =>
                            document.kind === "component"
                    )
                ),
            list_packages: () =>
                Effect.succeed(
                    [
                        ...new Set(
                            source.corpus.documents.flatMap(
                                (document: AgentDocument) =>
                                    typeof document.metadata?.packageId ===
                                    "string"
                                        ? [ document.metadata.packageId ]
                                        : []
                            )
                        )
                    ].sort() as Array<string>
                ),
            list_versions: () => Effect.succeed(source.manifest.versions),
            search_docs: ({
                query,
                version,
                limit
            }: {
                readonly query: string;
                readonly version?: string | undefined;
                readonly limit?: number | undefined;
            }) =>
                Effect.succeed(
                    searchDocuments(source.corpus, query, version, limit)
                )
        });
    })
);
const resourceLayers = (corpus: AgentCorpus) =>
    corpus.documents.reduce(
        (
            layer: Layer.Layer<never, never, never>,
            document: {
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
            Layer.merge(
                layer,
                McpServerModule.resource({
                    content: Effect.succeed(document.content),
                    description: document.description,
                    mimeType: "text/markdown",
                    name: document.id,
                    uri: document.url
                })
            ),
        Layer.empty
    );
export/** @internal */
const makeMcpLayer = (
    source: McpSource,
    transport: "http" | "stdio",
    path: string = "/"
): Layer.Layer<any, unknown, any> =>
{
    const sourceLayer = Layer.succeed(McpCorpus, source);
    const serverOptions = {
        description: "Search and retrieve Sorrell documentation.",
        name: "sorrell-documentation",
        protocols: [ McpProtocol.v2025_06_18 ] as const,
        version: "1.0.1",
        ...(transport === "http" ? { path } : {})
    } as const;
    const transportLayer =
        transport === "http"
            ? McpServerModule.layerHttp({
                ...serverOptions,
                path: path as HttpRouter.PathInput
            })
            : McpServerModule.layerStdio(serverOptions);
    return Layer.mergeAll(
        transportLayer,
        McpServerModule.toolkit(DocumentationToolkit),
        resourceLayers(source.corpus)
    ).pipe(Layer.provide(toolkitLayer), Layer.provide(sourceLayer));
};
export/** @internal */
const createHttpHandler = (
    source: McpSource,
    path: string = "/"
) =>
{
    const health = HttpRouter.add("GET", "/health", () =>
        HttpServerResponse.json(
            {
                corpusChecksum: source.corpus.checksum,
                releaseId: source.manifest.generatedAt
            },
            { headers: { "cache-control": "no-store" }, status: 200 }
        )
    );
    const routes = Layer.mergeAll(makeMcpLayer(source, "http", path), health);
    return HttpRouter.toWebHandler(
        routes.pipe(Layer.provide(HttpServer.layerServices))
    );
};
export/** @internal */
const runStdio = (
    source: McpSource
): Effect.Effect<void, unknown, never> =>
    Layer.launch(makeMcpLayer(source, "stdio")) as unknown as Effect.Effect<
        void,
        unknown,
        never
    >;
export/** @internal */
const decodeMcpSource = (
    value: unknown
): McpSource => ({
    corpus: Schema.decodeUnknownSync(AgentCorpusSchema)(
        (
            value as {
                readonly corpus: unknown;
            }
        ).corpus
    ),
    index: Schema.decodeUnknownSync(AgentSearchIndexSchema)(
        (
            value as {
                readonly index: unknown;
            }
        ).index
    ),
    manifest: Schema.decodeUnknownSync(AgentManifestSchema)(
        (
            value as {
                readonly manifest: unknown;
            }
        ).manifest
    )
});
