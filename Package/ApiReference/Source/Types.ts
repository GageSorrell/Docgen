/**
 * Public models for the API-reference generation pipeline.
 *
 * @module @sorrell/docs-api-reference/Types
 *
 * @file      Types.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type { AgentDocument, ApiReferenceRecord } from "@sorrell/docs-core";

/** @internal */
export interface ApiReferencePackageInput {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly entryPoints: ReadonlyArray<string>;
    readonly tsconfig?: string;
}
/** @internal */
export interface ApiReferenceGenerationOptions {
    readonly packages: ReadonlyArray<ApiReferencePackageInput>;
    readonly jsonSchemas?: ReadonlyArray<JsonSchemaReferenceInput>;
    readonly repositoryRoot?: string;
    readonly repositoryUrl?: string;
    readonly revision?: string;
    readonly sourceRoot?: string;
    readonly referencePrefix?: string;
    readonly generatedAt?: string;
    readonly typedoc?: Readonly<Record<string, unknown>>;
}
/** @internal */
export interface JsonSchemaReferenceInput {
    readonly path: string;
    readonly route: string;
}
/** @internal */
export interface JsonSchemaReferenceRecord {
    readonly path: string;
    readonly route: string;
    readonly title: string;
    readonly description?: string;
    readonly schema: unknown;
    readonly definitions: ReadonlyArray<{ readonly name: string; readonly schema: unknown }>;
    readonly sourceUrl?: string;
}
/** @internal */
export interface JsonSchemaReferenceProperty {
    readonly name: string;
    readonly required: boolean;
    readonly type: string;
    readonly description?: string;
    readonly reference?: { readonly uri: string; readonly href: string };
    readonly constraints: ReadonlyArray<{ readonly name: string; readonly value: unknown }>;
}
/** @internal */
export interface JsonSchemaReferenceView {
    readonly title: string;
    readonly description?: string;
    readonly properties: ReadonlyArray<JsonSchemaReferenceProperty>;
    readonly definitions: ReadonlyArray<{
        readonly name: string;
        readonly schema: unknown;
        readonly properties: ReadonlyArray<JsonSchemaReferenceProperty>;
    }>;
    readonly constraints: ReadonlyArray<{ readonly name: string; readonly value: unknown }>;
    readonly formattedJson: string;
}
/** @internal */
export interface ApiReferenceDataset {
    readonly version: 1;
    readonly generatedAt: string;
    readonly checksum: string;
    readonly sourceRevision?: string;
    readonly records: ReadonlyArray<ApiReferenceRecord>;
    readonly jsonSchemas?: ReadonlyArray<JsonSchemaReferenceRecord>;
}
/** @internal */
export type ApiReferenceAgentDocument = AgentDocument;
/** @internal */
export type ApiReferenceLlmDocument = ApiReferenceAgentDocument;
/** @internal */
export interface ApiReferenceValidationResult {
    readonly valid: boolean;
    readonly errors: ReadonlyArray<string>;
}
