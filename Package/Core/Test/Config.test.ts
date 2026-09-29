/**
 *
 *
 * @module @sorrell/docs-core/Test/config.test
 *
 * @file      Config.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    DocsConfigError,
    decodeDocsConfig,
    decodeDocsConfigEffect,
    decodeDocsConfigSync
} from "../Source/index.js";
import { Effect, Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { VercelReleaseManifestSchema } from "../Source/Schemas.js";
describe("docs-core configuration", () =>
{
    it("decodes and normalizes a minimal configuration deterministically", () =>
    {
        const config = decodeDocsConfigSync({ metadata: { name: "Example" } });
        expect(config.metadata.title).toBe("Example");
        expect(config.versions).toEqual([
            {
                current: true,
                directory: ".",
                id: "current",
                label: "Current",
                order: 0
            }
        ]);
        expect(config.api.enabled).toBe(false);
        expect(config.footer.columns).toEqual([
            { links: [ { href: "/docs/", label: "Documentation" } ], title: "Resources" }
        ]);
        expect(config.footer.message).toBe("© {year} Example");
        expect(config.tokens.dark.codeBackground).toBe("oklch(0.274 0.006 286.033)");
        expect(config.tokens.light.proseForeground).toBe("oklch(0.37 0.013 285.805)");
        expect(config.tokens.dark.proseForeground).toBe("oklch(0.871 0.006 286.286)");
        expect(config.tokens.light.cardBackground).toBe("oklch(0.985 0 0)");
        expect(config.tokens.dark.subtleForeground).toBe("oklch(0.552 0.016 285.938)");
        expect(config.routing).toEqual({
            documentationPrefix: "/docs",
            storybookPrefix: "/storybook"
        });
        expect(config.agent).toEqual({
            enabled: true,
            essentials: [],
            mcp: { enabled: false },
            skill: { enabled: false, name: "example" }
        });
        expect(config.mcpEndpoint).toBe("https://mcp.localhost");
        expect(config.vercel.projects.landing.directory).toBe("Landing");
        expect(config.vercel.projects.documentation.routePrefix).toBe("/docs");
        expect(config.vercel.projects.storybook).toBeUndefined();
    });
    it("normalizes custom footer columns, message, and lower links", () =>
    {
        const config = decodeDocsConfigSync({
            footer: {
                columns: [
                    { title: "Resources", links: [ { href: "/docs/", label: "Docs" } ] }
                ],
                links: [
                    { href: "https://github.com/example/site", icon: "github", label: "GitHub" }
                ],
                message: "© {year} {name}"
            },
            metadata: { name: "Example" }
        });
        expect(config.footer).toEqual({
            columns: [
                { title: "Resources", links: [ { href: "/docs/", label: "Docs" } ] }
            ],
            links: [
                { href: "https://github.com/example/site", icon: "github", label: "GitHub" }
            ],
            message: "© {year} {name}"
        });
    });
    it("accepts open-ended DiceBear logo props and defaults its style to pixelbot", () =>
    {
        const config = decodeDocsConfigSync({
            metadata: {
                logo: {
                    props: {
                        backgroundColor: { dark: "#111111", light: "#ffffff" },
                        seed: "example"
                    },
                    type: "dicebear"
                },
                name: "Example"
            }
        });
        expect(config.metadata.logo).toEqual({
            props: {
                backgroundColor: { dark: "#111111", light: "#ffffff" },
                seed: "example"
            },
            style: "pixelbot",
            type: "dicebear"
        });
    });
    it("normalizes custom routes and Vercel project metadata", () =>
    {
        const config = decodeDocsConfigSync({
            metadata: { name: "Example" },
            routing: {
                documentationPrefix: "/reference",
                storybookPrefix: "/workbench"
            },
            storybook: { enabled: true },
            vercel: {
                projects: {
                    documentation: { project: "example-documentation" },
                    landing: { project: "example-landing" },
                    storybook: {
                        origin: "https://storybook.example.test",
                        project: "example-storybook"
                    }
                }
            }
        });
        expect(config.vercel.projects.landing.project).toBe("example-landing");
        expect(config.vercel.projects.documentation.routePrefix).toBe(
            "/reference"
        );
        expect(config.vercel.projects.storybook?.origin).toBe(
            "https://storybook.example.test"
        );
    });
    it("normalizes the MCP endpoint and project when MCP is enabled", () =>
    {
        const config = decodeDocsConfigSync({
            agent: { mcp: { enabled: true } },
            metadata: { name: "Example", url: "https://www.example.test" }
        });
        expect(config.mcpEndpoint).toBe("https://mcp.example.test");
        expect(config.vercel.projects.mcp?.directory).toBe("Mcp");
    });
    it("rejects invalid or overlapping application routes", () =>
    {
        const invalid = decodeDocsConfig({
            metadata: { name: "Example" },
            routing: {
                documentationPrefix: "docs",
                storybookPrefix: "/storybook"
            }
        });
        expect(Result.isFailure(invalid)).toBe(true);
        if (Result.isFailure(invalid))
        {
            expect(
                invalid.failure.diagnostics.some(
                    (diagnostic: DocsConfigDiagnostic) =>
                        diagnostic.path.join(".") ===
                        "routing.documentationPrefix"
                )
            ).toBe(true);
        }
        const overlapping = decodeDocsConfig({
            metadata: { name: "Example" },
            routing: {
                documentationPrefix: "/docs",
                storybookPrefix: "/docs/storybook"
            }
        });
        expect(Result.isFailure(overlapping)).toBe(true);
        if (Result.isFailure(overlapping))
        {
            expect(
                overlapping.failure.diagnostics.some(
                    (diagnostic: DocsConfigDiagnostic) =>
                        diagnostic.path.join(".") === "routing"
                )
            ).toBe(true);
        }
    });
    it("requires a product-skill description and normalizes its name", () =>
    {
        const invalid = decodeDocsConfig({
            agent: { skill: { enabled: true } },
            metadata: { name: "Example" }
        });
        expect(Result.isFailure(invalid)).toBe(true);
        if (Result.isFailure(invalid))
        {
            expect(
                invalid.failure.diagnostics.some(
                    (diagnostic: DocsConfigDiagnostic) =>
                        diagnostic.path.join(".") === "agent.description"
                )
            ).toBe(true);
        }
        const config = decodeDocsConfigSync({
            agent: {
                description: "Example product docs.",
                skill: { enabled: true }
            },
            metadata: { name: "Example Product" }
        });
        expect(config.agent.skill.name).toBe("example-product");
    });
    it("reports schema paths and cross-field paths", () =>
    {
        const invalid = decodeDocsConfig({
            metadata: { name: 42 },
            redirects: [ { from: "old", to: "new" } ]
        });
        expect(Result.isFailure(invalid)).toBe(true);
        if (Result.isFailure(invalid))
        {
            expect(invalid.failure).toBeInstanceOf(DocsConfigError);
            expect(
                invalid.failure.diagnostics.some(
                    (diagnostic: DocsConfigDiagnostic) =>
                        diagnostic.path.join(".") === "metadata.name"
                )
            ).toBe(true);
        }
        const crossField = decodeDocsConfig({
            metadata: { name: "Example" },
            redirects: [ { from: "old", to: "/new" } ]
        });
        expect(Result.isFailure(crossField)).toBe(true);
        if (Result.isFailure(crossField))
        {
            expect(crossField.failure.diagnostics[0]?.path).toEqual([
                "redirects",
                0,
                "from"
            ]);
        }
    });
    it("is available as an Effect without importing Node services", async () =>
    {
        const value = await Effect.runPromise(
            decodeDocsConfigEffect({ metadata: { name: "Example" } })
        );
        expect(value.metadata.name).toBe("Example");
    });
    it("decodes a release manifest for the independently deployed packages", () =>
    {
        const manifest = Schema.decodeUnknownSync(VercelReleaseManifestSchema)({
            apiSnapshot: "snapshot-1",
            deployments: {
                documentation: {
                    deploymentId: "documentation-1",
                    project: "example-documentation",
                    url: "https://documentation.vercel.app"
                },
                landing: {
                    deploymentId: "landing-1",
                    project: "example-landing",
                    url: "https://landing.vercel.app"
                },
                storybook: {
                    deploymentId: "storybook-1",
                    project: "example-storybook",
                    url: "https://storybook.vercel.app"
                }
            },
            generatedAt: "2026-09-23T00:00:00.000Z",
            landingConfig: { redirects: [], rewrites: [], version: 2 },
            mode: "production",
            publicUrl: "https://example.vercel.app",
            releaseId: "release-1",
            revision: "abc123",
            routes: {
                documentationPrefix: "/docs",
                storybookPrefix: "/storybook"
            },
            version: 2
        });
        expect(manifest.deployments.documentation.url).toBe(
            "https://documentation.vercel.app"
        );
    });
});
