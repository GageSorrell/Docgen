/**
 *
 *
 * @module @sorrell/docs-ui/CopyForLlm
 *
 * @file      CopyForLlm.tsx
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type { AgentDocument } from "@sorrell/docs-core";
import { formatAgentDocument } from "@sorrell/docs-core";
import { useCallback, useState } from "react";

export/** @internal */
const formatLlmDocument = formatAgentDocument;

const copyWithFallback = async (value: string): Promise<void> =>
{
    if (typeof navigator !== "undefined" && navigator.clipboard !== undefined)
    {
        await navigator.clipboard.writeText(value);
        return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
};

export/** @internal */
const CopyForLlmButton = ({
    document
}: {
    readonly document: AgentDocument;
}) =>
{
    const [ copied, setCopied ] = useState(false);

    const onCopy = useCallback(async () =>
    {
        await copyWithFallback(formatAgentDocument(document));
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    }, [ document ]);

    return (
        <button
            aria-label={ copied ? "Copied markdown!" : "Copy for LLM" }
            aria-live="polite"
            className="docs-copy-button"
            data-copied={ copied }
            onClick={ onCopy }
            type="button">
            <span
                aria-hidden="true"
                className="docs-copy-button-icon">
                <svg
                    className="docs-copy-icon"
                    fill="none"
                    viewBox="0 0 24 24">
                    <rect
                        height="14"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        width="14"
                        x="8"
                        y="8" />
                    <path
                        d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.7" />
                </svg>
                <svg
                    className="docs-copy-success-icon"
                    fill="none"
                    viewBox="0 0 24 24">
                    <path
                        d="m20 6-11 11-5-5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2" />
                </svg>
            </span>
            <span className="docs-copy-button-label">
                <span>Copy for LLM</span>
                <span>Copied markdown!</span>
            </span>
        </button>
    );
};
