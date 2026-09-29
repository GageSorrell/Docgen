/**
 * Child-first deployment and release-manifest orchestration.
 *
 * @module @sorrell/docs-create-website/Deployment
 *
 * @file      Deployment.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    AtomicWriter,
    DocsFileSystem,
    type DocsFileSystemError,
    DocsPath,
    NetworkRetry,
    type VercelDeploymentResult,
    VercelService
} from "@sorrell/docs-cli";
import { Data, Effect, Layer, Result } from "effect";
import type {
    DeploymentTarget,
    GeneratedWebsite,
    WebsiteDeployments
} from "./Types.js";
import { type LandingVercelConfig, createLandingRewrites } from "./Routing.js";

/** @internal */
export interface WebsiteDeploymentOptions
{
    readonly production?: boolean;
    readonly revision?: string;
    readonly generatedAt?: string;
    readonly releaseId?: string;
    readonly apiSnapshot?: string;
    readonly snapshot?: boolean;
}

/** @internal */
export interface WebsiteReleaseManifest
{
    readonly version: 2;
    readonly releaseId: string;
    readonly generatedAt: string;
    readonly revision: string;
    readonly mode: "preview" | "production";
    readonly publicUrl: string;
    readonly routes: GeneratedWebsite["config"]["routing"];
    readonly mcpEndpoint?: string;
    readonly deployments: WebsiteDeployments;
    readonly landingConfig: LandingVercelConfig;
    readonly apiSnapshot?: string;
    readonly previousReleaseId?: string;
}
/** @internal */
export class DeploymentVerificationError extends Data.TaggedError(
    "DeploymentVerificationError"
)<{
        readonly url: string;
        readonly status?: number;
        readonly cause?: unknown;
    }> {}
/** @internal */
export class ReleaseManifestError extends Data.TaggedError(
    "ReleaseManifestError"
)<{
        readonly path: string;
        readonly cause: unknown;
    }> {}
const targetFrom = (
    project: string,
    output: VercelDeploymentResult,
    revision: string | undefined
): DeploymentTarget => ({
    deploymentId: output.deploymentId,
    url: output.url,
    ...(revision === undefined ? {} : { revision }),
    project
});
const projectOptions = (
    project: {
        readonly project: string | undefined;
        readonly team: string | undefined;
    },
    production: boolean
) => ({
    production,
    ...(project.project === undefined ? {} : { name: project.project })
    // VercelService authenticates with VERCEL_ORG_ID via --scope. Keeping the
    // project map's team field for metadata avoids emitting duplicate flags.
});
const localPackageDirectories: Readonly<Record<string, string>> = {
    "@sorrell/docs-api-reference": "ApiReference",
    "@sorrell/docs-astro": "Astro",
    "@sorrell/docs-cli": "Cli",
    "@sorrell/docs-core": "Core",
    "@sorrell/docs-create-website": "CreateWebsite",
    "@sorrell/docs-mcp": "Mcp",
    "@sorrell/docs-skills": "Skills",
    "@sorrell/docs-ui": "Ui"
};
const dependencySections = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies"
] as const;
const localDependency = (
    name: string,
    value: unknown,
    prefix: string
): unknown =>
    typeof value === "string" && localPackageDirectories[name] !== undefined
        ? `file:${prefix}${localPackageDirectories[name]}`
        : value;
const rewritePackageManifest = (
    text: string,
    prefix: string
): string =>
{
    const manifest = JSON.parse(text) as Record<string, unknown>;
    for (const section of dependencySections)
    {
        const dependencies = manifest[section];
        if (typeof dependencies !== "object" || dependencies === null)
        {
            continue;
        }
        const rewritten = Object.fromEntries(
            Object.entries(dependencies as Record<string, unknown>).map(
                ([ name, value ]) => [
                    name,
                    localDependency(name, value, prefix)
                ]
            )
        );
        manifest[section] = rewritten;
    }
    return `${JSON.stringify(manifest, null, 2)}\n`;
};
const rewriteStagedTsconfig = (text: string): string =>
    text
        .replaceAll("../../Configuration/", "./Configuration/")
        .replaceAll("../../Package/", "./Package/");
