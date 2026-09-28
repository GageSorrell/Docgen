/**
 *
 *
 * @module @sorrell/docs-ui/Mdx
 *
 * @file      Mdx.tsx
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { type ReactNode, useCallback, useRef, useState } from "react";
import type { ApiReferenceDescriptionPart } from "@sorrell/docs-core";
export/** @internal */
const ApiReferenceDescription = ({
    parts,
    text
}: {
    readonly parts?: ReadonlyArray<ApiReferenceDescriptionPart> | undefined;
    readonly text?: string | undefined;
}) => text === undefined
    ? null
    : (
        <p>
            {parts === undefined
                ? text
                : parts.map((part, index) => part.kind === "link" && part.href !== undefined
                    ? (
                        <a className="docs-api-comment-link"
                            href={ part.href }
                            key={ `${index}:${part.href}:${part.text}` }>
                            {part.code === true
                                ? <code>{part.text}</code>
                                : part.text}
                            {part.external === true
                                ? (
                                    <svg aria-hidden="true"
                                        className="docs-description-external-icon"
                                        fill="none"
                                        viewBox="0 0 24 24">
                                        <path d="M14 3h7v7M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.7" />
                                    </svg>
                                )
                                : null}
                        </a>
                    )
                    : part.text)}
        </p>
    );
export/** @internal */
const DocCode = ({
    children,
    language = "text"
}: {
    readonly children: ReactNode;
    readonly language?: string;
}) =>
{
    const [ copied, setCopied ] = useState(false);
    const codeRef = useRef<HTMLPreElement>(null);
    const copyCode = useCallback(async () =>
    {
        const code = codeRef.current?.innerText ?? "";
        try
        {
            await navigator.clipboard.writeText(code);
        }
        catch
        {
            const area = document.createElement("textarea");
            area.value = code;
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            area.remove();
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    }, []);
    return (
        <div className="docs-code-frame docs-code-block">
            <div className="docs-code-language">{language}</div>
            <pre ref={ codeRef }>
                <code>{children}</code>
            </pre>
            <button aria-label={ copied ? "Copied to clipboard" : "Copy code to clipboard" }
                className="docs-code-copy"
                onClick={ copyCode }
                title="Copy to clipboard"
                type="button">
                { copied ? (
                    <svg aria-hidden="true"
                        fill="none"
                        viewBox="0 0 24 24">
                        <path d="m5 12.5 4.5 4.5L19 7.5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8" />
                    </svg>
                ) : (
                    <svg aria-hidden="true"
                        fill="none"
                        viewBox="0 0 24 24">
                        <rect height="14"
                            rx="1.5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            width="12"
                            x="8"
                            y="7" />
                        <path d="M16 4.5V4a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 4v12A1.5 1.5 0 0 0 5.5 17.5H6"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="1.6" />
                    </svg>
                ) }
            </button>
        </div>
    );
};
export/** @internal */
const Callout = ({
    children,
    tone = "note",
    title
}: {
    readonly children: ReactNode;
    readonly tone?: "note" | "warning" | "tip";
    readonly title?: string;
}) => (
    <aside className={ `docs-callout docs-callout-${tone}` }>
        {title === undefined ? null : <strong>{title}</strong>}
        <div>{children}</div>
    </aside>
);
export/** @internal */
const Tabs = ({
    tabs
}: {
    readonly tabs: ReadonlyArray<{
        readonly label: string;
        readonly content: ReactNode;
    }>;
}) =>
{
    const [ active, setActive ] = useState(0);
    return (
        <div className="docs-tabs">
            <div aria-label="Examples"
                className="docs-tab-list"
                role="tablist">
                {tabs.map(
                    (
                        tab: {
                            readonly label: string;
                            readonly content: ReactNode;
                        },
                        index: number
                    ) => (
                        <button
                            aria-selected={ index === active }
                            className={
                                index === active ? "is-active" : undefined
                            }
                            key={ tab.label }
                            onClick={ () => setActive(index) }
                            role="tab"
                            type="button">
                            {tab.label}
                        </button>
                    )
                )}
            </div>
            <div className="docs-tab-panel"
                role="tabpanel">
                {tabs[active]?.content}
            </div>
        </div>
    );
};
export/** @internal */
const Heading = ({
    level = 2,
    id,
    children
}: {
    readonly level?: 2 | 3 | 4;
    readonly id?: string;
    readonly children: ReactNode;
}) =>
{
    const Tag = `h${level}` as "h2" | "h3" | "h4";
    return (
        <Tag className="docs-heading"
            id={ id }>
            {children}
            {id === undefined ? null : (
                <a
                    aria-label={ `Link to ${String(children)}` }
                    className="docs-heading-link"
                    href={ `#${id}` }
                >
                    #
                </a>
            )}
        </Tag>
    );
};
