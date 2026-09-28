/**
 *
 *
 * @module @sorrell/docs-create-website/Test/Routing.test
 *
 * @file      Routing.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    createLandingRewrites,
    createSnapshotProjects
} from "../Source/Routing.js";
import { describe, expect, it } from "vitest";
describe("generated website routing", () =>
{
    it("keeps documentation local and maps the Storybook base path to its deployment root", () =>
    {
        const result = createLandingRewrites(
            { documentationPrefix: "/docs", storybookPrefix: "/storybook" },
            {
                documentation: {
                    deploymentId: "docs-1",
                    url: "https://docs.vercel.app/"
                },
                landing: {
                    deploymentId: "landing-1",
                    url: "https://landing.vercel.app"
                },
                storybook: {
                    deploymentId: "storybook-1",
                    url: "https://storybook.vercel.app/"
                }
            }
        );
        expect(result.rewrites).toEqual([
            {
                destination: "https://storybook.vercel.app",
                source: "/storybook"
            },
            {
                destination: "https://storybook.vercel.app/:path*",
                source: "/storybook/:path*"
            }
        ]);
        expect(result.installCommand).toBe("npm install");
        expect(result.redirects).toEqual([
            {
                destination: "/storybook/",
                source: "/storybook",
                statusCode: 301
            }
        ]);
    });
    it("keeps redirects in the Landing configuration and derives snapshot projects", () =>
    {
        const result = createLandingRewrites(
            { documentationPrefix: "/docs", storybookPrefix: "/storybook" },
            {
                documentation: {
                    deploymentId: "docs-1",
                    url: "https://docs.vercel.app"
                },
                landing: {
                    deploymentId: "landing-1",
                    url: "https://landing.vercel.app"
                }
            },
            [ { from: "/old", status: 301, to: "/docs/new" } ]
        );
        expect(result.redirects).toEqual([
            { destination: "/docs/new", source: "/old", statusCode: 301 }
        ]);
        const config = {
            metadata: { url: "https://example.com" },
            vercel: {
                projects: {
                    documentation: { project: "documentation" },
                    landing: { project: "landing" }
                }
            }
        } as never;
        expect(createSnapshotProjects(config).landing.project).toBe(
            "landing-snapshot"
        );
        expect(createSnapshotProjects(config).documentation.project).toBe(
            "documentation-snapshot"
        );
    });
    it("omits Storybook rewrites when no Storybook deployment exists", () =>
    {
        const result = createLandingRewrites(
            {
                documentationPrefix: "/reference",
                storybookPrefix: "/workbench"
            },
            {
                documentation: {
                    deploymentId: "docs-1",
                    url: "https://docs.vercel.app"
                },
                landing: {
                    deploymentId: "landing-1",
                    url: "https://landing.vercel.app"
                }
            }
        );
        expect(result.rewrites).toHaveLength(0);
        expect(result.redirects).toEqual([]);
        expect(
            result.rewrites.some((rewrite: VercelRewrite) =>
                rewrite.source.startsWith("/workbench")
            )
        ).toBe(false);
    });
});