interface VercelDirectoryOptions
{
    readonly staticContent?: {
        readonly source: string;
        readonly destination: string;
    };
    readonly siteConfig?: string;
}
const prepareVercelDirectory = (
    website: GeneratedWebsite,
    directory: string,
    fileSystem: typeof DocsFileSystem.Service,
    path: typeof DocsPath.Service,
    options: VercelDirectoryOptions = {}
): Effect.Effect<string, DocsFileSystemError, import("effect").Scope.Scope> =>
    Effect.gen(function* ()
    {
        const source = path.resolve(directory);
        const repositoryRoot = path.resolve(website.target, "..");
        const packageSource = path.join(repositoryRoot, "Package");
        const configurationSource = path.join(repositoryRoot, "Configuration");
        if (
            !(yield* fileSystem.exists(source)) ||
            !(yield* fileSystem.exists(path.join(packageSource, "Core", "package.json")))
        )
        {
            return source;
        }
        const staging = yield* fileSystem.makeTempDirectoryScoped({
            prefix: "sorrell-vercel-"
        });
        yield* fileSystem.copy(source, staging, { overwrite: true });
        if (options.staticContent !== undefined)
        {
            const destination = path.join(
                staging,
                options.staticContent.destination
            );
            yield* fileSystem.makeDirectory(destination);
            yield* fileSystem.copy(
                options.staticContent.source,
                destination,
                { overwrite: true }
            );
        }
        if (options.siteConfig !== undefined)
        {
            yield* fileSystem.writeText(
                path.join(staging, "docs.config.json"),
                options.siteConfig
            );
            const versionsSource = path.join(
                staging,
                "Source",
                "Versions.ts"
            );
            if (yield* fileSystem.exists(versionsSource))
            {
                const source = yield* fileSystem.readText(versionsSource);
                yield* fileSystem.writeText(
                    versionsSource,
                    source.replace(
                        "\"../../docs.config.json\"",
                        "\"../docs.config.json\""
                    )
                );
            }
            for (const configImportFile of [
                path.join(staging, "Source", "components", "SiteHeader.astro"),
                path.join(staging, "Source", "components", "Footer.astro"),
                path.join(staging, "Source", "layouts", "ApiPackageLayout.astro"),
                path.join(staging, "Source", "layouts", "ApiReferenceLayout.astro"),
                path.join(staging, "Source", "layouts", "DocsLayout.astro"),
                path.join(staging, "Source", "pages", "index.astro")
            ])
            {
                if (yield* fileSystem.exists(configImportFile))
                {
                    const source = yield* fileSystem.readText(configImportFile);
                    yield* fileSystem.writeText(
                        configImportFile,
                        source.replaceAll(
                            "../../../docs.config.json",
                            "../../docs.config.json"
                        )
                    );
                }
            }
        }
        const stagedPackages = path.join(staging, "Package");
        yield* fileSystem.copy(packageSource, stagedPackages, {
            overwrite: true
        });
        if (yield* fileSystem.exists(configurationSource))
        {
            yield* fileSystem.copy(
                configurationSource,
                path.join(staging, "Configuration"),
                { overwrite: true }
            );
        }
        const siteManifest = path.join(staging, "package.json");
        if (yield* fileSystem.exists(siteManifest))
        {
            yield* fileSystem.writeText(
                siteManifest,
                rewritePackageManifest(
                    yield* fileSystem.readText(siteManifest),
                    "./Package/"
                )
            );
        }
        const siteTsconfig = path.join(staging, "tsconfig.json");
        if (yield* fileSystem.exists(siteTsconfig))
        {
            yield* fileSystem.writeText(
                siteTsconfig,
                rewriteStagedTsconfig(yield* fileSystem.readText(siteTsconfig))
            );
        }
        for (const packageDirectory of Object.values(localPackageDirectories))
        {
            const packageManifest = path.join(
                stagedPackages,
                packageDirectory,
                "package.json"
            );
            if (yield* fileSystem.exists(packageManifest))
            {
                yield* fileSystem.writeText(
                    packageManifest,
                    rewritePackageManifest(
                        yield* fileSystem.readText(packageManifest),
                        "../"
                    )
                );
            }
        }
        return staging;
    });
