/**
 * Loads the generated Astro documentation typography templates.
 *
 * @module @sorrell/docs-create-website/DocumentationTemplate
 *
 * @file      DocumentationTemplate.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { DocsConfig } from "@sorrell/docs-core";
import type { GeneratedWebsiteFile } from "./Types.js";

const templateRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "../Templates/Documentation"
);

const readTemplates = (directory: string): ReadonlyArray<GeneratedWebsiteFile> =>
    readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name))
        .flatMap((entry) =>
        {
            const path = join(directory, entry.name);
            return entry.isDirectory()
                ? readTemplates(path)
                : [ {
                    path: relative(templateRoot, path)
                        .split(sep)
                        .join("/")
                        .replace(/^Astro\//u, "Source/"),
                    content: readFileSync(path, "utf8")
                } ];
        });

const replace = (
    content: string,
    values: Readonly<Record<string, string>>
): string =>
    Object.entries(values).reduce(
        (result, [ key, value ]: [string, string]) =>
            result.replaceAll(`{{${key}}}`, value),
        content
    );

export const documentationTemplateFiles = (
    config: DocsConfig
): ReadonlyArray<GeneratedWebsiteFile> =>
{
    const versions = config.versions.map((version) => {
        const versionNumber = version.version
            ?? (version.current ? "1" : version.id.replace(/^v/u, ""));
        return {
            current: version.current,
            id: version.id,
            label: version.current
                ? `v${versionNumber} (Latest)`
                : version.label ?? `v${versionNumber}`,
            version: versionNumber
        };
    });
    const templates = readTemplates(templateRoot).filter((template) =>
        config.api.enabled || !template.path.startsWith("Source/pages/api/")
    );
    const files = templates.map((template) => ({
        path: `Documentation/${template.path}`,
        content: replace(template.content, {
            DARK_ACCENT: config.tokens.dark.accent,
            DARK_BACKGROUND: config.tokens.dark.background,
            DARK_BORDER: config.tokens.dark.border,
            DARK_CARD_BACKGROUND: config.tokens.dark.cardBackground ?? config.tokens.dark.codeBackground,
            DARK_CODE_BACKGROUND: config.tokens.dark.codeBackground,
            DARK_FOREGROUND: config.tokens.dark.foreground,
            DARK_MUTED: config.tokens.dark.muted,
            DARK_PROSE_FOREGROUND: config.tokens.dark.proseForeground ?? config.tokens.dark.foreground,
            DARK_SUBTLE_FOREGROUND: config.tokens.dark.subtleForeground ?? config.tokens.dark.muted,
            DESCRIPTION: JSON.stringify(config.metadata.description),
            DOCS_PREFIX: config.routing.documentationPrefix,
            LIGHT_ACCENT: config.tokens.light.accent,
            LIGHT_BACKGROUND: config.tokens.light.background,
            LIGHT_BORDER: config.tokens.light.border,
            LIGHT_CARD_BACKGROUND: config.tokens.light.cardBackground ?? config.tokens.light.codeBackground,
            LIGHT_CODE_BACKGROUND: config.tokens.light.codeBackground,
            LIGHT_FOREGROUND: config.tokens.light.foreground,
            LIGHT_MUTED: config.tokens.light.muted,
            LIGHT_PROSE_FOREGROUND: config.tokens.light.proseForeground ?? config.tokens.light.foreground,
            LIGHT_SUBTLE_FOREGROUND: config.tokens.light.subtleForeground ?? config.tokens.light.muted,
            REPOSITORY_URL: JSON.stringify(config.metadata.repository?.url ?? ""),
            SITE_NAME: JSON.stringify(config.metadata.name || config.metadata.title),
            STORYBOOK_PREFIX: JSON.stringify(config.storybook.enabled ? config.routing.storybookPrefix : ""),
            TITLE: JSON.stringify(config.metadata.title),
            VERSIONS_ESCAPED: JSON.stringify(JSON.stringify(versions)).slice(1, -1)
        })
    }));
    return config.api.enabled
        ? [
            ...files,
            {
                path: "Documentation/Source/data/ApiReference.json",
                content: `${JSON.stringify({
                    checksum: "",
                    generatedAt: "1970-01-01T00:00:00.000Z",
                    records: [],
                    version: 1
                }, null, 2)}\n`
            }
        ]
        : files;
};
