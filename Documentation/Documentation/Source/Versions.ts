/**
 * Version navigation for the initial dogfood documentation site.
 *
 * @module @sorrell/documentation/Versions
 *
 * @file      Versions.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import config from "../../docs.config.json";

const configuredVersions = config.versions ?? [];
const latestVersion = configuredVersions.find((version) => version.current)?.version ?? "1.0.1";

export const documentationVersions = configuredVersions.map((version) => ({
    id: version.id,
    label: version.label ?? version.id,
    version: version.version ?? (version.id === "current" ? latestVersion : version.id.replace(/^v/u, ""))
}));

export type DocumentationVersion = typeof documentationVersions[number]["id"];