export/** @internal */
const deployWebsite = (
    website: GeneratedWebsite,
    options: WebsiteDeploymentOptions = {}
): Effect.Effect<
    WebsiteReleaseManifest,
    unknown,
    VercelService | AtomicWriter | DocsFileSystem | DocsPath
> =>
    Effect.scoped(
        Effect.gen(function* ()
        {
            const vercel = yield* VercelService;
            const writer = yield* AtomicWriter;
            const fileSystem = yield* DocsFileSystem;
            const path = yield* DocsPath;
            // Publish every package as a preview artifact first. Production promotion
            // happens only after the Landing routes have been verified.
            const deployOptions = { production: false } as const;
            const documentationProject =
                website.config.vercel.projects.documentation;
            const siteConfig = website.files.find(
                (file) => file.path === "docs.config.json"
            )?.content;
            const documentationDirectory = yield* prepareVercelDirectory(
                website,
                path.join(website.target, documentationProject.directory),
                fileSystem,
                path,
                siteConfig === undefined
                    ? {}
                    : { siteConfig }
            );
            const documentationOutput = yield* vercel.deploy(
                documentationDirectory,
                projectOptions(
                    {
                        project: documentationProject.project,
                        team: documentationProject.team
                    },
                    deployOptions.production
                )
            );
            const documentation = targetFrom(
                documentationProject.project ?? "documentation",
                documentationOutput,
                options.revision
            );
            const storybookDirectory = website.config.storybook.enabled
                ? yield* prepareVercelDirectory(
                    website,
                    path.join(
                        website.target,
                        website.config.vercel.projects.storybook?.directory ??
                            "Storybook"
                    ),
                    fileSystem,
                    path
                )
                : undefined;
            const storybookOutput = storybookDirectory !== undefined
                ? yield* vercel
                    .deploy(
                        storybookDirectory,
                        projectOptions(
                            {
                                project:
                                  website.config.vercel.projects.storybook
                                      ?.project,
                                team: website.config.vercel.projects.storybook
                                    ?.team
                            },
                            deployOptions.production
                        )
                    )
                    .pipe(Effect.result)
                : Result.succeed(undefined);
            if (Result.isFailure(storybookOutput))
            {
                yield* vercel
                    .remove(documentationOutput.deploymentId)
                    .pipe(Effect.ignore);
                return yield* Effect.fail(storybookOutput.failure);
            }
            const storybook =
                storybookOutput.success === undefined
                    ? undefined
                    : targetFrom(
                        website.config.vercel.projects.storybook?.project ??
                          "storybook",
                        storybookOutput.success,
                        options.revision
                    );
            const mcpDirectory = website.config.agent.mcp.enabled
                ? yield* prepareVercelDirectory(
                    website,
                    path.join(
                        website.target,
                        website.config.vercel.projects.mcp?.directory ?? "Mcp"
                    ),
                    fileSystem,
                    path
                )
                : undefined;
            const mcpOutput = mcpDirectory !== undefined
                ? yield* vercel
                    .deploy(
                        mcpDirectory,
                        projectOptions(
                            {
                                project:
                                  website.config.vercel.projects.mcp?.project,
                                team: website.config.vercel.projects.mcp?.team
                            },
                            deployOptions.production
                        )
                    )
                    .pipe(Effect.result)
                : Result.succeed(undefined);
            if (Result.isFailure(mcpOutput))
            {
                yield* vercel
                    .remove(documentationOutput.deploymentId)
                    .pipe(Effect.ignore);
                if (storybookOutput.success !== undefined)
                {
                    yield* vercel
                        .remove(storybookOutput.success.deploymentId)
                        .pipe(Effect.ignore);
                }
                return yield* Effect.fail(mcpOutput.failure);
            }
            const mcp =
                mcpOutput.success === undefined
                    ? undefined
                    : targetFrom(
                        website.config.vercel.projects.mcp?.project ?? "mcp",
                        mcpOutput.success,
                        options.revision
                    );
            const childDeployments: WebsiteDeployments = {
                documentation,
                landing: {
                    deploymentId: "pending",
                    url: "https://landing.pending"
                },
                ...(storybook === undefined ? {} : { storybook }),
                ...(mcp === undefined ? {} : { mcp })
            };
            const landingConfig = createLandingRewrites(
                website.config.routing,
                childDeployments,
                website.config.redirects
            );
            yield* writer.writeText(
                path.join(website.target, "Landing", "vercel.json"),
                `${JSON.stringify(landingConfig, null, 2)}\n`
            );
            const landingProject = website.config.vercel.projects.landing;
            const documentationDistribution = path.join(
                website.target,
                website.config.vercel.projects.documentation.directory,
                "dist"
            );
            const landingDirectory = yield* prepareVercelDirectory(
                website,
                path.join(website.target, landingProject.directory),
                fileSystem,
                path,
                {
                    staticContent: {
                        destination: path.join(
                            "public",
                            website.config.routing.documentationPrefix.replace(
                                /^\/+/, ""
                            )
                        ),
                        source: documentationDistribution
                    },
                    ...(siteConfig === undefined ? {} : { siteConfig })
                }
            );
            const landingResult = yield* vercel
                .deploy(
                    landingDirectory,
                    projectOptions(
                        {
                            project: landingProject.project,
                            team: landingProject.team
                        },
                        deployOptions.production
                    )
                )
                .pipe(Effect.result);
            if (Result.isFailure(landingResult))
            {
                yield* vercel
                    .remove(documentationOutput.deploymentId)
                    .pipe(Effect.ignore);
                if (storybookOutput.success !== undefined)
                {
                    yield* vercel
                        .remove(storybookOutput.success.deploymentId)
                        .pipe(Effect.ignore);
                }
                if (mcpOutput.success !== undefined)
                {
                    yield* vercel
                        .remove(mcpOutput.success.deploymentId)
                        .pipe(Effect.ignore);
                }
                return yield* Effect.fail(landingResult.failure);
            }
            const landingOutput = landingResult.success;
            const landing = targetFrom(
                landingProject.project ?? "landing",
                landingOutput,
                options.revision
            );
            const revision = (options.revision ?? website.revision).replace(
                /[^A-Za-z0-9_.-]/g,
                "-"
            );
            const generatedAt = (
                options.generatedAt ?? website.generatedAt
            ).replace(/[^A-Za-z0-9_.-]/g, "-");
            const releaseId = options.releaseId ?? `${revision}-${generatedAt}`;
            return {
                generatedAt: options.generatedAt ?? website.generatedAt,
                mode:
                options.production === true
                    ? ("production" as const)
                    : ("preview" as const),
                publicUrl: website.config.metadata.url || landing.url,
                releaseId,
                revision: options.revision ?? website.revision,
                routes: website.config.routing,
                version: 2 as const,
                ...(mcp === undefined
                    ? {}
                    : { mcpEndpoint: website.config.mcpEndpoint }),
                deployments: {
                    ...childDeployments,
                    landing,
                    ...(storybook === undefined ? {} : { storybook }),
                    ...(mcp === undefined ? {} : { mcp })
                },
                landingConfig,
                ...(options.apiSnapshot === undefined
                    ? {}
                    : { apiSnapshot: options.apiSnapshot })
            };
        }).pipe(
            Effect.provide(
                Layer.mergeAll(
                    AtomicWriter.layer,
                    DocsFileSystem.layer,
                    DocsPath.layer
                )
            )
        )
    );
