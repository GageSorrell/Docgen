/**
 * Loads the checked-in Astro landing templates and applies site configuration.
 *
 * @module @sorrell/docs-create-website/LandingTemplate
 *
 * @file      LandingTemplate.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { DocsConfig } from "@sorrell/docs-core";
import type { GeneratedWebsiteFile } from "./Types.js";

const templateRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "../Templates/Landing"
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
        }
        );

const replace = (
    content: string,
    values: Readonly<Record<string, string>>
): string =>
    Object.entries(values).reduce(
        (result, [ key, value ]: [string, string]) =>
            result.replaceAll(`{{${key}}}`, value),
        content
    );

const resolveAstroImports = (path: string, content: string): string =>
    content
        .replace(
            /((?:from\s+|import\s+)(["']))@\/([^"']+)\2/gu,
            (_match, prefix: string, quote: string, target: string) =>
            {
                const resolved = relative(
                    dirname(path),
                    "Source/" + (extname(target) ? target : target + ".js")
                ).split(sep).join("/");
                return prefix + (resolved.startsWith(".") ? resolved : "./" + resolved) + quote;
            }
        )
        .replace(
            /import\s+\{\s*([^}]+)\s*\}\s+from\s+(["'])@lucide\/astro\2/gu,
            (_match, imports: string) => imports
                .split(",")
                .map((name: string) => name.trim())
                .filter(Boolean)
                .map((name: string) =>
                    "import " + name + " from \"@lucide/astro/icons/" +
                    name.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase() + "\""
                )
                .join("\n")
        );

export const landingTemplateFiles = (
    config: DocsConfig
): ReadonlyArray<GeneratedWebsiteFile> =>
{
    const docsPrefix = config.routing.documentationPrefix;
    const storyPrefix = config.routing.storybookPrefix;
    const repositoryHref = config.metadata.repository?.url ?? "";
    const tokens = config.tokens;
    return readTemplates(templateRoot).map((template) =>
    {
        const outputPath = template.path.endsWith(".template")
            ? template.path.slice(0, -".template".length)
            : template.path;
        let content = outputPath.endsWith(".astro")
            ? resolveAstroImports(outputPath, template.content)
            : template.content;
        if (outputPath === "Source/pages/index.astro")
        {
            content = content
                .replaceAll(
                    "@react-native-notion-markdown/documentation",
                    `${config.metadata.name}/documentation`
                )
                .replaceAll(
                    "name: \"react-native-notion-markdown\",",
                    `name: ${JSON.stringify(config.metadata.name)},`
                )
                .replaceAll(
                    "primaryCta: { label: \"Read the docs\", href: \"/docs/v1/onboarding/introduction\" },",
                    `primaryCta: ${JSON.stringify(config.landing.primaryAction ?? { href: `${docsPrefix}/`, label: "Read the docs" })},`
                )
                .replaceAll("react-native-notion-markdown", config.metadata.name)
                .replaceAll(
                    "Bring structured Markdown-flavored content to every React Native surface.",
                    config.landing.title
                )
                .replaceAll(
                    "Parse, render, edit, and serialize Markdown-formatted content with a typed document model designed for React Native applications.",
                    config.landing.description
                )
                .replace(/"\/docs([^"]*)"/g, (_match, suffix: string) =>
                    JSON.stringify(`${docsPrefix}${suffix || "/"}`)
                )
                .replaceAll(
                    "https://github.com/GageSorrell/ReactNativeNotionMarkdown",
                    repositoryHref
                );
            if (config.storybook.enabled)
            {
                content = content.replace(
                    "navItems: [",
                    `navItems: [{ label: "Storybook", href: ${JSON.stringify(`${storyPrefix}/`)} },`
                );
            }
        }
        if (outputPath === "Source/components/Footer.astro")
        {
            content = content.replaceAll(
                "react-native-notion-markdown",
                config.metadata.name
            ).replaceAll(
                "https://github.com/GageSorrell/ReactNativeNotionMarkdown",
                repositoryHref
            );
        }
        return {
            path: `Landing/${outputPath}`,
            content: replace(content, {
                DARK_ACCENT: tokens.dark.accent,
                DARK_BACKGROUND: tokens.dark.background,
                DARK_BORDER: tokens.dark.border,
                DARK_CARD_BACKGROUND: tokens.dark.cardBackground ?? tokens.dark.codeBackground,
                DARK_CODE_BACKGROUND: tokens.dark.codeBackground,
                DARK_FOREGROUND: tokens.dark.foreground,
                DARK_MUTED: tokens.dark.muted,
                DOCUMENTATION_PREFIX: JSON.stringify(docsPrefix),
                LIGHT_ACCENT: tokens.light.accent,
                LIGHT_BACKGROUND: tokens.light.background,
                LIGHT_BORDER: tokens.light.border,
                LIGHT_CARD_BACKGROUND: tokens.light.cardBackground ?? tokens.light.codeBackground,
                LIGHT_CODE_BACKGROUND: tokens.light.codeBackground,
                LIGHT_FOREGROUND: tokens.light.foreground,
                LIGHT_MUTED: tokens.light.muted,
                LOGO: JSON.stringify(config.metadata.logo ?? ""),
                SITE_NAME: JSON.stringify(config.metadata.name),
                STORYBOOK_PREFIX: JSON.stringify(storyPrefix),
                TOKENS: JSON.stringify(tokens, null, 2)
            })
        };
    });
};
