/**
 * Three-package website workspace generation.
 *
 * @module @sorrell/docs-create-website/Generator
 *
 * @file      Generator.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    AtomicWriter,
    DocsFileSystem,
    DocsPath,
    SafeTargetValidation
} from "@sorrell/docs-cli";
import { type DocsConfig, decodeDocsConfigSync } from "@sorrell/docs-core";

import { Effect, Layer } from "effect";
import type {
    GeneratedWebsite,
    GeneratedWebsiteFile,
    GeneratedWebsitePackage,
    WebsiteGenerationOptions
} from "./Types.js";
import { landingTemplateFiles } from "./LandingTemplate.js";
import { documentationTemplateFiles } from "./DocumentationTemplate.js";
import {
    createLandingRewrites,
    createPlaceholderDeployments,
    createSnapshotProjects
} from "./Routing.js";
const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const html = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;");
const packageManifest = (
    name: string,
    scripts: Readonly<Record<string, string>>,
    dependencies: Readonly<Record<string, string>> = {},
    devDependencies: Readonly<Record<string, string>> = {}
): string =>
    json({
        dependencies,
        devDependencies,
        name,
        private: true,
        scripts: name === "@sorrell/documentation"
            ? {
                ...scripts,
                build: "node scripts/generate-favicons.mjs && astro build && pagefind --site dist --output-path dist/pagefind",
                verify: "astro check"
            }
            : scripts,
        type: "module",
        version: "1.0.1"
    });
const baseTsconfig = (): string =>
    json({
        compilerOptions: { noEmit: true },
        extends: "@sorrell/tsconfig/base"
    });
const documentationBaseRewrites = (
    prefix: string
): ReadonlyArray<{ readonly source: string; readonly destination: string }> => [
    { destination: "/", source: prefix },
    { destination: "/:path*", source: `${prefix}/:path*` }
];
const landingFiles = (
    config: DocsConfig
): ReadonlyArray<GeneratedWebsiteFile> =>
{
    const packages = [
        "Landing",
        "Documentation",
        ...(config.storybook.enabled ? [ "Storybook" ] : []),
        ...(config.agent.mcp.enabled ? [ "Mcp" ] : [])
    ];
    return [
        ...landingTemplateFiles(config),
        {
            content: json(config.vercel.projects.landing),
            path: "Landing/VercelProject.json"
        },
        {
            content: json(
                createLandingRewrites(
                    config.routing,
                    createPlaceholderDeployments(config),
                    config.redirects
                )
            ),
            path: "Landing/vercel.json"
        },
        {
            content: json(createSnapshotProjects(config).landing),
            path: "Landing/VercelProject.snapshot.json"
        },
        {
            content: json(
                createLandingRewrites(
                    config.routing,
                    createPlaceholderDeployments(config, true),
                    config.redirects
                )
            ),
            path: "Landing/vercel.snapshot.json"
        },
        {
            content: json({
                documentationPrefix: config.routing.documentationPrefix,
                packages,
                storybookPrefix: config.storybook.enabled
                    ? config.routing.storybookPrefix
                    : undefined
            }),
            path: "Landing/RouteManifest.json"
        }
    ];
};
const documentationFiles = (
    config: DocsConfig
): ReadonlyArray<GeneratedWebsiteFile> => [
    {
        content: packageManifest(
            "@sorrell/documentation",
            {
                build: "node scripts/generate-favicons.mjs && astro build",
                dev: "astro dev",
                verify: "astro check"
            },
            {
                "@pagefind/default-ui": "1.5.2",
                "@astrojs/mdx": "8.0.2",
                "@tailwindcss/typography": "0.5.20",
                "@tailwindcss/vite": "4.3.3",
                "@sorrell/docs-api-reference": "1.0.1",
                "@sorrell/docs-core": "1.0.1",
                "@sorrell/docs-astro": "1.0.1",
                "@sorrell/docs-create-website": "1.0.1",
                "@sorrell/docs-ui": "1.0.1",
                astro: "7.3.4",
                tailwindcss: "4.3.3"
            },
            {
                "@astrojs/check": "0.9.10",
                "@sorrell/tsconfig": "2.1.0",
                pagefind: "1.5.2",
                typescript: "6.0.2"
            }
        ),
        path: "Documentation/package.json"
    },
    { content: baseTsconfig(), path: "Documentation/tsconfig.json" },
    {
        content: `import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { docsAstroIntegration } from "@sorrell/docs-astro";

export default defineConfig({
    base: "${config.routing.documentationPrefix}/",
    build: { format: "directory" },
    integrations: [
        mdx(),
        docsAstroIntegration({
            prefix: "${config.routing.documentationPrefix}",
            site: "${html(config.metadata.url || "http://localhost:4321")}"
        })
    ],
    output: "static",
    srcDir: "./Source",
    vite: { plugins: [ tailwindcss() ] }
});
`,
        path: "Documentation/astro.config.mjs"
    },
    ...documentationTemplateFiles(config),
    {
        content: `---
title: ${config.metadata.title}
description: ${config.metadata.description}
group: Guides
order: 0
draft: false
---

# ${config.metadata.title}

${config.metadata.description}
`,
        path: "Documentation/Source/content/docs/index.md"
    },
    {
        content: json(config.vercel.projects.documentation),
        path: "Documentation/VercelProject.json"
    },
    {
        content: json(createSnapshotProjects(config).documentation),
        path: "Documentation/VercelProject.snapshot.json"
    },
    {
        content: json({
            headers: [
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/agent/:path*`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/:path*.md`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/llms.txt`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/llms-full.txt`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/:version/llms.txt`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/:version/llms-full.txt`
                }
            ],
            buildCommand: "npm run build",
            installCommand: "npm install",
            outputDirectory: "dist",
            rewrites: documentationBaseRewrites(
                config.routing.documentationPrefix
            ),
            version: 2
        }),
        path: "Documentation/vercel.json"
    },
    {
        content: json({
            buildCommand: "npm run build",
            cleanUrls: true,
            headers: [
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/agent/:path*`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/:path*.md`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/llms.txt`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/llms-full.txt`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/:version/llms.txt`
                },
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${config.routing.documentationPrefix}/:version/llms-full.txt`
                }
            ],
            installCommand: "npm install",
            outputDirectory: "dist",
            rewrites: documentationBaseRewrites(
                config.routing.documentationPrefix
            ),
            version: 2
        }),
        path: "Documentation/vercel.snapshot.json"
    }
];
const storybookFiles = (
    config: DocsConfig
): ReadonlyArray<GeneratedWebsiteFile> => [
    {
        content: packageManifest(
            "@sorrell/docs-storybook-web",
            {
                build: "storybook build --output-dir Distribution && node GenerateManifest.mjs",
                dev: "storybook dev -p 6006",
                typecheck: "tsc --project tsconfig.json --noEmit",
                verify: "storybook build --output-dir Distribution && node GenerateManifest.mjs"
            },
            {
                "@sorrell/docs-core": "1.0.1",
                "@sorrell/docs-ui": "1.0.1",
                "@storybook/addon-docs": "10.6.0",
                "@storybook/addon-themes": "10.6.0",
                "@storybook/react-vite": "10.6.0",
                react: "19.2.3",
                "react-dom": "19.2.3",
                storybook: "10.6.0"
            },
            {
                "@sorrell/tsconfig": "2.1.0",
                "@types/react": "19.2.3",
                "@types/react-dom": "19.2.3",
                typescript: "6.0.2"
            }
        ),
        path: "Storybook/package.json"
    },
    {
        content:
            "import { mkdir, " +
            "readdir, " +
            "readFile, " +
            "writeFile " +
            "} " +
            "from " +
            "\"node:fs/promises\"; " +
            "import { dirname, " +
            "resolve " +
            "} " +
            "from " +
            "\"node:path\"; " +
            "const " +
            "directory " +
            "= " +
            "resolve(\"Stories\"); " +
            "const " +
            "output " +
            "= " +
            "resolve(\"Distribution/agent/components.json\"); " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "const " +
            "files " +
            "= " +
            "(await " +
            "readdir(directory)).filter((file) " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "=> " +
            "file.endsWith(\".stories.tsx\") " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "|| " +
            "file.endsWith(\".stories.ts\") " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "|| " +
            "file.endsWith(\".stories.jsx\")).sort(); " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "const components = " +
            "[]; " +
            "for " +
            "(const " +
            "file " +
            "of " +
            "files) " +
            "{ " +
            "const " +
            "source " +
            "= " +
            "await " +
            "readFile(resolve(directory, " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "file), " +
            "\"utf8\"); " +
            "const " +
            "title " +
            "= " +
            "source.match(/title:\\s*[\"']([^\"']+)[\"']/)?.[1] " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "?? " +
            "file.replace(/\\.stories\\.[^.]+$/, " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "\"\"); " +
            "const " +
            "stories " +
            "= " +
            "[ " +
            "...source.matchAll(/export " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "const " +
            "([A-Za-z_$][\\w$]*)/g) " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "].map((match) " +
            "=> " +
            "({ " +
            "id: match[1], " +
            "title: " +
            "match[1] " +
            "})); " +
            "const " +
            "props " +
            "= " +
            "[ " +
            "...source.matchAll(/args:\\s*{([\\s\\S]*?)}/g) " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "].flatMap((match) " +
            "=> " +
            "[ " +
            "...((match[1] ?? " +
            "\"\").matchAll(/^\\s*([A-Za-z_$][\\w$]*):/gmu)) " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "].map((prop) " +
            "=> ({ name: prop[1], " +
            "type: " +
            "\"story " +
            "arg\" " +
            "}))); " +
            "components.push({ " +
            "id: " +
            "title.toLowerCase().replace(/[^a-z0-9]+/g, " +
            "" +
            "" +
            "" +
            "\"-\").replace(/^-|-$/g, " +
            "" +
            "" +
            "" +
            "\"\"), " +
            "title, props: [ ...new Map(props.map((prop) " +
            "=> " +
            "[ " +
            "prop.name, " +
            "prop " +
            "])).values() ], stories }); } await " +
            "mkdir(dirname(output), " +
            "{ " +
            "recursive: " +
            "true }); await writeFile(output, `${JSON.stringify({ version: " +
            "1, " +
            "components " +
            "}, null, 2)}\\n`, " +
            "\"utf8\");\n",
        path: "Storybook/GenerateManifest.mjs"
    },
    {
        content: `/**
 * Generates the Storybook component manifest consumed by the agent output.
 *
 * @file GenerateManifest.mjs
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const directory = resolve("Stories");
const output = resolve("Distribution/agent/components.json");
const files = (await readdir(directory))
    .filter((file) =>
        file.endsWith(".stories.tsx") ||
        file.endsWith(".stories.ts") ||
        file.endsWith(".stories.jsx")
    )
    .sort();
const components = [];

for (const file of files) {
    const source = await readFile(resolve(directory, file), "utf8");
    const title =
        source.match(/title:\\s*["']([^"']+)["']/)?.[1] ??
        file.replace(/\\.stories\\.[^.]+$/, "");
    const stories = [...source.matchAll(/export const ([A-Za-z_$][\\w$]*)/g)].map(
        (match) => ({ id: match[1], title: match[1] })
    );
    const props = [...source.matchAll(/args:\\s*{([\\s\\S]*?)}/g)].flatMap(
        (match) =>
            [...(match[1] ?? "").matchAll(/^\\s*([A-Za-z_$][\\w$]*):/gmu)].map(
                (prop) => ({ name: prop[1], type: "story arg" })
            )
    );
    components.push({
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        title,
        props: [...new Map(props.map((prop) => [prop.name, prop])).values()],
        stories
    });
}

await mkdir(dirname(output), { recursive: true });
await writeFile(
    output,
    \`\${JSON.stringify({ version: 1, components }, null, 2)}\\n\`,
    "utf8"
);
`,
        path: "Storybook/GenerateManifest.mjs"
    },
    {
        content: json({
            compilerOptions: {
                jsx: "react-jsx",
                lib: [ "ES2022", "DOM" ],
                noEmit: true
            },
            extends: "@sorrell/tsconfig/base"
        }),
        path: "Storybook/tsconfig.json"
    },
    {
        content: `import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
    addons: ["@storybook/addon-docs", "@storybook/addon-themes"],
    framework: { name: "@storybook/react-vite", options: {} },
    stories: ["../Stories/**/*.mdx", "../Stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    typescript: { reactDocgen: "react-docgen-typescript" },
    async viteFinal(value) {
        return {
            ...value,
            base: process.env.NODE_ENV === "production"
                ? "${config.routing.storybookPrefix}/"
                : "/",
            server: { ...value.server, allowedHosts: true }
        };
    }
};