export/** @internal */
const cleanupWebsiteDeployments = (
    manifest: WebsiteReleaseManifest
): Effect.Effect<void, unknown, VercelService> =>
    Effect.gen(function* ()
    {
        const vercel = yield* VercelService;
        const deployments = [
            manifest.deployments.documentation,
            manifest.deployments.storybook,
            manifest.deployments.mcp,
            manifest.deployments.landing
        ].filter(
            (value: DeploymentTarget | undefined): value is DeploymentTarget =>
                value !== undefined
        );
        yield* Effect.forEach(
            deployments,
            (deployment: DeploymentTarget) =>
                vercel.remove(deployment.deploymentId).pipe(Effect.ignore),
            { concurrency: 1 }
        );
    });
export/** @internal */
const promoteWebsite = (
    manifest: WebsiteReleaseManifest
): Effect.Effect<void, unknown, VercelService> =>
    Effect.gen(function* ()
    {
        const vercel = yield* VercelService;
        yield* vercel.promote(
            manifest.deployments.documentation.deploymentId
        );
        if (manifest.deployments.storybook !== undefined)
        {
            yield* vercel.promote(
                manifest.deployments.storybook.deploymentId
            );
        }
        if (manifest.deployments.mcp !== undefined)
        {
            if (manifest.mcpEndpoint !== undefined)
            {
                yield* vercel.alias(
                    manifest.deployments.mcp.deploymentId,
                    new URL(manifest.mcpEndpoint).host
                );
            }
            yield* vercel.promote(manifest.deployments.mcp.deploymentId);
        }
        yield* vercel.promote(manifest.deployments.landing.deploymentId);
    });
