/**
 * Deterministic serialization, checksums, and dataset validation.
 *
 * @module @sorrell/docs-api-reference/Serialization
 *
 * @file      Serialization.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type {
    ApiReferenceAgentDocument,
    ApiReferenceDataset,
    ApiReferenceLlmDocument,
    ApiReferenceValidationResult,
    JsonSchemaReferenceRecord,
    JsonSchemaReferenceView
} from "./Types.js";
import type { ApiReferenceRecord } from "@sorrell/docs-core";
import { ApiReferenceValidationError } from "./Errors.js";
import { apiReferenceRecordToAgentDocument } from "@sorrell/docs-core";
import { createHash } from "node:crypto";
const sortValue = (value: unknown): unknown =>
{
    if (Array.isArray(value))
    {
        return value.map(sortValue);
    }
    if (value !== null && typeof value === "object")
    {
        return Object.fromEntries(
            Object.entries(value)
                .sort(
                    (
                        [ left ]: readonly [string, unknown],
                        [ right ]: readonly [string, unknown]
                    ) => left.localeCompare(right)
                )
                .map(([ key, entry ]: readonly [string, unknown]) => [
                    key,
                    sortValue(entry)
                ])
        );
    }
    return value;
};
export/** @internal */
const stableStringify = (value: unknown): string =>
    JSON.stringify(sortValue(value));
export/** @internal */
const checksumValue = (value: unknown): string =>
    createHash("sha256").update(stableStringify(value)).digest("hex");
const recordKey = (record: ApiReferenceRecord): string =>
    `${record.packageId}:${record.module}`;
