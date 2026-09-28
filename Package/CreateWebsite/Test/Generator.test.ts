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

import { describe, expect, it } from "vitest";
import { createGeneratedWebsite } from "../Source/Generator.js";
describe("three-package website generation", () =>
{
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
            build: "astro build",
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
        expect(contents.get("Documentation/Source/layouts/DocsLayout.astro")).toContain("<SiteHeader");
        expect(contents.get("Documentation/Source/components/SiteHeader.astro")).toContain("<SearchPalette />");
        expect(contents.get("Documentation/Source/components/SiteHeader.astro")).toContain("<SiteThemeToggle />");
        expect(contents.get("Documentation/Source/components/SiteHeader.astro")).toContain("<VersionDropdown");
        expect(contents.get("Documentation/Source/components/SearchPalette.astro")).toContain("<span class=\"search-shortcut-plus\">+</span>");
        expect(contents.get("Documentation/Source/components/SearchPalette.astro")).toContain("background: var(--docs-card-background)");
        expect(contents.get("Documentation/Source/components/VersionDropdown.astro")).toContain("v${item.version ?? item.id.replace(/^v/u, \"\")} (Latest)");
        expect(contents.get("Documentation/Source/Versions.ts")).not.toContain("{{VERSIONS}}");
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