const readManifest = (
    fileSystem: typeof DocsFileSystem.Service,
    path: string
): Effect.Effect<WebsiteReleaseManifest, ReleaseManifestError> =>
    fileSystem.readText(path).pipe(
        Effect.mapError(
            (cause: DocsFileSystemError) =>
                new ReleaseManifestError({ cause, path })
        ),
        Effect.flatMap((text: string) =>
            Effect.try({
                catch: (cause: unknown) =>
                    new ReleaseManifestError({ cause, path }),
                try: () => JSON.parse(text) as WebsiteReleaseManifest
            })
        )
    );
export/** @internal */
const writeReleaseManifest = (
    target: string,
    manifest: WebsiteReleaseManifest
): Effect.Effect<void, unknown> =>
    Effect.gen(function* ()
    {
        const writer = yield* AtomicWriter;
        const path = yield* DocsPath;
        const fileSystem = yield* DocsFileSystem;
        const activePath = path.join(target, "ReleaseManifest.json");
        const previous = yield* fileSystem
            .exists(activePath)
            .pipe(
                Effect.flatMap((exists: boolean) =>
                    exists
                        ? readManifest(fileSystem, activePath).pipe(
                            Effect.catch(() => Effect.succeed(undefined))
                        )
                        : Effect.succeed(undefined)
                )
            );
        const persisted =
            previous === undefined
                ? manifest
                : { ...manifest, previousReleaseId: previous.releaseId };
        const archiveDirectory = path.join(target, "Releases");
        yield* fileSystem.makeDirectory(archiveDirectory);
        yield* writer.writeText(
            activePath,
            `${JSON.stringify(persisted, null, 2)}\n`
        );
        yield* writer.writeText(
            path.join(archiveDirectory, `${persisted.releaseId}.json`),
            `${JSON.stringify(persisted, null, 2)}\n`
        );
    }).pipe(
        Effect.provide(
            Layer.mergeAll(
                AtomicWriter.layer,
                DocsFileSystem.layer,
                DocsPath.layer
            )
        )
    );
export/** @internal */
const rollbackWebsite = (
    target: string,
    releaseId?: string
): Effect.Effect<
    WebsiteReleaseManifest,
    unknown,
    VercelService | AtomicWriter | DocsFileSystem | DocsPath