export/** @internal */
const validateApiRecords = (
    records: ReadonlyArray<ApiReferenceRecord>
): ApiReferenceValidationResult =>
{
    const errors: Array<string> = [];
    const recordKeys = new Set<string>();
    for (const record of records)
    {
        const key = recordKey(record);
        if (recordKeys.has(key))
        {
            errors.push(`duplicate record ${key}`);
        }
        recordKeys.add(key);
        if (record.exportCount !== record.declarations.length)
        {
            errors.push(`${key} exportCount does not match declarations`);
        }
        const declarationIds = new Set<string>();
        for (const declaration of record.declarations)
        {
            if (declarationIds.has(declaration.id))
            {
                errors.push(
                    `${key} has duplicate declaration ${declaration.id}`
                );
            }
            declarationIds.add(declaration.id);
            if (!/^[A-Za-z0-9_$.-]+$/.test(declaration.id))
            {
                errors.push(
                    `${key} has unsafe declaration id ${declaration.id}`
                );
            }
            if (declaration.signature.trim() === "")
            {
                errors.push(`${key}/${declaration.id} has an empty signature`);
            }
        }
    }
    return {
        errors,
        valid: errors.length === 0
    };
};
export/** @internal */
const validateApiDataset = (
    dataset: ApiReferenceDataset
): ApiReferenceValidationResult =>
{
    const recordsResult = validateApiRecords(dataset.records);
    const checksumPayload = {
        records: dataset.records,
        sourceRevision: dataset.sourceRevision
    };
    const expected = checksumValue(dataset.jsonSchemas === undefined
        ? checksumPayload
        : { ...checksumPayload, jsonSchemas: dataset.jsonSchemas });
    const errors = [
        ...recordsResult.errors,
        ...(dataset.checksum === expected
            ? []
            : [ "checksum does not match dataset contents" ])
    ];
    const schemaRoutes = new Set<string>();
    for (const schema of dataset.jsonSchemas ?? [])
    {
        const routeKey = schema.route.replace(/\/+$/u, "") || "/docs";
        if (!schema.route.startsWith("/docs") || (schema.route !== "/docs" && !schema.route.startsWith("/docs/")))
        {
            errors.push(`JSON Schema route ${schema.route} must start with /docs`);
        }
        if (schemaRoutes.has(routeKey))
        {
            errors.push(`duplicate JSON Schema route ${schema.route}`);
        }
        schemaRoutes.add(routeKey);
        if (dataset.records.some((record) => record.link?.href.replace(/\/+$/u, "") === routeKey))
        {
            errors.push(`JSON Schema route ${schema.route} collides with a TypeScript API reference route`);
        }
    }
    return {
        errors,
        valid: errors.length === 0
    };
};
export/** @internal */
const assertValidApiDataset = (
    dataset: ApiReferenceDataset
): ApiReferenceDataset =>
{
    const result = validateApiDataset(dataset);
    if (!result.valid)
    {
        throw new ApiReferenceValidationError(result.errors);
    }
    return dataset;
};
export/** @internal */
const createApiDataset = (
    records: ReadonlyArray<ApiReferenceRecord>,
    options: Pick<ApiReferenceDataset, "generatedAt" | "sourceRevision"> & { readonly jsonSchemas?: ReadonlyArray<JsonSchemaReferenceRecord> }
): ApiReferenceDataset => ({
    checksum: checksumValue({
        records,
        sourceRevision: options.sourceRevision,
        ...(options.jsonSchemas === undefined ? {} : { jsonSchemas: options.jsonSchemas })
    }),
    generatedAt: options.generatedAt,
    version: 1,
    ...(options.sourceRevision === undefined
        ? {}
        : { sourceRevision: options.sourceRevision }),
    records,
    ...(options.jsonSchemas === undefined ? {} : { jsonSchemas: options.jsonSchemas })
});
export/** @internal */
const jsonSchemaToAgentDocument = (record: JsonSchemaReferenceRecord): ApiReferenceAgentDocument => ({
    content: `# ${record.title}\n\n${record.description ?? "JSON Schema reference."}\n\nSource: ${record.sourceUrl ?? record.path}\n\n\`\`\`json\n${JSON.stringify(record.schema, null, 2)}\n\`\`\``,
    ...(record.description === undefined ? {} : { description: record.description }),
    id: `json-schema:${record.route}`,
    kind: "json-schema",
    metadata: { path: record.path, route: record.route },
    title: record.title,
    url: record.route
});
export/** @internal */
const jsonSchemaReferenceToView = (record: JsonSchemaReferenceRecord): JsonSchemaReferenceView =>
{
    const objectSchema = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const definitionHref = (uri: string): string | undefined => {
        if (!uri.startsWith("#/$defs/")) {return undefined;}
        const pointerName = uri.slice("#/$defs/".length).split("/")[0] ?? "";
        let name: string;
        try { name = decodeURIComponent(pointerName); } catch { name = pointerName; }
        name = name.replace(/~1/gu, "/").replace(/~0/gu, "~");
        return `#definition-${encodeURIComponent(name)}`;
    };
    const schema = objectSchema(record.schema);
    const propertiesFor = (value: unknown) => {
        const object = objectSchema(value);
        const required = new Set(Array.isArray(object.required) ? object.required.filter((entry): entry is string => typeof entry === "string") : []);
        return Object.entries(objectSchema(object.properties)).map(([ name, propertyValue ]) => {
            const property = objectSchema(propertyValue);
            const reference = typeof property.$ref === "string"
                ? { href: definitionHref(property.$ref) ?? property.$ref, uri: property.$ref }
                : undefined;
            return {
                constraints: Object.entries(property)
                    .filter(([ key ]) => ![ "type", "description", "title", "$ref", "properties", "required", "$defs" ].includes(key))
                    .map(([ constraintName, constraintValue ]) => ({ name: constraintName, value: constraintValue })),
                ...(typeof property.description === "string" ? { description: property.description } : {}),
                ...(reference === undefined ? {} : { reference }),
                name,
                required: required.has(name),
                type: typeof property.type === "string" ? property.type : typeof propertyValue === "boolean" ? String(propertyValue) : "schema"
            };
        });
    };
    const definitions = record.definitions.map((definition) => ({
        ...definition,
        properties: propertiesFor(definition.schema)
    }));
    const constraints = Object.entries(schema)
        .filter(([ key ]) => ![ "$schema", "$id", "$defs", "type", "title", "description", "properties", "required" ].includes(key))
        .map(([ name, value ]) => ({ name, value }));
    return {
        ...(record.description === undefined ? {} : { description: record.description }),
        definitions,
        formattedJson: JSON.stringify(record.schema, null, 2),
        properties: propertiesFor(record.schema),
        constraints,
        title: record.title
    };
};
export/** @internal */
const recordToAgentDocument = (
    record: ApiReferenceRecord
): ApiReferenceAgentDocument => apiReferenceRecordToAgentDocument(record);
export/** @internal */
const recordToLlmDocument = (
    record: ApiReferenceRecord
): ApiReferenceLlmDocument => recordToAgentDocument(record);
