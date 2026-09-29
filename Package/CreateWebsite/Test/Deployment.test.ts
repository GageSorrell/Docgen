/**
 *
 *
 * @module @sorrell/docs-create-website/Test/Deployment.test
 *
 * @file      Deployment.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    AtomicWriter,
    DocsFileSystem,
    DocsIntegrationError,
    DocsPath,
    NetworkRetry,
    VercelService
} from "@sorrell/docs-cli";
import { Effect, Layer } from "effect";
import {
    type WebsiteReleaseManifest,
    deployWebsite,
    promoteWebsite,
    rollbackWebsite,
    verifyWebsiteDeployment,
    writeReleaseManifest
} from "../Source/Deployment.js";
import { describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createGeneratedWebsite } from "../Source/Generator.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
const manifest = (
    releaseId: string,
    landingUrl: string
): WebsiteReleaseManifest => ({
    deployments: {
        documentation: {
            deploymentId: `${releaseId}-docs`,
            project: "documentation",
            url: "https://docs.vercel.app"
        },
        landing: {
            deploymentId: `${releaseId}-landing`,
            project: "landing",
            url: landingUrl
        }
    },
    generatedAt: "2026-09-24T00:00:00.000Z",
    landingConfig: { redirects: [], rewrites: [], version: 2 },
    mode: "production",
    publicUrl: landingUrl,
    releaseId,
    revision: releaseId,
    routes: { documentationPrefix: "/docs", storybookPrefix: "/storybook" },
    version: 2
});
describe("website deployment orchestration", () =>
{
    it("stages the Documentation config inside its Vercel project root", async () =>
    {
        const workspace = await mkdtemp(join(tmpdir(), "sorrell-deploy-config-"));
        const target = join(workspace, "generated");
        await mkdir(join(workspace, "Package/Core"), { recursive: true });
        await writeFile(join(workspace, "Package/Core/package.json"), "{}\n");
        await mkdir(join(target, "Documentation/Source/components"), { recursive: true });
        await mkdir(join(target, "Documentation/Source/layouts"), { recursive: true });
        await mkdir(join(target, "Documentation/dist"), { recursive: true });
        await mkdir(join(target, "Landing/Source/pages"), { recursive: true });
        await mkdir(join(target, "Landing/Source/components"), { recursive: true });
        await writeFile(
            join(target, "Documentation/Source/Versions.ts"),
            "import config from \"../../docs.config.json\";\n"
        );
        await writeFile(
            join(target, "Documentation/Source/components/SiteHeader.astro"),
            "import config from \"../../../docs.config.json\";\n"
        );
        await writeFile(
            join(target, "Documentation/Source/components/Footer.astro"),
            "import config from \"../../../docs.config.json\";\n"
        );
        for (const layout of [ "ApiPackageLayout.astro", "ApiReferenceLayout.astro", "DocsLayout.astro" ])
        {
            await writeFile(
                join(target, "Documentation/Source/layouts", layout),
                "import config from \"../../../docs.config.json\";\n"
            );
        }
        await writeFile(join(target, "Documentation/package.json"), "{}\n");
        await writeFile(
            join(target, "Landing/Source/pages/index.astro"),
            "import config from \"../../../docs.config.json\";\n"
        );
        await writeFile(
            join(target, "Landing/Source/components/Footer.astro"),
            "import config from \"../../../docs.config.json\";\n"
        );
        await writeFile(join(target, "Landing/package.json"), "{}\n");

        const website = createGeneratedWebsite({
            config: {
                vercel: {
                    projects: {
                        documentation: {
                            directory: "Documentation",
                            project: "documentation"
                        },
                        landing: { directory: "Landing", project: "landing" }
                    }
                }
            },
            target
        });
        const generatedConfig = website.files.find(
            (file) => file.path === "docs.config.json"
        )?.content ?? "{}\n";
        await writeFile(join(target, "docs.config.json"), generatedConfig);

        let stagedConfig = "";
        let stagedVersions = "";
        let stagedSiteHeader = "";
        let stagedDocumentationFooter = "";
        let stagedLandingConfig = "";
        let stagedLandingIndex = "";
        let stagedLandingFooter = "";
        const stagedLayoutImports = new Map<string, string>();
        const layer = Layer.succeed(
            VercelService,
            VercelService.of({
                alias: () => Effect.void,
                deploy: (directory: string, options?: { readonly name?: string }) =>
                    Effect.sync(() =>
                    {
                        if (options?.name === "documentation")
                        {
                            stagedConfig = readFileSync(
                                join(directory, "docs.config.json"),
                                "utf8"
                            );
                            stagedVersions = readFileSync(
                                join(directory, "Source/Versions.ts"),
                                "utf8"
                            );
                            stagedSiteHeader = readFileSync(
                                join(directory, "Source/components/SiteHeader.astro"),
                                "utf8"
                            );
                            stagedDocumentationFooter = readFileSync(
                                join(directory, "Source/components/Footer.astro"),
                                "utf8"
                            );
                            for (const layout of [ "ApiPackageLayout.astro", "ApiReferenceLayout.astro", "DocsLayout.astro" ])
                            {
                                stagedLayoutImports.set(
                                    layout,
                                    readFileSync(join(directory, "Source/layouts", layout), "utf8")
                                );
                            }
                        }
                        if (options?.name === "landing")
                        {
                            stagedLandingConfig = readFileSync(
                                join(directory, "docs.config.json"),
                                "utf8"
                            );
                            stagedLandingIndex = readFileSync(
                                join(directory, "Source/pages/index.astro"),
                                "utf8"
                            );
                            stagedLandingFooter = readFileSync(
                                join(directory, "Source/components/Footer.astro"),
                                "utf8"
                            );
                        }
                        const url = `https://${options?.name ?? "site"}.vercel.app`;
                        return { deploymentId: url, raw: url, url };
                    }),
                inspect: (deployment: string) =>
                    Effect.succeed({
                        deploymentId: deployment,
                        raw: "ready",
                        state: "READY" as const,
                        url: deployment
                    }),
                promote: () => Effect.void,
                remove: () => Effect.void,
                rollback: () => Effect.void
            })
        );

        try
        {
            await Effect.runPromise(deployWebsite(website).pipe(Effect.provide(layer)));
            expect(stagedConfig).toContain("\"versions\"");
            expect(stagedVersions).toContain("\"../docs.config.json\"");
            expect(stagedVersions).not.toContain("\"../../docs.config.json\"");
            expect(stagedSiteHeader).toContain("\"../../docs.config.json\"");
            expect(stagedSiteHeader).not.toContain("\"../../../docs.config.json\"");
            expect(stagedDocumentationFooter).toContain("\"../../docs.config.json\"");
            expect(stagedDocumentationFooter).not.toContain("\"../../../docs.config.json\"");
            for (const source of stagedLayoutImports.values())
            {
                expect(source).toContain("\"../../docs.config.json\"");
                expect(source).not.toContain("\"../../../docs.config.json\"");
            }
            expect(stagedLandingConfig).toContain("\"metadata\"");
            expect(stagedLandingIndex).toContain("\"../../docs.config.json\"");
            expect(stagedLandingIndex).not.toContain("\"../../../docs.config.json\"");
            expect(stagedLandingFooter).toContain("\"../../docs.config.json\"");
            expect(stagedLandingFooter).not.toContain("\"../../../docs.config.json\"");
        }
        finally
        {
            await rm(workspace, { force: true, recursive: true });
        }
    });
    it("promotes every child deployment before Landing", async () =>
    {
        const base = manifest("release-1", "https://landing.vercel.app");
        const release: WebsiteReleaseManifest = {
            ...base,
            deployments: {
                ...base.deployments,
                mcp: {
                    deploymentId: "release-1-mcp",
                    project: "mcp",
                    url: "https://mcp.vercel.app"
                },
                storybook: {
                    deploymentId: "release-1-storybook",
                    project: "storybook",
                    url: "https://storybook.vercel.app"
                }
            },
            mcpEndpoint: "https://mcp.docs.sorrell.sh"
        };
        const events: Array<string> = [];
        const layer = Layer.succeed(
            VercelService,
            VercelService.of({
                alias: (deployment: string, alias: string) =>
                    Effect.sync(() =>
                    {
                        events.push(`alias:${deployment}:${alias}`);
                    }),
                deploy: () => Effect.die("unused"),
                inspect: (deployment: string) =>
                    Effect.succeed({
                        deploymentId: deployment,
                        raw: "ready",
                        state: "READY" as const,
                        url: deployment
                    }),
                promote: (deployment: string) =>
                    Effect.sync(() =>
                    {
                        events.push(`promote:${deployment}`);
                    }),
                remove: () => Effect.void,
                rollback: () => Effect.void
            })
        );

        await Effect.runPromise(
            promoteWebsite(release).pipe(Effect.provide(layer))
        );

        expect(events).toEqual([
            "promote:release-1-docs",
            "promote:release-1-storybook",
            "alias:release-1-mcp:mcp.docs.sorrell.sh",
            "promote:release-1-mcp",
            "promote:release-1-landing"
        ]);
    });
    it("deploys children before Landing and keeps Documentation local", async () =>
    {
        const target = await mkdtemp(join(tmpdir(), "sorrell-deploy-"));
        await mkdir(join(target, "Documentation"));
        await mkdir(join(target, "Storybook"));
        await mkdir(join(target, "Landing"));
        const order: Array<string> = [];
        const destinations: Array<{ directory: string; project?: string }> = [];
        const layer = Layer.succeed(
            VercelService,
            VercelService.of({
                alias: () => Effect.void,
                deploy: (
                    directory: string,
                    options?: { readonly name?: string }
                ) =>
                    Effect.sync(() =>
                    {
                        const project =
                            directory.split(/[\\/]/).at(-1) ?? "unknown";
                        order.push(project);
                        destinations.push({
                            directory,
                            ...(options?.name === undefined
                                ? {}
                                : { project: options.name })
                        });
                        const url = `https://${project.toLowerCase()}.vercel.app`;
                        return { deploymentId: url, raw: url, url };
                    }),
                inspect: (deployment: string) =>
                    Effect.succeed({
                        deploymentId: deployment,
                        raw: "ready",
                        state: "READY" as const,
                        url: deployment
                    }),
                promote: () => Effect.void,
                remove: () => Effect.void,
                rollback: () => Effect.void
            })
        );
        const result = await Effect.runPromise(
            deployWebsite(
                createGeneratedWebsite({
                    config: {
                        storybook: { enabled: true },
                        vercel: {
                            projects: {
                                documentation: {
                                    directory: "Documentation",
                                    project: "documentation"
                                },
                                landing: {
                                    directory: "Landing",
                                    project: "sorrell-documentation-landing"
                                },
                                storybook: {
                                    directory: "Storybook",
                                    project: "sorrell-documentation-storybook"
                                }
                            }
                        }
                    },
                    target
                })
            ).pipe(Effect.provide(layer))
        );
        expect(order).toEqual([ "Documentation", "Storybook", "Landing" ]);
        expect(destinations.map(({ directory, project }) => ({
            directory: directory.split(/[\\/]/).at(-1),
            project
        }))).toEqual([
            { directory: "Documentation", project: "documentation" },
            {
                directory: "Storybook",
                project: "sorrell-documentation-storybook"
            },
            {
                directory: "Landing",
                project: "sorrell-documentation-landing"
            }
        ]);
        expect(destinations[0]?.directory).toBe(join(target, "Documentation"));
        expect(result.deployments.landing.url).toBe(
            "https://landing.vercel.app"
        );
        const landingConfig = await readFile(
            join(target, "Landing/vercel.json"),
            "utf8"
        );
        expect(landingConfig).toContain("https://storybook.vercel.app/:path*");
        expect(landingConfig).not.toContain("https://documentation.vercel.app");
    });
    it("deploys the MCP child before Landing without adding a public Landing rewrite", async () =>
    {
        const target = await mkdtemp(join(tmpdir(), "sorrell-deploy-mcp-"));
        await mkdir(join(target, "Landing"));
        const order: Array<string> = [];
        const layer = Layer.succeed(
            VercelService,
            VercelService.of({
                alias: () => Effect.void,
                deploy: (directory: string) =>
                    Effect.sync(() =>
                    {
                        const project =
                            directory.split(/[\\/]/u).at(-1) ?? "unknown";
                        order.push(project);
                        const url = `https://${project.toLowerCase()}.vercel.app`;
                        return { deploymentId: url, raw: url, url };
                    }),
                inspect: (deployment: string) =>
                    Effect.succeed({
                        deploymentId: deployment,
                        raw: "ready",
                        state: "READY" as const,
                        url: deployment
                    }),
                promote: () => Effect.void,
                remove: () => Effect.void,
                rollback: () => Effect.void
            })
        );
        const result = await Effect.runPromise(
            deployWebsite(
                createGeneratedWebsite({
                    config: {
                        agent: { mcp: { enabled: true } },
                        metadata: { url: "https://example.test" }
                    },
                    target
                })
            ).pipe(Effect.provide(layer))
        );
        expect(order).toEqual([ "Documentation", "Mcp", "Landing" ]);
        expect(result.deployments.mcp?.url).toBe("https://mcp.vercel.app");
        expect(
            JSON.parse(
                await readFile(join(target, "Landing/vercel.json"), "utf8")
            ).rewrites
        ).toHaveLength(0);
    });
    it("removes child deployments when Landing fails", async () =>
    {
        const target = await mkdtemp(join(tmpdir(), "sorrell-deploy-fail-"));
        await mkdir(join(target, "Landing"));
        const removed: Array<string> = [];
        const layer = Layer.succeed(
            VercelService,
            VercelService.of({
                alias: () => Effect.void,
                deploy: (directory: string) =>
                    directory.endsWith("Landing")
                        ? Effect.fail(
                            new DocsIntegrationError({
                                cause: "failure",
                                operation: "deploy",
                                provider: "vercel"
                            })
                        )
                        : Effect.succeed(
                            (() =>
                            {
                                const url = directory.endsWith("Storybook")
                                    ? "https://storybook.vercel.app"
                                    : "https://documentation.vercel.app";
                                return { deploymentId: url, raw: url, url };
                            })()
                        ),
                inspect: (deployment: string) =>
                    Effect.succeed({
                        deploymentId: deployment,
                        raw: "ready",
                        state: "READY" as const,
                        url: deployment
                    }),
                promote: () => Effect.void,
                remove: (deployment: string) =>
                    Effect.sync(() =>
                    {
                        removed.push(deployment);
                    }),
                rollback: () => Effect.void
            })
        );
        const result = await Effect.runPromiseExit(
            deployWebsite(
                createGeneratedWebsite({
                    config: { storybook: { enabled: true } },
                    target
                })
            ).pipe(Effect.provide(layer))
        );
        expect(result._tag).toBe("Failure");
        expect(removed).toEqual([
            "https://documentation.vercel.app",
            "https://storybook.vercel.app"
        ]);
    });
    it("verifies public routes with bounded retries", async () =>
    {
        let attempts = 0;
        const urls: Array<string> = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: string | URL | Request) =>
            {
                attempts += 1;
                urls.push(String(input));
                return attempts === 1
                    ? new Response("busy", { status: 503 })
                    : new Response("ok", { status: 200 });
            })
        );
        try
        {
            await Effect.runPromise(
                verifyWebsiteDeployment(
                    manifest("release-1", "https://landing.vercel.app"),
                    { paths: [ "/" ] }
                ).pipe(Effect.provide(NetworkRetry.layer))
            );
            expect(attempts).toBe(3);
            expect(urls).toContain("https://docs.vercel.app/docs/");
        }
        finally
        {
            vi.unstubAllGlobals();
        }
    });
    it("archives releases and rolls back Landing to the exact previous manifest", async () =>
    {
        const target = await mkdtemp(join(tmpdir(), "sorrell-release-"));
        try
        {
            await Effect.runPromise(
                writeReleaseManifest(
                    target,
                    manifest("release-1", "https://landing-1.vercel.app")
                )
            );
            await Effect.runPromise(
                writeReleaseManifest(
                    target,
                    manifest("release-2", "https://landing-2.vercel.app")
                )
            );
            const promoted: Array<string> = [];
            const layer = Layer.succeed(
                VercelService,
                VercelService.of({
                    alias: () => Effect.void,
                    deploy: () => Effect.die("unused"),
                    inspect: (deployment: string) =>
                        Effect.succeed({
                            deploymentId: deployment,
                            raw: "ready",
                            state: "READY" as const,
                            url: deployment
                        }),
                    promote: (deployment: string) =>
                        Effect.sync(() =>
                        {
                            promoted.push(deployment);
                        }),
                    remove: () => Effect.void,
                    rollback: () => Effect.void
                })
            );
            const restored = await Effect.runPromise(
                rollbackWebsite(target).pipe(
                    Effect.provide(
                        Layer.mergeAll(
                            layer,
                            AtomicWriter.layer,
                            DocsFileSystem.layer,
                            DocsPath.layer
                        )
                    )
                )
            );
            expect(restored.releaseId).toBe("release-1");
            expect(promoted).toEqual([
                "release-1-docs",
                "release-1-landing"
            ]);
            expect(
                JSON.parse(
                    await readFile(
                        join(target, "ReleaseManifest.json"),
                        "utf8"
                    )
                ).releaseId
            ).toBe("release-1");
        }
        finally
        {
            await rm(target, { force: true, recursive: true });
        }
    });
});
