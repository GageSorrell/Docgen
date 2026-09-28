/**
 *
 *
 * @module @sorrell/docs-create-website/Test/Generator.test
 *
 * @file      Generator.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { docsUiCss } from "@sorrell/docs-ui";
import { createGeneratedWebsite } from "../Source/Generator.js";
describe("three-package website generation", () =>
{
    it("generates package API reference pages with searchable export groups", () =>
    {
        const website = createGeneratedWebsite({
            config: {
                api: {
                    enabled: true,
                    entryPoints: [ "Package/Widget/Source/index.ts" ],
                    packages: [ "@example/widget" ]
                },
                metadata: { repository: { url: "https://github.com/example/widget" } }
            },
            target: "generated"
        });
        const contents = new Map(
            website.files.map((file: GeneratedWebsiteFile) => [ file.path, file.content ])
        );
        const apiPackageLayout = contents.get("Documentation/Source/layouts/ApiPackageLayout.astro") ?? "";
        const apiReferenceLayout = contents.get("Documentation/Source/layouts/ApiReferenceLayout.astro") ?? "";
        const docsLayout = contents.get("Documentation/Source/layouts/DocsLayout.astro") ?? "";
        const siteHeader = contents.get("Documentation/Source/components/SiteHeader.astro") ?? "";
        expect(apiPackageLayout).toContain("record.packageDescription");
        expect(apiPackageLayout).toContain("record.packagePrivate === true");
        expect(apiPackageLayout).toContain("record.packageSourceUrl");
        expect(apiPackageLayout).toContain("viewBox=\"0 0 640 640\" fill=\"currentColor\"><path fill=\"currentColor\" d=\"M320 352h-32v-64h32zm288-128v192H320v32H192v-32H32V224");
        expect(apiPackageLayout).toContain(".docs-npm-logo { flex: none; height: 16px; width: 16px; }");
        expect(apiPackageLayout).toContain("docs-api-module-card");
        expect(apiPackageLayout).toContain("font-size: 14px");
        expect(apiPackageLayout).toContain("padding: 12px 16px");
        expect(apiPackageLayout).toContain("docs-package-module-search");
        expect(contents.get("Documentation/Source/pages/api/[...slug].astro"))
            .toContain("ApiPackageLayout record={record}");
        expect(contents.get("Documentation/Source/pages/api/[...slug].astro"))
            .toContain("view: packageModules.length === 1 ? \"module\" as const : \"package\" as const");
        expect(contents.get("Documentation/Source/pages/api/[...slug].astro"))
            .toContain("modulesByPackage.get(record.packageId)?.length !== 1");
        expect(apiReferenceLayout).toContain("uncategorizedDeclarations");
        expect(apiReferenceLayout).toContain("declarationCategoryNames");
        expect(apiReferenceLayout).toContain("docs-toc-category");
        expect(apiReferenceLayout).toContain(".docs-toc-category > span");
        expect(apiReferenceLayout).toContain("ApiReferenceDescription description={declaration.description} parts={declaration.descriptionParts}");
        expect(apiReferenceLayout).toContain("ApiReferenceDescription description={record.summary} parts={record.summaryParts}");
        expect(apiReferenceLayout).toContain("declaration.examples?.map((example, index)");
        expect(apiReferenceLayout).toContain("docs-api-example-heading");
        expect(apiReferenceLayout).toContain("data-copy-label=\"Copy example to clipboard\"");
        expect(apiReferenceLayout).toContain(".docs-api-package { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.1rem; font-weight: 700;");
        expect(apiReferenceLayout).toContain("<div class=\"docs-api-title-row\">");
        expect(apiReferenceLayout).toContain("<span>Copy for LLM</span><span>Copied markdown!</span>");
        expect(apiReferenceLayout).toContain("button.setAttribute(\"aria-label\", \"Copied markdown!\")");
        expect(docsLayout).toContain("<span>Copy for LLM</span><span>Copied markdown!</span>");
        expect(docsLayout).toContain(".docs-eyebrow { color: var(--docs-accent); font-size: 11.2px;");
        expect(docsLayout).toContain(".docs-breadcrumbs { color: var(--docs-muted); display: flex; font-size: 11.2px;");
        const generatedApiDescription = contents.get("Documentation/Source/components/ApiReferenceDescription.astro") ?? "";
        expect(generatedApiDescription).toContain("part.external === true");
        expect(generatedApiDescription).toContain("docs-description-external-icon");
        expect(apiReferenceLayout).toContain("font-size: 11.2px; font-weight: 400");
        expect(apiReferenceLayout).toContain(".docs-api-heading-row .docs-eyebrow { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.2px; }");
        expect(apiReferenceLayout).toContain(".docs-api-page > .docs-toc { align-self: start; max-height: calc(100vh - var(--docs-header-height, 72px)); overflow-y: auto; position: sticky; top: var(--docs-header-height, 72px); }");
        expect(apiReferenceLayout).toContain("class=\"docs-declaration-name\" href={`#${declaration.id}`} aria-label={`Link to ${declaration.name}`}");
        expect(apiReferenceLayout).toContain("class=\"docs-declaration-link-icon\" aria-hidden=\"true\" viewBox=\"0 0 24 24\"");
        expect(apiReferenceLayout).not.toContain("<a href={`#${declaration.id}`}>#</a>");
        expect(docsUiCss).toContain("html { scroll-behavior: smooth;");
        expect(docsUiCss).toContain("margin-inline: auto;\nmax-width: 1480px;");
        expect(docsUiCss).toContain(".docs-api-title-row { align-items: baseline;\ndisplay: flex;\ngap: 24px;\njustify-content: space-around;");
        expect(docsUiCss).toContain("scroll-behavior: auto !important;");
        expect(docsUiCss).toContain("font-size: 12px;\nfont-weight: 400;\ngap: 7px;\njustify-content: flex-start;");
        expect(docsUiCss).toContain("flex: 0 0 14px;\nheight: 14px;\nwidth: 14px;");
        expect(docsUiCss).toContain("margin: 1.4em 0 0.35em;");
        expect(docsUiCss).toContain(".docs-api-category > .docs-api-declaration:first-of-type { border-top: 0;\npadding-top: 12px;");
        expect(docsLayout).toContain("font-size: 12px; font-weight: 400; justify-content: flex-start; min-height: 34px; padding: 0 10px; text-align: left;");
        expect(docsLayout).toContain(".docs-heading-row { align-items: start; display: flex; gap: 2rem; justify-content: space-around; }");
        expect(apiPackageLayout).toContain(".docs-api-package-main > .docs-breadcrumbs { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.2px;");
        expect(apiPackageLayout).toContain(".docs-api-package-main > .docs-eyebrow { color: var(--docs-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.2px;");
        expect(apiReferenceLayout).toContain("font-size: 25px");
        expect(apiReferenceLayout).toContain("background: var(--docs-code-background)");
        expect(siteHeader).toContain("const configuredRepositoryUrl = \"https://github.com/example/widget\" as string;");
        expect(siteHeader).toContain("aria-label=\"GitHub\"");
        expect(siteHeader).toContain(".landing-header-social-link svg { display: block; flex: none; height: 20px; width: 20px; }");
        expect(siteHeader).toContain("M12 .9a11.1 11.1 0 0 0-3.51 21.63");
        expect(siteHeader).toContain("landing-header-divider");
        expect(siteHeader).not.toContain("label: \"GitHub\"");
        expect(contents.get("Documentation/Source/layouts/ApiPackageLayout.astro"))
            .toContain(".docs-api-module-card:hover, .docs-api-module-card:focus-visible { background: var(--docs-code-background)");
        const apiIndex = contents.get("Documentation/Source/pages/api/index.astro") ?? "";
        expect(apiIndex).not.toContain("record.packageDescription === undefined ? null : <p>{record.packageDescription}</p>");
        expect(apiIndex).toContain(".docs-api-package-card, .docs-api-package-card * { text-decoration: none !important; }");
        expect(apiIndex).toContain(".docs-api-package-card h2 { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1rem; margin: 0; }");
        expect(apiReferenceLayout).toContain("{packageModules.length > 1 ? moduleGroups.map((group) => <section class=\"docs-sidebar-group\">");
        expect(apiReferenceLayout).toContain(".docs-api-title-row { align-items: baseline; display: flex; gap: 24px; justify-content: space-between; }");
        expect(apiReferenceLayout).toContain(".docs-api-title-row h1 { font-weight: 700; }");
        expect(apiReferenceLayout).toContain(".docs-api-page .docs-toc .docs-nav-items a { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }");
        expect(contents.has("Documentation/Source/data/ApiReference.json")).toBe(true);
    });
    it("generates the ported Astro landing composition and interactive components", () =>
    {
        const website = createGeneratedWebsite({ target: "generated" });
        const contents = new Map(
            website.files.map((file: GeneratedWebsiteFile) => [ file.path, file.content ])
        );
        const landingPackage = JSON.parse(contents.get("Landing/package.json") ?? "{}");
        const documentationPackage = JSON.parse(contents.get("Documentation/package.json") ?? "{}");
        const landingTsconfig = JSON.parse(contents.get("Landing/tsconfig.json") ?? "{}");
        expect(landingTsconfig.compilerOptions.moduleResolution).toBe("Bundler");
        expect(landingPackage.scripts).toEqual({
            build: "node scripts/generate-favicons.mjs && astro build",
            check: "astro check",
            dev: "astro dev --host 127.0.0.1 --port 4173",
            verify: "astro check"
        });
        expect(contents.has("Landing/Source/main.tsx")).toBe(false);
        expect(contents.has("Landing/vite.config.ts")).toBe(false);
        expect(contents.get("Landing/astro.config.mjs")).toContain("outDir: \"./Distribution\"");
        expect(contents.get("Landing/Source/pages/index.astro")).toContain(
            "import BaseLayout from \"../layouts/BaseLayout.astro\""
        );
        expect(contents.get("Landing/Source/pages/index.astro")).not.toContain("@/layouts/");
        expect(contents.get("Landing/Source/components/landing/sections/LandingHero.astro"))
            .toContain("@lucide/astro/icons/arrow-right");
        expect(contents.get("Landing/Source/components/landing/LandingPage.astro"))
            .toContain("LandingCallToAction");
        expect(contents.get("Landing/Source/components/landing/sections/LandingProblem.astro"))
            .toContain("LandingComplexityChart");
        const generatedSearchPalette =
            contents.get("Landing/Source/components/SearchPalette.astro") ?? "";
        expect(generatedSearchPalette).toContain("<span class=\"search-shortcut-plus\">+</span>");
        expect(generatedSearchPalette).toContain("background: var(--card-background)");
        expect(generatedSearchPalette).toContain("pagefind-ui__search-input:focus");
        expect(generatedSearchPalette).toContain("pagefind-ui__result:hover");
        expect(generatedSearchPalette).toContain("document.body.append(dialog)");
        expect(contents.get("Landing/Source/components/landing/LandingHeader.astro"))
            .toContain("<span class=\"search-shortcut-plus\">+</span>");
        expect(contents.get("Landing/Source/components/landing/LandingHeader.astro"))
            .toContain("<span>{name}</span>");
        expect(contents.get("Landing/Source/styles/landing.css"))
            .toContain(".landing-brand { display: inline-flex; align-items: center; flex: 0 0 auto; gap: .625rem; font-weight: 650; }");
        expect(contents.get("Landing/Source/components/landing/sections/LandingQuotes.astro"))
            .toContain(".effect-landing-quote-button");
        expect(contents.get("Landing/Source/components/landing/LandingInstallCommand.astro"))
            .toMatch(/npm[\s\S]*pnpm[\s\S]*yarn[\s\S]*bun[\s\S]*deno/);
        expect(contents.get("Landing/Source/components/landing/LandingInstallCommand.astro"))
            .toContain("fallbackCopy(value)");
        expect(contents.get("Landing/Source/components/landing/LandingGridRails.astro"))
            .toContain("landing-grid-rails");
        expect(contents.get("Landing/Source/styles/tokens.css"))
            .toContain("[data-theme=\"dark\"]");
        expect(contents.get("Landing/Source/styles/tokens.css"))
            .toContain("--card-background: oklch(0.985 0 0);");
        expect(documentationPackage.dependencies).toMatchObject({
            "@tailwindcss/typography": "0.5.20",
            "@tailwindcss/vite": "4.3.3",
            tailwindcss: "4.3.3"
        });
        expect(contents.get("Documentation/astro.config.mjs"))
            .toContain("vite: { plugins: [ tailwindcss() ] }");
        expect(contents.get("Documentation/Source/layouts/DocsLayout.astro"))
            .toContain("class=\"docs-prose prose prose-effect\"");
        expect(contents.get("Documentation/Source/pages/index.astro"))
            .toContain("<h1>{title}</h1>");
        const generatedDocsCss = contents.get("Documentation/Source/styles/docs.css") ?? "";
        expect(generatedDocsCss).toContain("@plugin \"@tailwindcss/typography\"");
        expect(generatedDocsCss).toContain("--tw-prose-body: var(--docs-prose-foreground)");
        expect(generatedDocsCss).toContain("--tw-prose-pre-bg: var(--docs-card-background)");
        expect(generatedDocsCss).toContain("--docs-prose-foreground: oklch(0.37 0.013 285.805)");
        expect(generatedDocsCss).toContain("--docs-prose-foreground: oklch(0.871 0.006 286.286)");
        expect(generatedDocsCss).not.toContain("{{LIGHT_");
        expect(generatedDocsCss).not.toContain("{{DARK_");
        expect(contents.get("Documentation/package.json")).toContain("pagefind --site dist --output-path dist/pagefind");
        expect(contents.get("Documentation/Source/layouts/DocsLayout.astro")).toContain("class=\"docs-prose prose prose-effect\"");
        expect(contents.get("Documentation/Source/layouts/ApiReferenceLayout.astro"))
            .toContain("data-theme-favicon=\"light\"");
        expect(contents.get("Documentation/Source/layouts/ApiPackageLayout.astro"))
            .toContain("data-theme-favicon=\"dark\"");
        expect(contents.get("Documentation/Source/layouts/DocsLayout.astro")).toContain("<SiteHeader");
        expect(contents.get("Documentation/Source/components/SiteHeader.astro")).toContain("<SearchPalette />");
        expect(contents.get("Documentation/Source/components/SiteHeader.astro")).toContain("<SiteThemeToggle />");
        expect(contents.get("Documentation/Source/components/SiteHeader.astro")).toContain("<VersionDropdown");
        expect(contents.get("Documentation/Source/components/SearchPalette.astro")).toContain("<span class=\"search-shortcut-plus\">+</span>");
        expect(contents.get("Documentation/Source/components/SearchPalette.astro")).toContain("background: var(--docs-card-background)");
        expect(contents.get("Documentation/Source/components/VersionDropdown.astro")).toContain("v${item.version ?? item.id.replace(/^v/u, \"\")} (Latest)");
        expect(contents.get("Documentation/Source/Versions.ts")).not.toContain("{{VERSIONS_ESCAPED}}");
        expect(contents.get("Documentation/Source/components/SearchPalette.astro")).toContain("bundlePath: \"/docs/pagefind/\"");
    });
    it("interpolates site identity, routes, actions, and theme tokens into the Astro landing source", () =>
    {
        const website = createGeneratedWebsite({
            config: {
                landing: {
                    description: "A widget docs starter.",
                    primaryAction: { href: "/start", label: "Start here" },
                    sections: [],
                    title: "Widget Documentation"
                },
                metadata: {
                    description: "Widget docs.",
                    logo: "/assets/widget.svg",
                    name: "@example/widget",
                    repository: { url: "https://github.com/example/widget" },
                    title: "Widget",
                    url: "https://example.test"
                },
                routing: { documentationPrefix: "/reference", storybookPrefix: "/stories" },
                storybook: { enabled: true },
                tokens: { light: { accent: "#f00", proseForeground: "#222" } }
            },
            target: "generated"
        });
        const contents = new Map(
            website.files.map((file: GeneratedWebsiteFile) => [ file.path, file.content ])
        );
        expect(contents.get("Landing/Source/pages/index.astro")).toContain("logo: \"/assets/widget.svg\"");
        expect(contents.get("Landing/Source/pages/index.astro")).toContain("name: \"@example/widget\"");
        expect(contents.get("Landing/Source/pages/index.astro")).toContain("Widget Documentation");
        expect(contents.get("Landing/Source/pages/index.astro")).toContain("href: \"/reference/v1/onboarding/introduction\"");
        expect(contents.get("Landing/Source/pages/index.astro")).toContain("primaryCta: {\"href\":\"/start\",\"label\":\"Start here\"}");
        expect(contents.get("Landing/Source/pages/index.astro")).toContain("href: \"/stories/\"");
        expect(contents.get("Landing/Source/pages/index.astro")).toContain("question: \"What does the package render?\"");
        expect(contents.get("Landing/Source/lib/landing.ts")).not.toContain("LANDING_CONFIG");
        expect(contents.get("Landing/Source/styles/tokens.css")).toContain("--accent: #f00;");
        expect(contents.get("Documentation/Source/styles/docs.css"))
            .toContain("--docs-accent: #f00;");
        expect(contents.get("Documentation/Source/styles/docs.css"))
            .toContain("--docs-prose-foreground: #222;");
        expect(contents.get("Documentation/Source/components/SearchPalette.astro"))
            .toContain("bundlePath: \"/reference/pagefind/\"");
        expect(contents.get("Documentation/Source/layouts/DocsLayout.astro"))
            .toContain("const docsPrefix = \"/reference\";");
        expect(contents.get("Landing/Source/components/SearchPalette.astro"))
            .toContain("bundlePath: \"/reference\" + \"/pagefind/\"");
        expect(contents.get("Landing/astro.config.mjs")).toContain("\"/reference\"");
        expect(contents.get("Landing/astro.config.mjs")).toContain("\"/stories\"");
        expect(contents.get("Landing/astro.config.mjs")).toContain("\"/reference\":");
        expect(contents.get("Landing/astro.config.mjs")).not.toContain("\"\"/reference\"\"");
    });
    it("generates DiceBear logos, theme-aware favicons, and permissive logo props", () =>
    {
        const website = createGeneratedWebsite({
            config: {
                metadata: {
                    logo: {
                        props: { backgroundColor: { dark: "#111111", light: "#ffffff" } },
                        type: "dicebear"
                    },
                    name: "Example",
                    title: "Example",
                    description: "Example site",
                    url: "https://example.test"
                }
            },
            target: "generated"
        });
        const contents = new Map(website.files.map((file: GeneratedWebsiteFile) => [ file.path, file.content ]));
        expect(contents.get("Landing/Source/components/landing/LandingHeader.astro"))
            .toContain("data-avatar-theme=\"dark\"");
        const generatedDocsHeader = contents.get("Documentation/Source/components/SiteHeader.astro") ?? "";
        expect(generatedDocsHeader).toContain("<span>{name}</span>");
        expect(generatedDocsHeader).toContain("\"style\":\"pixelbot\"");
        expect(generatedDocsHeader).toContain("\"backgroundColor\":{\"dark\":\"#111111\",\"light\":\"#ffffff\"}");
        expect(contents.get("Landing/scripts/generate-favicons.mjs"))
            .toContain("query.set(\"tags\", \"!animation\")");
        expect(contents.get("Documentation/scripts/generate-favicons.mjs"))
            .toContain("favicon-${theme}.svg");
        expect(contents.get("Landing/package.json")).toContain("generate-favicons.mjs && astro build");
        expect(contents.get("Documentation/package.json")).toContain("generate-favicons.mjs && astro build");
        expect(contents.get("Documentation/Source/layouts/DocsLayout.astro"))
            .toContain("data-theme-favicon=\"light\"");
        const schema = JSON.parse(readFileSync(
            new URL("../../../Documentation/Landing/public/docs.config.schema.json", import.meta.url),
            "utf8"
        )) as { $defs: { dicebearLogo: { properties: { props: { type: string } } } } };
        expect(schema.$defs.dicebearLogo.properties.props.type).toBe("object");
        expect(schema.$defs.dicebearLogo.properties.props).not.toHaveProperty("properties");
    });
    it("generates Landing and Documentation without Storybook by default", () =>
    {
        const website = createGeneratedWebsite({
            generatedAt: "2026-09-24T00:00:00.000Z",
            revision: "abc123",
            target: "generated"
        });
        expect(
            website.packages.map(
                (item: GeneratedWebsitePackage) => item.directory
            )
        ).toEqual([ "Landing", "Documentation" ]);
        expect(
            website.files.some((file: GeneratedWebsiteFile) =>
                file.path.startsWith("Storybook/")
            )
        ).toBe(false);
        expect(
            website.files.some((file: GeneratedWebsiteFile) =>
                file.path === "Documentation/Source/pages/search.astro"
            )
        ).toBe(false);
        const generatedConfig = JSON.parse(
            website.files.find((file: GeneratedWebsiteFile) =>
                file.path === "docs.config.json"
            )?.content ?? "{}"
        );
        expect(generatedConfig.versions[0]).toMatchObject({
            label: "v1 (Latest)",
            version: "1"
        });
        expect(
            website.files.find(
                (file: GeneratedWebsiteFile) =>
                    file.path === "Landing/RouteManifest.json"
            )?.content
        ).not.toContain("storybook");
        expect(
            website.files.find(
                (file: GeneratedWebsiteFile) =>
                    file.path === "Landing/vercel.json"
            )?.content
        ).toContain("/docs/:path*");
        const documentationVercel = JSON.parse(
            website.files.find(
                (file: GeneratedWebsiteFile) =>
                    file.path === "Documentation/vercel.json"
            )?.content ?? "{}"
        );
        expect(documentationVercel.rewrites).toEqual([
            { destination: "/", source: "/docs" },
            { destination: "/:path*", source: "/docs/:path*" }
        ]);
        expect(
            website.files.some(
                (file: GeneratedWebsiteFile) =>
                    file.path === "VercelProjects.snapshot.json"
            )
        ).toBe(true);
    });
    it("labels the configured current documentation version as latest", () =>
    {
        const website = createGeneratedWebsite({
            config: {
                versions: [
                    {
                        current: true,
                        directory: ".",
                        id: "current",
                        label: "Current",
                        order: 0,
                        version: "4"
                    },
                    {
                        current: false,
                        directory: "v3",
                        id: "v3",
                        label: "v3",
                        order: 1,
                        version: "3"
                    }
                ]
            },
            target: "generated"
        });
        const generatedConfig = JSON.parse(
            website.files.find((file: GeneratedWebsiteFile) =>
                file.path === "docs.config.json"
            )?.content ?? "{}"
        );
        expect(generatedConfig.versions).toEqual([
            expect.objectContaining({ id: "current", label: "v4 (Latest)", version: "4" }),
            expect.objectContaining({ id: "v3", label: "v3", version: "3" })
        ]);
        expect(
            website.files.some((file: GeneratedWebsiteFile) =>
                file.path === "Documentation/Source/pages/search.astro"
            )
        ).toBe(false);
    });
    it("generates the optional Storybook package with a matching base path", () =>
    {
        const website = createGeneratedWebsite({
            config: {
                routing: {
                    documentationPrefix: "/reference",
                    storybookPrefix: "/workbench"
                },
                storybook: { enabled: true }
            },
            generatedAt: "2026-09-24T00:00:00.000Z",
            revision: "abc123",
            target: "generated"
        });
        expect(
            website.packages.map(
                (item: GeneratedWebsitePackage) => item.directory
            )
        ).toEqual([ "Landing", "Documentation", "Storybook" ]);
        const storybookConfig = website.files.find(
            (file: GeneratedWebsiteFile) =>
                file.path === "Storybook/.storybook/main.ts"
        )?.content;
        expect(storybookConfig).toContain(
            "? \"/workbench/\""
        );
        expect(website.config.vercel.projects.storybook?.routePrefix).toBe(
            "/workbench"
        );
        expect(
            website.files.some(
                (file: GeneratedWebsiteFile) =>
                    file.path === "Storybook/vercel.snapshot.json"
            )
        ).toBe(true);
        const storybookVercel = JSON.parse(website.files.find(
            (file: GeneratedWebsiteFile) => file.path === "Storybook/vercel.json"
        )?.content ?? "{}");
        expect(storybookVercel.redirects).toEqual([
            { destination: "/workbench/", source: "/workbench", statusCode: 301 }
        ]);
        expect(storybookVercel.rewrites).toEqual([
            { destination: "/", source: "/workbench" },
            { destination: "/:path*", source: "/workbench/:path*" }
        ]);
        const landingVercel = JSON.parse(website.files.find(
            (file: GeneratedWebsiteFile) => file.path === "Landing/vercel.json"
        )?.content ?? "{}");
        expect(landingVercel.redirects).toContainEqual({
            destination: "/workbench/",
            source: "/workbench",
            statusCode: 301
        });
    });
    it("generates the optional MCP function package without adding a Landing route", () =>
    {
        const website = createGeneratedWebsite({
            config: {
                agent: { mcp: { enabled: true } },
                metadata: { url: "https://example.test" }
            },
            target: "generated"
        });
        expect(
            website.packages.map(
                (item: GeneratedWebsitePackage) => item.directory
            )
        ).toEqual([ "Landing", "Documentation", "Mcp" ]);
        expect(
            website.files.some(
                (file: GeneratedWebsiteFile) =>
                    file.path.startsWith("Mcp/") &&
                    file.path.endsWith("api/index.mjs")
            )
        ).toBe(true);
        expect(
            website.files.find(
                (file: GeneratedWebsiteFile) =>
                    file.path === "Landing/vercel.json"
            )?.content
        ).not.toContain("mcp");
        expect(website.config.mcpEndpoint).toBe("https://mcp.example.test");
    });
});