> =>
    Effect.gen(function* ()
    {
        const writer = yield* AtomicWriter;
        const fileSystem = yield* DocsFileSystem;
        const path = yield* DocsPath;
        const activePath = path.join(target, "ReleaseManifest.json");
        const active = yield* readManifest(fileSystem, activePath);
        const selectedId = releaseId ?? active.previousReleaseId;
        if (selectedId === undefined)
        {
            return yield* Effect.fail(
                new ReleaseManifestError({
                    cause: new Error("no previous release is recorded"),
                    path: activePath
                })
            );
        }
        const selectedPath = path.join(
            target,
            "Releases",
            `${selectedId}.json`
        );
        const selected = yield* readManifest(fileSystem, selectedPath);
        yield* promoteWebsite(selected);
        yield* writer.writeText(
            activePath,
            `${JSON.stringify(selected, null, 2)}\n`
        );
        return selected;
    });
/** @internal */
export interface DeploymentVerificationOptions {
    readonly paths?: ReadonlyArray<string>;
}
export/** @internal */
const verifyWebsiteDeployment = (
    manifest: WebsiteReleaseManifest,
    options: DeploymentVerificationOptions = {}
): Effect.Effect<void, DeploymentVerificationError, NetworkRetry> =>
    Effect.gen(function* ()
    {
        const retry = yield* NetworkRetry;
        const verifyUrl = (url: string) =>
        {
            const request = Effect.tryPromise({
                catch: (cause: unknown) =>
                    new DeploymentVerificationError({ cause, url }),
                try: () => fetch(url)
            }).pipe(
                Effect.flatMap((response: Response) =>
                    response.ok
                        ? Effect.void
                        : Effect.fail(
                            new DeploymentVerificationError({
                                cause: new Error(
                                    `unexpected HTTP status ${response.status}`
                                ),
                                status: response.status,
                                url
                            })
                        )
                )
            );
            return retry.run(
                request,
                (cause: DeploymentVerificationError) =>
                    cause.status === undefined || cause.status >= 500,
                { delay: "100 millis", maxRetries: 3 }
            );
        };
        const paths = options.paths ?? [
            "/",
            manifest.routes.documentationPrefix,
            `${manifest.routes.documentationPrefix}/`,
            ...(manifest.deployments.storybook === undefined
                ? []
                : [
                    manifest.routes.storybookPrefix,
                    `${manifest.routes.storybookPrefix}/`
                ])
        ];
        for (const route of paths)
        {
            const url = new URL(
                route,
                `${manifest.deployments.landing.url.replace(/\/+$/, "")}/`
            ).toString();
            yield* verifyUrl(url);
        }
        const documentationUrl =
            `${manifest.deployments.documentation.url.replace(/\/+$/u, "")}` +
            `${manifest.routes.documentationPrefix}/`;
        yield* verifyUrl(documentationUrl);
        if (manifest.deployments.storybook !== undefined)
        {
            const storybookUrl =
                `${manifest.deployments.storybook.url.replace(/\/+$/u, "")}` +
                `${manifest.routes.storybookPrefix}/`;
            yield* verifyUrl(storybookUrl);
        }
        if (manifest.deployments.mcp !== undefined)
        {
            const url = `${manifest.deployments.mcp.url.replace(/\/+$/u, "")}/health`;
            const response = yield* Effect.tryPromise({
                catch: (cause: unknown) =>
                    new DeploymentVerificationError({ cause, url }),
                try: () => fetch(url)
            });
            if (!response.ok)
            {
                return yield* Effect.fail(
                    new DeploymentVerificationError({
                        status: response.status,
                        url
                    })
                );
            }
            if (response.headers.get("cache-control") !== "no-store")
            {
                return yield* Effect.fail(
                    new DeploymentVerificationError({
                        cause: new Error(
                            "MCP health response must be no-store"
                        ),
                        url
                    })
                );
            }
        }
    });
