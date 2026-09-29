/**
 *
 *
 * @module @sorrell/website/App
 *
 * @file      App.tsx
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { useEffect, useState } from "react";
import type { ApiReferenceRecord, DesignTokens } from "@sorrell/docs-core";
import {
    ApiReferencePage,
    Callout,
    Cta,
    Footer,
    DocumentationShell,
    Heading,
    LandingPage,
    ThemeProvider,
    createThemeCss,
    docsUiCss
} from "@sorrell/docs-ui";

const footerColumns = [
    {
        title: "Resources",
        links: [
            { href: "/api", label: "API reference" },
            { href: "/storybook/", label: "Storybook" }
        ]
    },
    {
        title: "Community",
        links: [ { href: "https://github.com/GageSorrell/Documentation", label: "GitHub" } ]
    }
];
const footerLinks = [ {
    href: "https://github.com/GageSorrell/Documentation",
    icon: "github",
    label: "GitHub"
} ];
const tokens: DesignTokens = {
    light: {
        background: "#fbfbfa",
        foreground: "#171717",
        muted: "#737373",
        border: "#dededb",
        accent: "#b45309",
        codeBackground: "#f1f1ee"
    },
    dark: {
        background: "#0c0c0d",
        foreground: "#f5f5f4",
        muted: "#a1a1aa",
        border: "#2c2c30",
        accent: "#fbbf24",
        codeBackground: "#171719"
    }
};

const record: ApiReferenceRecord = {
    packageId: "docs-ui",
    packageName: "@sorrell/docs-ui",
    module: "Navigation",
    displayName: "Navigation",
    version: "1.0.1",
    summary: "Accessible navigation primitives for documentation sites.",
    breadcrumbs: [
        { label: "API Reference", href: "/api", current: false },
        { label: "v0.1.0", href: "/api/v0.1.0", current: false },
        { label: "@sorrell/docs-ui", href: "/api/v0.1.0/docs-ui", current: false },
        { label: "Navigation", current: true }
    ],
    categories: [
        { id: "components", label: "Components", order: 0, collapsed: false },
        { id: "models", label: "Models", order: 1, collapsed: false }
    ],
    declarations: [
        {
            id: "DocsHeader",
            name: "DocsHeader",
            kind: "function",
            categoryId: "components",
            description: "The responsive top navigation used by documentation shells.",
            signature: "declare const DocsHeader: (props: DocsHeaderProps) => JSX.Element",
            introductionVersion: "1.0.1",
            source: { repositoryUrl: "https://github.com/GageSorrell/Documentation", revision: "Master", file: "Package/Ui/Source/Navigation.tsx", line: 7 }
        },
        {
            id: "DocumentationShell",
            name: "DocumentationShell",
            kind: "function",
            categoryId: "components",
            description: "Three-rail responsive shell with navigation and an on-this-page outline.",
            signature: "declare const DocumentationShell: (props: DocumentationShellProps) => JSX.Element",
            introductionVersion: "1.0.1",
            source: { repositoryUrl: "https://github.com/GageSorrell/Documentation", revision: "Master", file: "Package/Ui/Source/Navigation.tsx", line: 32 }
        },
        {
            id: "ThemeMode",
            name: "ThemeMode",
            kind: "type",
            categoryId: "models",
            description: "The supported persisted theme modes.",
            signature: "type ThemeMode = \"light\" | \"dark\" | \"system\"",
            introductionVersion: "1.0.1",
            source: { repositoryUrl: "https://github.com/GageSorrell/Documentation", revision: "Master", file: "Package/Ui/Source/Types.ts", line: 6 }
        }
    ],
    exportCount: 23,
    introductionVersion: "1.0.1",
    source: { repositoryUrl: "https://github.com/GageSorrell/Documentation", revision: "Master", file: "Package/Ui/Source/index.ts", line: 1 },
    link: { href: "/api/v0.1.0/docs-ui/Navigation", label: "Navigation", external: false }
};

const navigation = [
    { label: "Guides", items: [ { label: "Introduction", href: "/" }, { label: "Authoring", href: "/authoring" } ] },
    { label: "Reference", items: [ { label: "Navigation", href: "/api", active: true }, { label: "Themes", href: "/api/themes" } ] }
];

export const App = () =>
{
    const [ view, setView ] = useState<"landing" | "api">("landing");
    useEffect(() =>
    {
        const style = document.createElement("style");
        style.textContent = `${docsUiCss}\n${createThemeCss(tokens)}`;
        document.head.appendChild(style);
        return () => style.remove();
    }, []);
    return <ThemeProvider initialMode="dark">
        <DocumentationShell
            headerLinks={ [ { label: "Docs", href: "/", active: view === "landing" }, { label: "Reference", href: "/api", active: view === "api" }, { label: "Guides", href: "/guides" } ] }
            navigation={ view === "api" ? [] : navigation }
            repositoryHref="https://github.com/GageSorrell/Documentation"
            title="Sorrell Docs"
            toc={ [] }
        >
            <div className="docs-demo-switcher"
                style={ { display: "flex", gap: 8, marginBottom: 24 } }>
                <button onClick={ () => setView("landing") }
                    type="button">Landing</button>
                <button onClick={ () => setView("api") }
                    type="button">API reference</button>
            </div>
            {view === "api" ? <ApiReferencePage record={ record } /> : <>
                <LandingPage content={ { title: "Documentation with a point of view.", description: "A responsive system for clear guides, durable API references, and component examples that feel like part of the same product.", sections: [
                    { id: "01", title: "Write clearly", body: "MDX primitives that keep the reading experience calm and focused.", href: "#write" },
                    { id: "02", title: "Ship references", body: "A complete shell for package, module, and declaration documentation.", href: "/api" },
                    { id: "03", title: "Stay in sync", body: "Theme and navigation contracts shared across every generated surface.", href: "#sync" }
                ] } }
                installCommand="npm install @sorrell/docs-ui">
                    <div className="docs-prose"
                        id="write"
                        style={ { marginTop: 80 } }>
                        <Heading id="principles">A small, steady system</Heading>
                        <p>Documentation should make the next useful action obvious. The UI kit keeps typography, navigation, themes, and generated references aligned without taking ownership of your content.</p>
                        <Callout title="Design principle"
                            tone="tip">Keep the reading surface quiet. Put controls where people need them, and let the content carry the page.</Callout>
                        <Cta href="/api"
                            label="Open API reference"
                            title="Explore the reference" />
                    </div>
                    <Footer columns={ footerColumns }
                        links={ footerLinks }
                        message="© Sorrell Documentation" />
                </LandingPage>
            </>}
        </DocumentationShell>
    </ThemeProvider>;
};