export default config;
`,
        path: "Storybook/.storybook/main.ts"
    },
    {
        content: `import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";
import { createThemeCss, docsUiCss } from "@sorrell/docs-ui";

const preview: Preview = {
    decorators: [
        (Story) => <><style>{docsUiCss}</style><style>{createThemeCss(${JSON.stringify(config.tokens)})}</style><Story /></>,
        withThemeByClassName({
            defaultTheme: "light",
            themes: { light: "light", dark: "dark", system: "system" }
        })
    ],
    parameters: { layout: "fullscreen" },
    globalTypes: {
        theme: {
            defaultValue: "light",
            toolbar: {
                icon: "paintbrush",
                items: [ "light", "dark", "system" ]
            }
        }
    }
};

export default preview;
`,
        path: "Storybook/.storybook/preview.tsx"
    },
    {
        content: `import type { Meta, StoryObj } from "@storybook/react-vite";
import {
    Cta,
    Footer,
    Faq,
    InstallCommand,
    LandingPage,
    LandingSection,
    QuoteRail
} from "@sorrell/docs-ui";

const meta = {
    component: LandingPage,
    title: "Landing/LandingPage"
} satisfies Meta<typeof LandingPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FullComposition: Story = {
    args: {
        content: {
            description: "Documentation designed for people and agents.",
            sections: [
                { body: "Readable articles and stable links.", id: "01", title: "Docs", href: "#docs" },
                { body: "Shared React primitives for every surface.", id: "02", title: "Components", href: "#components" }
            ],
            title: "Sorrell Documentation"
        },
        installCommand: "npm install @sorrell/docs-ui"
    },
    render: (args) => <LandingPage {...args}>
        <LandingSection title="Components">
            <div style={{ display: "grid", gap: 24 }}>
                <InstallCommand command="npm install @sorrell/docs-ui" />
                <QuoteRail author="Sorrell" quote="Make the useful path the obvious path." />
                <Faq items={[{ question: "Is this keyboard friendly?", answer: "The controls use native focusable elements." }]} />
            </div>
        </LandingSection>
        <Cta href="/docs/" label="Read the docs" title="Build something worth documenting." />
        <Footer
            columns={[
                { title: "Resources", links: [{ href: "/docs/", label: "Documentation" }, { href: "/storybook/", label: "Storybook" }] },
                { title: "Community", links: [{ href: "https://github.com/GageSorrell/Documentation", label: "GitHub" }] }
            ]}
            links={[{ href: "https://github.com/GageSorrell/Documentation", label: "GitHub", icon: "github" }]}
            message="© Sorrell Documentation"
        />
    </LandingPage>
};

