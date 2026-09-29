/**
 *
 *
 * @module @sorrell/docs-api-reference/Test/Serialization.test
 *
 * @file      Serialization.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    createApiDataset,
    jsonSchemaToAgentDocument,
    jsonSchemaReferenceToView,
    recordToAgentDocument,
    recordToLlmDocument,
    validateApiDataset
} from "../Source/Serialization.js";
import { describe, expect, it } from "vitest";
import type { ApiReferenceRecord } from "@sorrell/docs-core";
const record: ApiReferenceRecord = {
    breadcrumbs: [
        { current: false, label: "API Reference" },
        { current: true, label: "fixture" }
    ],
    categories: [
        { collapsed: false, id: "functions", label: "Functions", order: 0 }
    ],
    declarations: [
        {
            categoryId: "functions",
            description: "Says hello.",
            id: "hello",
            kind: "function",
            name: "hello",
            signature: "declare function hello(): string"
        }
    ],
    displayName: "fixture",
    exportCount: 1,
    module: "fixture",
    packageId: "fixture",
    packageName: "@sorrell/fixture",
    summary: "A fixture API.",
    version: "1.0.1"
};
describe("API-reference serialization", () =>
{
    it("creates a deterministic, validated dataset", () =>
    {
        const dataset = createApiDataset([ record ], {
            generatedAt: "2026-09-24T00:00:00.000Z",
            sourceRevision: "Master"
        });
        expect(validateApiDataset(dataset).valid).toBe(true);
        expect(dataset.checksum).toHaveLength(64);
        expect(
            createApiDataset([ record ], {
                generatedAt: dataset.generatedAt,
                sourceRevision: dataset.sourceRevision
            }).checksum
        ).toBe(dataset.checksum);
    });
    it("creates an LLM document from a reference record", () =>
    {
        const document = recordToLlmDocument(record);
        expect(document.title).toBe("fixture");
        expect(document.content).toContain("declare function hello(): string");
    });
    it("keeps legacy snapshots readable and includes configured schema references in new snapshots", () =>
    {
        const oldSnapshot = createApiDataset([ record ], {
            generatedAt: "2026-09-24T00:00:00.000Z",
            sourceRevision: "Master"
        });
        expect("jsonSchemas" in oldSnapshot).toBe(false);
        expect(validateApiDataset(oldSnapshot).valid).toBe(true);
        const schemaRecord = {
            definitions: [ { name: "Shared", schema: { type: "string" } } ],
            description: "Schema docs.",
            path: "schema.json",
            route: "/docs/schema/",
            schema: { $schema: "https://json-schema.org/draft/2020-12/schema", $defs: { Shared: { type: "string" } } },
            title: "Settings"
        };
        const dataset = createApiDataset([], {
            generatedAt: "2026-09-24T00:00:00.000Z",
            jsonSchemas: [ schemaRecord ]
        });
        expect(validateApiDataset(dataset).valid).toBe(true);
        const document = jsonSchemaToAgentDocument(schemaRecord);
        expect(document.kind).toBe("json-schema");
        expect(document.url).toBe("/docs/schema/");
        expect(document.content).toContain("\"$schema\"");
        const view = jsonSchemaReferenceToView({
            ...schemaRecord,
            schema: {
                $schema: "https://json-schema.org/draft/2020-12/schema",
                $defs: { Shared: { type: "string" } },
                properties: {
                    active: true,
                    enabled: false,
                    external: { $ref: "https://example.test/schema.json" },
                    internal: { $ref: "#/$defs/Shared" },
                    name: { maxLength: 20, type: "string" }
                },
                required: [ "name" ]
            }
        });
        expect(view.properties).toContainEqual(expect.objectContaining({ name: "name", required: true, type: "string", constraints: [ { name: "maxLength", value: 20 } ] }));
        expect(view.properties).toContainEqual(expect.objectContaining({ name: "enabled", type: "false", required: false }));
        expect(view.properties).toContainEqual(expect.objectContaining({ name: "active", type: "true", required: false }));
        expect(view.properties.find((property) => property.name === "internal")?.reference).toEqual({ href: "#definition-Shared", uri: "#/$defs/Shared" });
        expect(view.properties.find((property) => property.name === "external")?.reference?.href).toBe("https://example.test/schema.json");
        const definitionsView = jsonSchemaReferenceToView({
            ...schemaRecord,
            definitions: [ { name: "Shared", schema: { properties: { id: { format: "uuid", type: "string" } }, required: [ "id" ] } } ],
            schema: { $defs: { Shared: { properties: { id: { format: "uuid", type: "string" } }, required: [ "id" ] } } }
        });
        expect(definitionsView.definitions[0]?.properties).toContainEqual(expect.objectContaining({ name: "id", required: true, constraints: [ { name: "format", value: "uuid" } ] }));
        expect(view.definitions[0]?.name).toBe("Shared");
        expect(view.formattedJson).toContain("\"$ref\"");
    });
    it("includes declaration kind and introduction metadata in the agent document", () =>
    {
        const introductionVersion = "1.0.1";
        const document = recordToAgentDocument({
            ...record,
            introductionVersion
        });
        expect(document.kind).toBe("api-module");
        expect(document.content).toContain("Kind: function");
        expect(document.content).toContain(`Added in ${introductionVersion}`);
    });
});
