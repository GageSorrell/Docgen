/**
 *
 *
 * @module @sorrell/docs-create-website/Templates/Documentation/Astro/Versions
 *
 * @file      Versions.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

/**
 * Version labels emitted into a generated documentation site.
 *
 * @module @sorrell/docs-create-website/Templates/Documentation/Astro/Versions
 * @file Versions.ts
 */

interface DocumentationVersion {
    readonly current?: boolean | undefined;
    readonly id: string;
    readonly label: string;
    readonly version: string;
}

export const documentationVersions = JSON.parse("{{VERSIONS_ESCAPED}}") as ReadonlyArray<DocumentationVersion>;
