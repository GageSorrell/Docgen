/**
 * @module @sorrell/docs-ui/Navigation
 *
 * @file      Navigation.tsx
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type {
    BreadcrumbItem,
    DocumentationNavGroup,
    DocumentationNavItem
} from "./Types.js";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { ThemeToggle } from "./Theme.js";

export/** @internal */
const DocsHeader = ({
    title = "Documentation",
    links = [ ],
    repositoryHref
}: {
    readonly title?: string;
    readonly links?: ReadonlyArray<DocumentationNavItem>;
    readonly repositoryHref?: string;
}) =>
{
    const [ open, setOpen ] = useState(false);
    const Invert = useCallback(() => setOpen(!open), [ open ]);

    return (
        <header className="docs-header">
            <a aria-label={ `${title} home` }
                className="docs-brand"
                href="/">
                <span aria-hidden="true"
                    className="docs-brand-mark">
                    ◆
                </span>
                {title}
            </a>
            <button
                aria-controls="docs-header-nav"
                aria-expanded={ open }
                className="docs-menu-button"
                onClick={ Invert }
                type="button">
                Menu
            </button>
            <nav
                aria-label="Primary navigation"
                className={ `docs-header-nav${open ? " is-open" : ""}` }
                id="docs-header-nav">
                {links.map((link: DocumentationNavItem) => (
                    <a
                        className={ link.active ? "is-active" : undefined }
                        href={ link.href }
                        key={ link.href }
                    >
                        {link.label}
                    </a>
                ))}
            </nav>
            <div className="docs-header-actions">
                <button
                    aria-label="Search documentation"
                    className="docs-search-button"
                    type="button"
                >
                    <span aria-hidden="true">⌕</span>
                    <span>Search</span>
                    <kbd>Ctrl + K</kbd>
                </button>
                {repositoryHref === undefined ? null : (
                    <a
                        aria-label="Open repository"
                        className="docs-icon-button docs-repository-link"
                        href={ repositoryHref }
                    >
                        ⌘
                    </a>
                )}
                <ThemeToggle />
            </div>
        </header>
    );
};
const NavItems = ({
    items
}: {
    readonly items: ReadonlyArray<DocumentationNavItem>;
}) => (
    <ul className="docs-nav-items">
        {items.map((item: DocumentationNavItem) => (
            <li key={ item.href }>
                <a
                    className={ item.active ? "is-active" : undefined }
                    href={ item.href }
                >
                    {item.label}
                </a>
                {item.children === undefined ? null : (
                    <NavItems items={ item.children } />
                )}
            </li>
        ))}
    </ul>
);
export/** @internal */
const DocsSidebar = ({
    groups,
    label = "Contents"
}: {
    readonly groups: ReadonlyArray<DocumentationNavGroup>;
    readonly label?: string;
}) => (
    <aside aria-label={ label }
        className="docs-sidebar">
        <div className="docs-sidebar-label">{label}</div>
        {groups.map((group: DocumentationNavGroup) => (
            <section className="docs-sidebar-group"
                key={ group.label }>
                <h2>{group.label}</h2>
                <NavItems items={ group.items } />
            </section>
        ))}
    </aside>
);
export/** @internal */
const Breadcrumbs = ({
    items
}: {
    readonly items: ReadonlyArray<BreadcrumbItem>;
}) => (
    <nav aria-label="Breadcrumb"
        className="docs-breadcrumbs">
        {items.map((item: BreadcrumbItem, index: number) => (
            <span key={ `${item.label}-${index}` }>
                {index === 0 ? null : (
                    <span
                        aria-hidden="true"
                        className="docs-breadcrumb-separator"
                    >
                        /
                    </span>
                )}
                {item.href !== undefined && !item.current ? (
                    <a href={ item.href }>{item.label}</a>
                ) : (
                    <span aria-current={ item.current ? "page" : undefined }>
                        {item.label}
                    </span>
                )}
            </span>
        ))}
    </nav>
);
export/** @internal */
const OnThisPage = ({
    items
}: {
    readonly items: ReadonlyArray<DocumentationNavItem>;
}) => (
    <aside aria-label="On this page"
        className="docs-toc">
        <div className="docs-toc-title">On this page</div>
        <NavItems items={ items } />
    </aside>
);
export/** @internal */
const DocumentationShell = ({
    children,
    title,
    headerLinks: InHeaderLinks,
    navigation: InNavigation,
    toc: InToc,
    repositoryHref
}: {
    readonly children: ReactNode;
    readonly title?: string;
    readonly headerLinks?: ReadonlyArray<DocumentationNavItem>;
    readonly navigation?: ReadonlyArray<DocumentationNavGroup>;
    readonly toc?: ReadonlyArray<DocumentationNavItem>;
    readonly repositoryHref?: string;
}) =>
{
    const headerLinks = useMemo(() => InHeaderLinks ?? [ ], [ InHeaderLinks ]);
    const navigation = useMemo(() => InNavigation ?? [ ], [ InNavigation ]);
    const toc = useMemo(() => InToc ?? [ ], [ InToc ]);

    return (
        <div className="docs-site">
            <DocsHeader
                { ...(title === undefined ? { } : { title }) }
                links={ headerLinks }
                { ...(repositoryHref === undefined ? { } : { repositoryHref }) }
            />
            <div className="docs-layout">
                {navigation.length === 0 ? null : (
                    <DocsSidebar groups={ navigation } />
                )}
                <main className="docs-main">{children}</main>
                {toc.length === 0 ? null : <OnThisPage items={ toc } />}
            </div>
        </div>
    );
};
