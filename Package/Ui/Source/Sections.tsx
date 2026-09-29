/**
 *
 *
 * @module @sorrell/docs-ui/Sections
 *
 * @file      Sections.tsx
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type { InstallCommandProps, LlmDocument } from "./Types.js";
import { type ReactNode, useCallback, useState } from "react";
import { CopyForLlmButton } from "./CopyForLlm.js";

export/** @internal */
const InstallCommand = ({ command }: InstallCommandProps) =>
{
    const [ copied, setCopied ] = useState(false);

    const copy = useCallback(async () =>
    {
        if (navigator.clipboard !== undefined)
        {
            await navigator.clipboard.writeText(command);
        }

        setCopied(true);

        window.setTimeout(() => setCopied(false), 1400);
    }, [ command ]);

    return (
        <button
            aria-label="Copy install command"
            className="docs-install-command"
            onClick={ copy }
            type="button">
            <code>{ command }</code>
            <span>{ copied ? "Copied" : "Copy" }</span>
        </button>
    );
};

export/** @internal */
const ArticlePage = ({
    title,
    description,
    breadcrumbs,
    document,
    children
}: {
    readonly title: string;
    readonly description?: string;
    readonly breadcrumbs?: ReactNode;
    readonly document: LlmDocument;
    readonly children: ReactNode;
}) => (
    <article className="docs-article">
        { breadcrumbs }
        <div className="docs-article-topline">
            <div>
                <h1>{ title }</h1>
                {
                    description === undefined
                        ? null
                        : (
                            <p className="docs-article-description">
                                { description }
                            </p>
                        )
                }
            </div>
            <CopyForLlmButton document={ document } />
        </div>
        <div className="docs-prose">
            { children }
        </div>
    </article>
);

export/** @internal */
const QuoteRail = ({
    author,
    quote
}: {
    readonly quote: string;
    readonly author: string;
}) => (
    <figure className="docs-quote-rail">
        <blockquote>“{ quote }”</blockquote>
        <figcaption>— { author }</figcaption>
    </figure>
);

export/** @internal */
const Faq = ({
    items
}: {
    readonly items: ReadonlyArray<{
        readonly question: string;
        readonly answer: ReactNode;
    }>;
}) => (
    <section className="docs-faq">
        {
            items.map(
                (item: {
                    readonly question: string;
                    readonly answer: ReactNode;
                }) => (
                    <details key={ item.question }>
                        <summary>
                            {item.question}
                            <span aria-hidden="true">+</span>
                        </summary>
                        <div>{item.answer}</div>
                    </details>
                )
            )
        }
    </section>
);

export/** @internal */
const Cta = ({
    title,
    children,
    href,
    label
}: {
    readonly title: string;
    readonly children?: ReactNode;
    readonly href: string;
    readonly label: string;
}) => (
    <section className="docs-cta">
        <div>
            <h2>{ title }</h2>
            { children }
        </div>
        <a href={ href }>
            { label } <span aria-hidden="true">↗</span>
        </a>
    </section>
);

export/** @internal */
const Footer = ({
    columns = [],
    links = [],
    message = `© ${new Date().getFullYear()} Sorrell`
}: {
    readonly columns?: ReadonlyArray<{
        readonly title: string;
        readonly links: ReadonlyArray<{ readonly href: string; readonly label: string }>;
    }>;
    readonly links?: ReadonlyArray<{
        readonly href: string;
        readonly label: string;
        readonly icon?: ReactNode;
    }>;
    readonly message?: ReactNode;
}) => (
    <footer aria-label="Site footer"
        className="docs-footer">
        { columns.length > 0 && <div className="docs-footer-columns">
            { columns.map((column) => <section aria-label={ column.title }
                key={ column.title }>
                <h2>{ column.title }</h2>
                <ul>{ column.links.map((link) => <li key={ link.href }><a href={ link.href }>{ link.label }</a></li>) }</ul>
            </section>) }
        </div> }
        <div className="docs-footer-bottom">
            <div>{ message }</div>
            { links.length > 0 && <nav aria-label="Footer links">
                { links.map((link) => <a aria-label={ link.label }
                    href={ link.href }
                    key={ link.href }
                    title={ link.label }>
                    { link.icon === "github"
                        ? <svg aria-hidden="true"
                            height="20"
                            viewBox="0 0 24 24"
                            width="20"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.68-3.76-1.32-3.76-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .7 2.65.5 3.3.38.1-.72.39-1.2.7-1.48-2.48-.28-5.09-1.24-5.09-5.53 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.63 10.63 0 0 1 5.57 0c2.12-1.45 3.05-1.15 3.05-1.15.61 1.54.23 2.68.12 2.96.71.78 1.14 1.78 1.14 3.01 0 4.3-2.61 5.24-5.1 5.51.4.35.75 1.03.75 2.08v3.09c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"
                                fill="currentColor" /></svg>
                        : link.icon ?? link.label }
                </a>) }
            </nav> }
        </div>
    </footer>
);
