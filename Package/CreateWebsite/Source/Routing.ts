/**
 * Public route and Vercel rewrite generation.
 *
 * @module @sorrell/docs-create-website/Routing
 *
 * @file      Routing.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type { DeploymentTarget, WebsiteDeployments } from "./Types.js";
import type {
    DocsConfig,
    Redirect,
    SiteRouting,
    VercelProjects
} from "@sorrell/docs-core";

/** @internal */
export interface VercelRewrite {
    readonly source: string;
    readonly destination: string;
}
/** @internal */
export interface VercelRedirect {
    readonly source: string;
    readonly destination: string;
    readonly statusCode: 301 | 302;
}
/** @internal */
export interface VercelHeader {
    readonly source: string;
    readonly headers: ReadonlyArray<{
        readonly key: string;
        readonly value: string;
    }>;
}
/** @internal */
export interface LandingVercelConfig {
    readonly buildCommand?: "npm run build";
    readonly installCommand?: "npm install";
    readonly outputDirectory?: "Distribution";
    readonly version: 2;
    readonly rewrites: ReadonlyArray<VercelRewrite>;
    readonly redirects: ReadonlyArray<VercelRedirect>;
    readonly headers: ReadonlyArray<VercelHeader>;
}
const normalizedUrl = (url: string): string => url.replace(/\/+$/, "");
const rewriteFor = (
    prefix: string,
    deployment: DeploymentTarget
): ReadonlyArray<VercelRewrite> =>
{
    // Storybook is built with its public base path (for asset URLs), but its
    // files are deployed at the child project's root. Strip the public prefix
    // while proxying requests to that deployment.
    const destination = normalizedUrl(deployment.url);
    return [
        { destination, source: prefix },
        { destination: `${destination}/:path*`, source: `${prefix}/:path*` }
    ];
};
export/** @internal */
const createLandingRewrites = (
    routing: SiteRouting,
    deployments: WebsiteDeployments,
    redirects: ReadonlyArray<Redirect> = []
): LandingVercelConfig => ({
    buildCommand: "npm run build",
    headers: [
        {
            headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
            source: "/llms.txt"
        },
        {
            headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
            source: `${routing.documentationPrefix}/agent/:path*`
        },
        {
            headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
            source: `${routing.documentationPrefix}/:path*.md`
        },
        ...(deployments.storybook === undefined
            ? []
            : [
                {
                    headers: [ { key: "X-Robots-Tag", value: "noindex" } ],
                    source: `${routing.storybookPrefix}/agent/:path*`
                }
            ])
    ],
    installCommand: "npm install",
    outputDirectory: "Distribution",
    redirects: [
        ...(deployments.storybook === undefined
            ? []
            : [
                {
                    destination: `${normalizedUrl(routing.storybookPrefix)}/`,
                    source: normalizedUrl(routing.storybookPrefix),
                    statusCode: 301 as const
                }
            ]),
        ...redirects.map(
            (redirect: {
                readonly from: string;
                readonly to: string;
                readonly status: 301 | 302;
            }) => ({
                destination: redirect.to,
                source: redirect.from,
                statusCode: redirect.status
            })
        )
    ],
    rewrites: [
        ...(deployments.storybook === undefined
            ? []
            : rewriteFor(routing.storybookPrefix, deployments.storybook))
    ],
    version: 2
});
export/** @internal */
const createPlaceholderDeployments = (
    config: DocsConfig,
    snapshot: boolean = false
): WebsiteDeployments => ({
    documentation: {
        deploymentId: snapshot
            ? "snapshot-documentation"
            : "pending-documentation",
        url: snapshot
            ? "https://documentation-snapshot.invalid"
            : "https://documentation.invalid"
    },
    landing: {
        deploymentId: "pending-landing",
        url: config.metadata.url || "https://landing.invalid"
    },
    ...(config.storybook.enabled
        ? {
            storybook: {
                deploymentId: snapshot
                    ? "snapshot-storybook"
                    : "pending-storybook",
                url: snapshot
                    ? "https://storybook-snapshot.invalid"
                    : "https://storybook.invalid"
            }
        }
        : {}),
    ...(config.agent.mcp.enabled
        ? {
            mcp: {
                deploymentId: snapshot ? "snapshot-mcp" : "pending-mcp",
                url: snapshot
                    ? "https://mcp-snapshot.invalid"
                    : "https://mcp.invalid"
            }
        }
        : {})
});
export/** @internal */
const createSnapshotProjects = (
    config: DocsConfig
): VercelProjects =>
{
    const suffix = (project: string | undefined, fallback: string): string =>
        `${project ?? fallback}-snapshot`;
    return {
        documentation: {
            ...config.vercel.projects.documentation,
            project: suffix(
                config.vercel.projects.documentation.project,
                "documentation"
            )
        },
        landing: {
            ...config.vercel.projects.landing,
            project: suffix(config.vercel.projects.landing.project, "landing")
        },
        ...(config.vercel.projects.storybook === undefined
            ? {}
            : {
                storybook: {
                    ...config.vercel.projects.storybook,
                    project: suffix(
                        config.vercel.projects.storybook.project,
                        "storybook"
                    )
                }
            }),
        ...(config.vercel.projects.mcp === undefined
            ? {}
            : {
                mcp: {
                    ...config.vercel.projects.mcp,
                    project: suffix(
                        config.vercel.projects.mcp.project,
                        "mcp"
                    )
                }
            })
    };
};
export/** @internal */
const publicUrl = (
    siteUrl: string,
    prefix: string,
    path: string = ""
): string =>
{
    const normalizedSite = normalizedUrl(siteUrl);
    const normalizedPath = path.replace(/^\/+/, "");
    return `${normalizedSite}${prefix}${normalizedPath === "" ? "" : `/${normalizedPath}`}`;
};
