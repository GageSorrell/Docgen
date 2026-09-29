/**
 *
 *
 * @module @sorrell/docs-mcp/Test/Server.test
 *
 * @file      Server.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { buildSearchIndex, findDocument, searchDocuments } from "../Source/index.js";
import { describe, expect, it } from "vitest";
import type { AgentCorpus } from "@sorrell/docs-core";
import { Effect } from "effect";
const corpus: AgentCorpus = {
    checksum: "corpus-checksum",
    documents: [
        {
            content: "Install the package and start here.",
            id: "article:current:guide",
            kind: "article",
            title: "Getting Started",
            url: "https://example.test/docs/guide",
            version: "current"
        },
        {
            content: "Core API exports and models.",
            id: "api:current:core",
            kind: "api-module",
            title: "Core API",
            url: "https://example.test/docs/api/core",
            version: "current"
        },
        {
            content: "JSON Schema title: Site Configuration. Draft 2020-12 schema.",
            id: "json-schema:/docs/config-json-schema/",
            kind: "json-schema",
            title: "Site Configuration Schema",
            url: "https://example.test/docs/config-json-schema/"
        }
    ],
    generatedAt: "2026-09-24T00:00:00.000Z",
    version: 1
};
describe("documentation MCP index", () =>
{
    it("builds a deterministic lexical index and searches bounded results", () =>
    {
        const index = buildSearchIndex(corpus, corpus.checksum);
        expect(index.version).toBe(1);
        expect(index.entries).toHaveLength(3);
        expect(
            searchDocuments(corpus, "core API", "current", 1).map(
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
                }) => document.id
            )
        ).toEqual([ "api:current:core" ]);
        expect(searchDocuments(corpus, "missing")).toEqual([]);
        expect(searchDocuments(corpus, "Draft 2020-12").map((document) => document.kind)).toEqual([ "json-schema" ]);
        expect(Effect.runSync(findDocument(corpus, "json-schema:/docs/config-json-schema/", undefined, "api-module")).kind)
            .toBe("json-schema");
    });
});