export const LongContent: Story = {
    ...FullComposition,
    args: {
        ...FullComposition.args,
        content: {
            description: "A deliberately long description demonstrates responsive wrapping and readable line lengths across viewports.",
            sections: Array.from({ length: 6 }, (_, index) => ({
                body: "A representative landing-page section with enough content to exercise the layout.",
                id: String(index + 1).padStart(2, "0"),
                title: "Section " + (index + 1)
            })),
            title: "A Longer Landing Page Title"
        }
    }
};
`,
        path: "Storybook/Stories/LandingPage.stories.tsx"
    },
    {
        content: `import type { Meta, StoryObj } from "@storybook/react-vite";
import { LandingSection } from "@sorrell/docs-ui";

const meta = { component: LandingSection, title: "Landing/LandingSection" } satisfies Meta<typeof LandingSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { children: null, title: "A focused section" }, render: (args) => <LandingSection {...args}><p>Section content remains readable and composable.</p></LandingSection> };
export const WithEyebrow: Story = { args: { children: null, eyebrow: "Featured", title: "An emphasized section" }, render: (args) => <LandingSection {...args}><p>Eyebrows provide a small semantic cue above the heading.</p></LandingSection> };
`,
        path: "Storybook/Stories/LandingSection.stories.tsx"
    },
    {
        content: `import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocsHeader } from "@sorrell/docs-ui";

