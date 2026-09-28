/**
 * Shared agent-document model and deterministic Markdown formatting.
 *
 * @module @sorrell/docs-core/Agent
 *
 * @file      Agent.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type { AgentDocument, ApiReferenceRecord } from "./Schemas.js";

/** @internal */
export interface AgentMarkdownDiagnostic {
    readonly code: "unresolved-mdx-component" | "unsupported-html";
    readonly message: string;
    readonly line: number;
}
/** @internal */
export interface AgentMarkdownResult {
    readonly markdown: string;
    readonly diagnostics: ReadonlyArray<AgentMarkdownDiagnostic>;
}
const lineNumber = (value: string, offset: number): number =>
    value.slice(0, offset).split("\n").length;
const replaceInlinePrimitive = (value: string): string =>
    value
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
        .replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**")
        .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
        .replace(/<i>([\s\S]*?)<\/i>/gi, "*$1*")
        .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
        .replace(
            /<a\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
            "[$2]($1)"
        );
export/** @internal */
const normalizeAgentMarkdown = (
    value: string
): AgentMarkdownResult =>
{
    const diagnostics: Array<AgentMarkdownDiagnostic> = [];
    let markdown = value.replace(/^---[\s\S]*?---\s*/u, "");
    markdown = markdown.replace(/^\s*(?:import|export)\s.+$/gmu, "");
    markdown = replaceInlinePrimitive(markdown);
    const componentPattern = /<\/?([A-Z][A-Za-z0-9_.-]*)\b[^>]*\/?>/g;
    for (const match of markdown.matchAll(componentPattern))
    {
        const offset = match.index ?? 0;
        diagnostics.push({
            code: "unresolved-mdx-component",
            line: lineNumber(markdown, offset),
            message: `MDX component ${match[1] ?? "component"} has no Markdown equivalent`
        });
    }
    markdown = markdown.replace(componentPattern, "");
    const htmlPattern = /<\/?([a-z][A-Za-z0-9-]*)\b[^>]*\/?>/g;
    for (const match of markdown.matchAll(htmlPattern))
    {
        const tag = match[1] ?? "html";
        if (
            ![ "br", "strong", "b", "em", "i", "code", "a" ].includes(
                tag.toLowerCase()
            )
        )
        {
            diagnostics.push({
                code: "unsupported-html",
                line: lineNumber(markdown, match.index ?? 0),
                message: `HTML element <${tag}> has no Markdown equivalent`
            });
        }
    }
    markdown = markdown.replace(htmlPattern, "");
    return {
        diagnostics,
        markdown: markdown.replace(/\n{3,}/g, "\n\n").trim()
    };
};
export/** @internal */
const formatAgentDocument = (
    document: AgentDocument
): string =>
    [
        `# ${document.title}`,
        `Kind: ${document.kind}`,
        document.context === undefined
            ? undefined
            : `Context: ${document.context}`,
        document.version === undefined
            ? undefined
            : `Version: ${document.version}`,
        document.description === undefined
            ? undefined
            : `Description: ${document.description}`,
        `URL: ${document.url}`,
        document.source === undefined
            ? undefined
            : [
                `Source: ${document.source.repositoryUrl}/blob/${document.source.revision}/`,
                document.source.file,
                document.source.line === undefined
                    ? ""
                    : `#L${document.source.line}`
            ].join(""),
        "",
        document.content.trim()
    ]
        .filter(
            (line: string | undefined): line is string => line !== undefined
        )
        .join("\n");
export/** @internal */
const apiReferenceRecordToAgentDocument = (
    record: ApiReferenceRecord
): AgentDocument => ({
    context: `${ record.packageName } ${ record.version }`,
    id: `${ record.packageId }:${ record.module }`,
    kind: "api-module",
    title: record.displayName,
    url: record.link?.href ?? `/docs/api/${ record.packageId }/${ record.module }`,
    version: record.version,
    ...(record.source === undefined ? { } : { source: record.source }),
    content: [
        ...(record.summary === undefined ? [] : [ record.summary ]),
        `Exports: ${record.exportCount}`,
        record.introductionVersion === undefined
            ? ""
            : `Added in ${record.introductionVersion}`,
        ...record.declarations.map(
            (declaration: {
                readonly id: string;
                readonly name: string;
                readonly kind:
                    | "function"
                    | "const"
                    | "class"
                    | "interface"
                    | "type"
                    | "variable"
                    | "namespace";
                readonly categoryId: string;
                readonly description?: string;
                readonly signature: string;
                readonly introductionVersion?: string;
                readonly source?: {
                    readonly repositoryUrl: string;
                    readonly revision: string;
                    readonly file: string;
                    readonly line?: number;
                    readonly endLine?: number;
                };
                readonly link?: {
                    readonly href: string;
                    readonly external: boolean;
                    readonly label?: string;
                };
            }) =>
                [
                    `## ${declaration.name}`,
                    `Kind: ${declaration.kind}`,
                    declaration.introductionVersion === undefined
                        ? ""
                        : `Added in ${declaration.introductionVersion}`,
                    declaration.description,
                    `Signature:\n\n\`\`\`typescript\n${declaration.signature}\n\`\`\``,
                    declaration.source === undefined
                        ? ""
                        : [
                            `Source: ${declaration.source.repositoryUrl}/blob/` +
                            `${declaration.source.revision}/`,
                            declaration.source.file,
                            declaration.source.line === undefined
                                ? ""
                                : `#L${declaration.source.line}`
                        ].join("")
                ]
                    .filter(Boolean)
                    .join("\n\n")
        )
    ]
        .filter(Boolean)
        .join("\n\n")
});
