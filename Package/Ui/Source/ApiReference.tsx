/**
 *
 *
 * @module @sorrell/docs-ui/ApiReference
 *
 * @file      ApiReference.tsx
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type {
    ApiReferencePageProps,
    DocumentationNavGroup,
    DocumentationNavItem
} from "./Types.js";
import { Breadcrumbs, DocsSidebar, OnThisPage } from "./Navigation.js";
import { CopyForLlmButton } from "./CopyForLlm.js";
import { ApiReferenceDescription, DocCode } from "./Mdx.js";
import { useState } from "react";
import { apiReferenceRecordToAgentDocument, type ApiReferenceCategory, type ApiReferenceDeclaration, type ApiReferenceExample } from "@sorrell/docs-core";
const declarationHref = (id: string): string => `#${id}`;
type SourceLink = {
    readonly repositoryUrl: string;
    readonly revision: string;
    readonly file: string;
    readonly line?: number;
};
const sourceHref = (source: SourceLink): string =>
    [
        `${source.repositoryUrl}/blob/`,
        `${source.revision}/`,
        source.file,
        source.line === undefined ? "" : `#L${source.line}`
    ].join("");
const packageModules = (record: ApiReferencePageProps["record"]) =>
{
    const exports = record.packageExports ?? [ "." ];
    const packageHref = record.breadcrumbs.find((breadcrumb) => breadcrumb.label === record.packageName)?.href
        ?? `/docs/api/${record.packageId}`;
    return exports.map((exportPath) => {
        const path = exportPath === "." ? "" : exportPath.replace(/^\.\//u, "");
        const segments = path.split("/").filter(Boolean);
        const firstPart = segments[0];
        const group = firstPart === undefined
            ? "Core"
            : `${firstPart[0]?.toUpperCase() ?? ""}${firstPart.slice(1)}`;
        const label = segments.at(-1) ?? "Core";
        return {
            exportPath,
            group,
            href: exportPath === "."
                ? record.link?.href ?? packageHref
                : `${packageHref}/${path}`,
            label
        };
    });
};
const NpmLogo = () => (
    <svg aria-hidden="true"
        className="docs-npm-logo"
        viewBox="0 0 36 16">
        <rect fill="currentColor"
            height="16"
            rx="2"
            width="36" />
        <text fill="var(--docs-background)"
            fontFamily="Arial, sans-serif"
            fontSize="11"
            fontWeight="700"
            x="3"
            y="12">npm</text>
    </svg>
);
const GitHubIcon = () => (
    <svg aria-hidden="true"
        viewBox="0 0 24 24">
        <path
            d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.07c-3.09.67-3.74-1.31-3.74-1.31-.5-1.28-1.23-1.62-1.23-1.62-1-.68.08-.67.08-.67 1.11.08 1.7 1.14 1.7 1.14 1 1.69 2.59 1.2 3.22.92.1-.72.39-1.2.7-1.48-2.46-.28-5.04-1.23-5.04-5.47 0-1.21.43-2.2 1.14-2.97-.12-.28-.5-1.4.1-2.93 0 0 .93-.3 3.05 1.14a10.6 10.6 0 0 1 5.54 0c2.12-1.44 3.04-1.14 3.04-1.14.61 1.53.23 2.65.11 2.93.71.77 1.14 1.76 1.14 2.97 0 4.25-2.59 5.19-5.06 5.46.4.34.75 1.02.75 2.05v3.05c0 .3.2.64.76.53A11.1 11.1 0 0 0 12 .9Z"
            fill="currentColor"
        />
    </svg>
);
const ExternalLinkIcon = ({ className }: { readonly className?: string }) => (
    <svg
        aria-hidden="true"
        className={ className }
        viewBox="0 0 16 16"
    >
        <path
            d="M9.5 2.5h4v4M13.25 2.75 7 9m1-5H4.5A1.5 1.5 0 0 0 3 5.5v6A1.5 1.5 0 0 0 4.5 13h6a1.5 1.5 0 0 0 1.5-1.5V9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
        />
    </svg>
);
const apiNavigation = (
    record: ApiReferencePageProps["record"]
): ReadonlyArray<DocumentationNavGroup> =>
    record.categories.map(
        (category: ApiReferenceCategory) => ({
            items: record.declarations
                .filter(
                    (declaration: ApiReferenceDeclaration) =>
                        declaration.categoryId === category.id
                )
                .map(
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
                    }) => ({
                        active: false,
                        href: declarationHref(declaration.id),
                        label: declaration.name
                    })
                ),
            label: category.label
        })
    );
const tocItems = (
    record: ApiReferencePageProps["record"]
): ReadonlyArray<DocumentationNavItem> =>
    record.categories.map(
        (category: {
            readonly id: string;
            readonly label: string;
            readonly order: number;
            readonly collapsed: boolean;
        }) => ({
            children: record.declarations
                .filter(
                    (declaration: ApiReferenceDeclaration) => declaration.categoryId === category.id
                )
                .map(
                    (declaration: ApiReferenceDeclaration) => ({
                        href: declarationHref(declaration.id),
                        label: declaration.name
                    })
                ),
            href: `#category-${category.id}`,
            label: category.label
        })
    );
const declarationDocument = (
    record: ApiReferencePageProps["record"],
    name: string,
    description: string | undefined,
    signature: string
) => ({
    content: description === undefined ? signature : `${description}\n\n${signature}`,
    context: `${record.packageName} ${record.version}`,
    ...(description === undefined ? {} : { description }),
    id: `${record.packageId}:${record.module}:${name}`,
    kind: "api-module" as const,
    metadata: {
        declarationKind:
            record.declarations.find(
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
                }) => declaration.name === name
            )?.kind ?? "unknown"
    },
    title: name,
    url: `${record.link?.href ?? ""}#${name}`,
    version: record.version
});
export/** @internal */
const ApiReferencePage = ({
    record,
    navigation = []
}: ApiReferencePageProps) =>
{
    const groups = navigation.length === 0 ? apiNavigation(record) : navigation;
    const document = apiReferenceRecordToAgentDocument(record);
    const modules = packageModules(record);
    const [ moduleQuery, setModuleQuery ] = useState("");
    const filteredModules = modules.filter((module) =>
        `${module.group} ${module.label} ${module.exportPath}`
            .toLocaleLowerCase()
            .includes(moduleQuery.trim().toLocaleLowerCase())
    );
    const moduleGroups = [ ...new Set([ "Core", ...filteredModules.map((module) => module.group) ]) ];
    const packageSourceUrl = record.packageSourceUrl ?? record.source?.repositoryUrl;
    return (
        <div className="docs-api-page">
            <DocsSidebar groups={ groups }
                label="API Reference" />
            <main className="docs-api-main">
                <Breadcrumbs items={ record.breadcrumbs.map(
                    (breadcrumb, index) => index === 1 && !/^[vV]/u.test(breadcrumb.label)
                        ? { ...breadcrumb, label: `V${breadcrumb.label}` }
                        : breadcrumb
                ) } />
                <div className="docs-api-heading-row">
                    <div>
                        <h1>{record.displayName}</h1>
                        {record.packageDescription === undefined ? null : (
                            <p>{record.packageDescription}</p>
                        )}
                        <ApiReferenceDescription
                            parts={ record.summaryParts }
                            text={ record.summary }
                        />
                    </div>
                    <CopyForLlmButton document={ document } />
                </div>
                <div className="docs-api-meta">
                    <span>{modules.length} {modules.length === 1 ? "module" : "modules"}</span>
                    {record.packagePrivate === true ? null : (
                        <a className="docs-package-link"
                            href={ `https://www.npmjs.com/package/${record.packageName}` }
                            rel="noreferrer">
                            <NpmLogo />npm
                        </a>
                    )}
                    {packageSourceUrl === undefined ? null : (
                        <a
                            className="docs-source-link"
                            href={ packageSourceUrl }
                        >
                            <GitHubIcon />
                            Source
                        </a>
                    )}
                </div>
                <section aria-label={ `${record.packageName} modules` }
                    className="docs-package-modules">
                    <label className="docs-package-search-label"
                        htmlFor="docs-package-module-search">Search {record.packageName} modules</label>
                    <input
                        className="docs-package-search"
                        id="docs-package-module-search"
                        onChange={ (event) => setModuleQuery(event.currentTarget.value) }
                        placeholder="Search modules…"
                        type="search"
                        value={ moduleQuery }
                    />
                    {moduleGroups.map((group) => (
                        <section className="docs-package-module-group"
                            key={ group }>
                            <h2>{group}</h2>
                            <div className="docs-package-module-grid">
                                {filteredModules.filter((module) => module.group === group).map((module) => (
                                    <a className="docs-package-module-card"
                                        href={ module.href }
                                        key={ module.exportPath }>
                                        <span>{module.label}</span>
                                        <span aria-hidden="true">↗</span>
                                    </a>
                                ))}
                            </div>
                        </section>
                    ))}
                    {filteredModules.length === 0 ? <p className="docs-package-no-results">No modules match “{moduleQuery}”.</p> : null}
                </section>
                {record.categories.map(
                    (category: {
                        readonly id: string;
                        readonly label: string;
                        readonly order: number;
                        readonly collapsed: boolean;
                    }) => (
                        <section
                            className="docs-api-category"
                            id={ `category-${category.id}` }
                            key={ category.id }
                        >
                            <h2>{category.label}</h2>
                            {record.declarations
                                .filter(
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
                                        readonly descriptionParts?: ReadonlyArray<{
                                            readonly code?: boolean;
                                            readonly external?: boolean;
                                            readonly href?: string;
                                            readonly kind: "text" | "link";
                                            readonly text: string;
                                        }>;
                                        readonly examples?: ReadonlyArray<ApiReferenceExample>;
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
                                        declaration.categoryId === category.id
                                )
                                .map(
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
                                        readonly descriptionParts?: ReadonlyArray<{
                                            readonly code?: boolean;
                                            readonly external?: boolean;
                                            readonly href?: string;
                                            readonly kind: "text" | "link";
                                            readonly text: string;
                                        }>;
                                        readonly examples?: ReadonlyArray<ApiReferenceExample>;
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
                                    }) => (
                                        <article
                                            className="docs-api-declaration"
                                            id={ declaration.id }
                                            key={ declaration.id }
                                        >
                                            <div className="docs-declaration-heading">
                                                <h3>
                                                    <a
                                                        aria-label={ `Link to ${declaration.name}` }
                                                        className="docs-declaration-anchor"
                                                        href={ declarationHref(
                                                            declaration.id
                                                        ) }
                                                    >
                                                        #
                                                    </a>
                                                    {declaration.name}
                                                    <span className="docs-kind-badge">
                                                        {declaration.kind.toUpperCase()}
                                                    </span>
                                                </h3>
                                                <div className="docs-declaration-links">
                                                    <span>
                                                        Added in v{declaration.introductionVersion ?? record.version}
                                                    </span>
                                                    {declaration.source ===
                                                    undefined ? null : (
                                                            <a
                                                                className="docs-source-link"
                                                                href={ sourceHref(
                                                                    declaration.source
                                                                ) }
                                                            >
                                                                Source
                                                                <ExternalLinkIcon />
                                                            </a>
                                                        )}
                                                    <CopyForLlmButton
                                                        document={ declarationDocument(
                                                            record,
                                                            declaration.name,
                                                            declaration.description,
                                                            declaration.signature
                                                        ) }
                                                    />
                                                </div>
                                            </div>
                                            <ApiReferenceDescription
                                                parts={ declaration.descriptionParts }
                                                text={ declaration.description }
                                            />
                                            {declaration.examples?.map((example, index) => (
                                                <section className="docs-api-example"
                                                    key={ `${declaration.id}:example:${index}` }>
                                                    <h4 className="docs-api-example-heading">
                                                        Example
                                                        {example.name === undefined
                                                            ? null
                                                            : <span>({example.name})</span>}
                                                    </h4>
                                                    <DocCode language={ example.language ?? "typescript" }>
                                                        {example.code}
                                                    </DocCode>
                                                </section>
                                            ))}
                                            <h4>Signature</h4>
                                            <DocCode language="typescript">
                                                {declaration.signature}
                                            </DocCode>
                                        </article>
                                    )
                                )}
                        </section>
                    )
                )}
            </main>
            <OnThisPage items={ tocItems(record) } />
        </div>
    );
};