const meta = { component: DocsHeader, title: "Landing/DocsHeader" } satisfies Meta<typeof DocsHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Navigation: Story = { args: { links: [{ href: "/docs/", label: "Docs" }, { href: "${config.routing.storybookPrefix}/", label: "Storybook" }], title: "Sorrell Documentation" } };
export const KeyboardFocus: Story = { ...Navigation };
`,
        path: "Storybook/Stories/DocsHeader.stories.tsx"
    },
    {
        content: `import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeProvider, ThemeToggle } from "@sorrell/docs-ui";

const meta = { component: ThemeProvider, title: "Landing/ThemeProvider" } satisfies Meta<typeof ThemeProvider>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = { args: { children: null, initialMode: "light" }, render: (args) => <ThemeProvider {...args}><ThemeToggle /></ThemeProvider> };
export const Dark: Story = { args: { children: null, initialMode: "dark" }, render: (args) => <ThemeProvider {...args}><ThemeToggle /></ThemeProvider> };
export const System: Story = { args: { children: null, initialMode: "system" }, render: (args) => <ThemeProvider {...args}><ThemeToggle /></ThemeProvider> };
`,
        path: "Storybook/Stories/ThemeProvider.stories.tsx"
    },
    {
        content: json(config.vercel.projects.storybook),
        path: "Storybook/VercelProject.json"
    },
    {
        content: json(createSnapshotProjects(config).storybook),
        path: "Storybook/VercelProject.snapshot.json"
    },
    {
        content: json({
            buildCommand: "npm run build",
            installCommand: "npm install",
            outputDirectory: "Distribution",
            redirects: [
                {
                    destination: `${config.routing.storybookPrefix}/`,
                    source: config.routing.storybookPrefix,
                    statusCode: 301
                }
            ],
            rewrites: [
                {
                    destination: "/",
                    source: config.routing.storybookPrefix
                },
                {
                    destination: "/:path*",
                    source: `${config.routing.storybookPrefix}/:path*`
                }
            ],
            version: 2
        }),
        path: "Storybook/vercel.json"
    },
    {
        content: json({
            buildCommand: "npm run build",
            cleanUrls: true,
            installCommand: "npm install",
            outputDirectory: "Distribution",
            redirects: [
                {
                    destination: `${config.routing.storybookPrefix}/`,
                    source: config.routing.storybookPrefix,
                    statusCode: 301
                }
            ],
            rewrites: [
                {
                    destination: "/",
                    source: config.routing.storybookPrefix
                },
                {
                    destination: "/:path*",
                    source: `${config.routing.storybookPrefix}/:path*`
                }
            ],
            version: 2
        }),
        path: "Storybook/vercel.snapshot.json"
    }
];
const mcpFiles = (config: DocsConfig): ReadonlyArray<GeneratedWebsiteFile> => [
    {
        content: packageManifest(
            "generated-documentation-mcp",
            {
                build: "node Build.mjs",
                dev: "node Dev.mjs",
                verify: "node Verify.mjs"
            },
            {
                "@sorrell/docs-core": "1.0.1",
                "@sorrell/docs-mcp": "1.0.1",
                effect: "4.0.0-rc.117"
            },
            { "@sorrell/tsconfig": "2.1.0" }
        ),
        path: "Mcp/package.json"
    },
    { content: baseTsconfig(), path: "Mcp/tsconfig.json" },
    {
        content:
            "import { cp, mkdir } from \"node:fs/promises\"; await mkdir(\"Data\", { " +
            "recursive: true }); await cp(\"../Documentation/dist/agent\", \"Data\", { recursive: true });\n",
        path: "Mcp/Build.mjs"
    },
    {
        content:
            "import { access } from \"node:fs/promises\"; await " +
            "access(\"Data/manifest.json\"); await access(\"api/index.mjs\");\n",
        path: "Mcp/Verify.mjs"
    },
    {
        content:
            "import { " +
            "createServer " +
            "} " +
            "from " +
            "\"node:http\"; " +
            "import " +
            "{ " +
            "readFile " +
            "} " +
            "from " +
            "\"node:fs/promises\"; " +
            "import " +
            "{ " +
            "createHttpHandler, " +
            "decodeMcpSource " +
            "} " +
            "from " +
            "\"@sorrell/docs-mcp\"; " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "const " +
            "manifest " +
            "= " +
            "JSON.parse(await " +
            "readFile(\"Data/manifest.json\", " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "\"utf8\")); " +
            "const " +
            "corpus " +
            "= " +
            "JSON.parse(await " +
            "readFile(\"Data/corpus/current.json\", " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "\"utf8\")); " +
            "const " +
            "index " +
            "= " +
            "JSON.parse(await " +
            "readFile(\"Data/search-index.json\", " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "\"utf8\")); " +
            "const " +
            "{ " +
            "handler } = " +
            "createHttpHandler(decodeMcpSource({ " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "manifest, " +
            "corpus, " +
            "index " +
            "})); " +
            "createServer((request, " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "response) " +
            "=> " +
            "handler(new " +
            "Request(`http://127.0.0.1:7070${request.url}`, " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "{ " +
            "method: " +
            "request.method, " +
            "headers: " +
            "Object.fromEntries(Object.entries(request.headers).filter(([key, " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "value]) => typeof " +
            "value " +
            "=== " +
            "\"string\") " +
            "as " +
            "[string, " +
            "string][]), " +
            "body: " +
            "request.method === " +
            "\"GET\" " +
            "? " +
            "undefined " +
            ": " +
            "request " +
            "})).then(async " +
            "(value) " +
            "=> " +
            "{ " +
            "response.writeHead(value.status, " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "Object.fromEntries(value.headers)); " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "response.end(Buffer.from(await " +
            "" +
            "" +
            "" +
            "value.arrayBuffer())); " +
            "" +
            "" +
            "" +
            "}).catch(() " +
            "=> " +
            "{ " +
            "response.writeHead(500); " +
            "" +
            "" +
            "" +
            "response.end(); " +
            "}); " +
            "}).listen(7070, " +
            "\"127.0.0.1\");\n",
        path: "Mcp/Dev.mjs"
    },
    {
        content:
            "import { readFile } " +
            "from " +
            "\"node:fs/promises\"; " +
            "import " +
            "{ " +
            "createHttpHandler, " +
            "decodeMcpSource } " +
            "from " +
            "\"@sorrell/docs-mcp\"; " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "const " +
            "read " +
            "= " +
            "(name) " +
            "=> " +
            "readFile(new " +
            "URL(`../Data/${name}`, " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "import.meta.url), " +
            "\"utf8\").then(JSON.parse); " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "const " +
            "source " +
            "= " +
            "decodeMcpSource({ " +
            "manifest: " +
            "await " +
            "read(\"manifest.json\"), " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "corpus: " +
            "await " +
            "read(\"corpus/current.json\"), " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "index: " +
            "await " +
            "read(\"search-index.json\") " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "}); " +
            "export " +
            "const " +
            "{ " +
            "handler " +
            "} " +
            "= " +
            "createHttpHandler(source); " +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "" +
            "export " +
            "default " +
            "handler;\n",
        path: "Mcp/api/index.mjs"
    },
    {
        content: json(config.vercel.projects.mcp),
        path: "Mcp/VercelProject.json"
    },
    {
        content: json(createSnapshotProjects(config).mcp),
        path: "Mcp/VercelProject.snapshot.json"
    },
    {
        content: json({
            functions: { "api/index.mjs": { maxDuration: 30 } },
            version: 2
        }),
        path: "Mcp/vercel.json"
    },
    {
        content: json({
            functions: { "api/index.mjs": { maxDuration: 30 } },
            version: 2
        }),
        path: "Mcp/vercel.snapshot.json"
    }
];
const createWebsiteFromConfig = (
    options: WebsiteGenerationOptions,
    config: DocsConfig
): GeneratedWebsite =>
{
    const generatedAt = options.generatedAt ?? new Date().toISOString();
    const revision = options.revision ?? "working-tree";
    const packages: Array<GeneratedWebsitePackage> = [
        {
            directory: "Landing",
            kind: "landing",
            name: "generated-documentation-landing",
            routePrefix: "/"
        },
        {
            directory: "Documentation",
            kind: "documentation",
            name: "@sorrell/documentation",
            routePrefix: config.routing.documentationPrefix
        },
        ...(config.storybook.enabled
            ? [
                {
                    directory: "Storybook",
                    kind: "storybook" as const,
                    name: "@sorrell/docs-storybook-web",
                    routePrefix: config.routing.storybookPrefix
                }
            ]
            : []),
        ...(config.agent.mcp.enabled
            ? [
                {
                    directory: "Mcp",
                    kind: "mcp" as const,
                    name: "generated-documentation-mcp",
                    routePrefix: "/"
                }
            ]
            : [])
    ];
    const files = [
        ...landingFiles(config),
        ...documentationFiles(config),
        ...(config.storybook.enabled ? storybookFiles(config) : []),
        ...(config.agent.mcp.enabled ? mcpFiles(config) : []),
        {
            content: json({
                devDependencies: { "@sorrell/tsconfig": "2.1.0" },
                name: "generated-documentation",
                packageManager: "npm@11.0.0",
                private: true,
                type: "module",
                workspaces: packages.map(
                    ({ directory }: GeneratedWebsitePackage) => directory
                )
            }),
            path: "package.json"
        },
        {
            content: json({
                ...config,
                versions: config.versions.map((version) => {
                    if (!version.current)
                    {
                        return version;
                    }
                    const versionNumber = version.version ?? "1";
                    return {
                        ...version,
                        label: `v${versionNumber} (Latest)`,
                        version: versionNumber
                    };
                })
            }),
            path: "docs.config.json"
        },
        { content: json(config.vercel.projects), path: "VercelProjects.json" },
        {
            content: json(createSnapshotProjects(config)),
            path: "VercelProjects.snapshot.json"
        },
        {
            content: json({
                generatedAt,
                packages: packages.map(
                    ({
                        directory,
                        kind,
                        routePrefix
                    }: GeneratedWebsitePackage) => ({
                        directory,
                        kind,
                        routePrefix
                    })
                ),
                revision,
                routes: config.routing
            }),
            path: "DeploymentManifest.json"
        }
    ];
    return {
        config,
        files,
        generatedAt,
        packages,
        revision,
        target: options.target
    };
};
export/** @internal */
const createGeneratedWebsite = (
    options: WebsiteGenerationOptions
): GeneratedWebsite =>
    createWebsiteFromConfig(
        options,
        decodeDocsConfigSync(
            options.config ?? { storybook: { enabled: false } }
        )
    );
export/** @internal */
const createGeneratedWebsiteFromConfig = (
    target: string,
    config: DocsConfig,
    options: Omit<WebsiteGenerationOptions, "config" | "target"> = {}
): GeneratedWebsite => createWebsiteFromConfig({ ...options, target }, config);
export/** @internal */
const writeGeneratedWebsite = (
    website: GeneratedWebsite
): Effect.Effect<void, unknown> =>
    Effect.gen(function* ()
    {
        const fileSystem = yield* DocsFileSystem;
        const path = yield* DocsPath;
        const safeTarget = yield* SafeTargetValidation;
        yield* safeTarget.validateEmpty(website.target);
        yield* fileSystem.makeDirectory(website.target);
        const writer = yield* AtomicWriter;
        yield* Effect.forEach(
            website.files,
            (file: GeneratedWebsiteFile) =>
            {
                const target = path.join(website.target, file.path);
                return fileSystem
                    .makeDirectory(path.dirname(target))
                    .pipe(
                        Effect.flatMap(() =>
                            writer.writeText(target, file.content)
                        )
                    );
            },
            { concurrency: 1 }
        );
    }).pipe(
        Effect.provide(
            Layer.mergeAll(
                DocsFileSystem.layer,
                DocsPath.layer,
                AtomicWriter.layer,
                SafeTargetValidation.layer
            )
        )
    );
