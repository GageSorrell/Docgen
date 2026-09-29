/**
 *
 *
 * @module @sorrell/docs-core/Config
 *
 * @file      Config.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */
import {
    type AgentConfig,
    AgentConfigSchema,
    type AgentSkillConfig,
    AgentSkillConfigSchema,
    type ApiGenerationConfig,
    ApiGenerationConfigSchema,
    type BannerConfig,
    BannerSchema,
    type DesignTokens,
    DesignTokensSchema,
    type DocsConfigInput,
    DocsConfigInputSchema,
    type DocumentationVersion,
    DocumentationVersionSchema,
    type GeneratedManifest,
    GeneratedManifestSchema,
    type LandingContent,
    LandingContentSchema,
    type FooterColumn,
    type FooterLink,
    type SiteFooter,
    type Navigation,
    type NavigationItemInput,
    NavigationSchema,
    type PackageReference,
    PackageReferenceSchema,
    type Redirect,
    RedirectSchema,
    type SiteMetadata,
    SiteMetadataSchema,
    type SiteRouting,
    SiteRoutingSchema,
    type StorybookConfig,
    StorybookConfigSchema,
    type VercelConfig,
    VercelConfigSchema
} from "./Schemas.js";
import {
    type ConfigPathSegment,
    type DocsConfigDiagnostic,
    DocsConfigError
} from "./Errors.js";
import { Effect, Result, Schema, SchemaIssue } from "effect";
const decodeAs = <Value>(schema: unknown, value: unknown): Value =>
    Schema.decodeUnknownSync(
        schema as Schema.ConstraintDecoder<unknown, never>
    )(value) as Value;
const omitUndefined = (
    value: Record<string, unknown>
): Record<string, unknown> =>
    Object.fromEntries(
        Object.entries(value).filter(
            ([ , entry ]: [string, unknown]) => entry !== undefined
        )
    );
/** @internal */
export interface DocsConfig {
    readonly metadata: SiteMetadata;
    readonly banner?: BannerConfig | undefined;
    readonly tokens: DesignTokens;
    readonly navigation: Navigation;
    readonly versions: ReadonlyArray<DocumentationVersion>;
    readonly packages: ReadonlyArray<PackageReference>;
    readonly landing: LandingContent;
    readonly footer: SiteFooter;
    readonly redirects: ReadonlyArray<Redirect>;
    readonly storybook: StorybookConfig;
    readonly api: ApiGenerationConfig;
    readonly agent: AgentConfig;
    readonly mcpEndpoint: string;
    readonly routing: SiteRouting;
    readonly vercel: VercelConfig;
    readonly manifests: ReadonlyArray<GeneratedManifest>;
}
const defaultColors = {
    accent: "oklch(0.696 0.17 162.48)",
    background: "oklch(1 0 0)",
    border: "oklch(0.92 0.004 286.32)",
    cardBackground: "oklch(0.985 0 0)",
    codeBackground: "oklch(0.967 0.001 286.375)",
    foreground: "oklch(0.21 0.006 285.885)",
    muted: "oklch(0.442 0.017 285.786)",
    proseForeground: "oklch(0.37 0.013 285.805)",
    subtleForeground: "oklch(0.705 0.015 286.067)"
} as const;
const defaultDarkColors = {
    accent: "oklch(0.765 0.177 163.223)",
    background: "oklch(0.141 0.005 285.823)",
    border: "oklch(0.274 0.006 286.033)",
    cardBackground: "oklch(0.21 0.006 285.885)",
    codeBackground: "oklch(0.274 0.006 286.033)",
    foreground: "oklch(0.985 0 0)",
    muted: "oklch(0.705 0.015 286.067)",
    proseForeground: "oklch(0.871 0.006 286.286)",
    subtleForeground: "oklch(0.552 0.016 285.938)"
} as const;
export /** @internal */ const DefaultDesignTokens: DesignTokens = {
    dark: defaultDarkColors,
    light: defaultColors
};
const mergeColors = (
    base: DesignTokens["light"],
    value: Partial<DesignTokens["light"]> | undefined
) => ({
    ...base,
    ...value
});
const sortedByOrder = <
    Value extends {
        readonly order: number;
        readonly id: string;
    }
>(
    values: ReadonlyArray<Value>
): ReadonlyArray<Value> =>
    [ ...values ].sort(
        (left: Value, right: Value) =>
            left.order - right.order || left.id.localeCompare(right.id)
    );
const uniqueDiagnostics = (
    diagnostics: ReadonlyArray<DocsConfigDiagnostic>
): ReadonlyArray<DocsConfigDiagnostic> =>
{
    const seen = new Set<string>();
    return diagnostics.filter((diagnostic: DocsConfigDiagnostic) =>
    {
        const key = `${diagnostic.path.join(".")}:${diagnostic.message}`;
        if (seen.has(key))
        {
            return false;
        }
        seen.add(key);
        return true;
    });
};
const routePrefixesOverlap = (left: string, right: string): boolean =>
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`);
const issuePath = (
    issue: SchemaIssue.Issue,
    prefix: ReadonlyArray<ConfigPathSegment> = []
): ReadonlyArray<DocsConfigDiagnostic> =>
{
    switch (issue._tag)
    {
        case "Pointer":
            return issuePath(issue.issue, [
                ...prefix,
                ...issue.path.filter(
                    (segment: PropertyKey): segment is ConfigPathSegment =>
                        typeof segment === "string" ||
                        typeof segment === "number"
                )
            ]);
        case "Composite":
        case "AnyOf":
            return issue.issues.flatMap((child: SchemaIssue.Issue) =>
                issuePath(child, prefix)
            );
        case "Filter":
        case "Encoding":
            return issuePath(issue.issue, prefix);
        default:
            return [
                {
                    expected: "valid configuration value",
                    message: SchemaIssue.makeFormatterDefault()(issue),
                    path: prefix
                }
            ];
    }
};
const decodeInput = (
    input: unknown
): Result.Result<DocsConfigInput, DocsConfigError> =>
{
    const decoded = Schema.decodeUnknownResult(
        DocsConfigInputSchema as unknown as Schema.ConstraintDecoder<
            DocsConfigInput,
            never
        >
    )(input);
    if (Result.isFailure(decoded))
    {
        return Result.fail(
            new DocsConfigError({
                diagnostics: uniqueDiagnostics(
                    issuePath(decoded.failure.issue)
                )
            })
        );
    }
    return Result.succeed(decoded.success);
};
const duplicateDiagnostics = (
    name: string,
    values: ReadonlyArray<{
        readonly id: string;
    }>
): ReadonlyArray<DocsConfigDiagnostic> =>
{
    const counts = new Map<string, number>();
    for (const value of values)
    {
        counts.set(value.id, (counts.get(value.id) ?? 0) + 1);
    }
    return [ ...counts.entries() ]
        .filter(([ , count ]: [string, number]) => count > 1)
        .map(([ id ]: [string, number]) => ({
            expected: "unique identifiers",
            message: `duplicate id "${id}"`,
            path: [ name, id ]
        }));
};
const validate = (config: DocsConfig): ReadonlyArray<DocsConfigDiagnostic> =>
{
    const diagnostics: Array<DocsConfigDiagnostic> = [];
    for (const dimension of [ "logoHeight", "logoWidth" ] as const)
    {
        const value = config.banner?.[dimension];
        if (value !== undefined && (!Number.isFinite(value) || value <= 0))
        {
            diagnostics.push({
                expected: "a positive finite number",
                message: "must be greater than zero",
                path: [ "banner", dimension ]
            });
        }
    }
    if (config.metadata.name.trim() === "")
    {
        diagnostics.push({
            message: "must not be empty",
            path: [ "metadata", "name" ]
        });
    }
    if (config.metadata.title.trim() === "")
    {
        diagnostics.push({
            message: "must not be empty",
            path: [ "metadata", "title" ]
        });
    }
    if (
        config.metadata.url !== "" &&
        !/^https?:\/\//.test(config.metadata.url)
    )
    {
        diagnostics.push({
            message: "must be an http(s) URL",
            path: [ "metadata", "url" ]
        });
    }
    if (
        config.agent.skill.enabled &&
        (config.agent.description === undefined ||
            config.agent.description.trim() === "")
    )
    {
        diagnostics.push({
            message: "is required when agent.skill.enabled is true",
            path: [ "agent", "description" ]
        });
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.agent.skill.name))
    {
        diagnostics.push({
            message: "must be a kebab-case identifier",
            path: [ "agent", "skill", "name" ]
        });
    }
    diagnostics.push(...duplicateDiagnostics("versions", config.versions));
    diagnostics.push(...duplicateDiagnostics("packages", config.packages));
    for (const [ index, redirect ] of config.redirects.entries())
    {
        if (!redirect.from.startsWith("/"))
        {
            diagnostics.push({
                message: "must begin with /",
                path: [ "redirects", index, "from" ]
            });
        }
        if (!redirect.to.startsWith("/"))
        {
            diagnostics.push({
                message: "must begin with /",
                path: [ "redirects", index, "to" ]
            });
        }
    }
    for (const [ index, version ] of config.versions.entries())
    {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(version.id))
        {
            diagnostics.push({
                message: "must be a lowercase URL-safe identifier",
                path: [ "versions", index, "id" ]
            });
        }
    }
    for (const [ name, prefix ] of Object.entries(config.routing))
    {
        if (!prefix.startsWith("/"))
        {
            diagnostics.push({
                message: "must begin with /",
                path: [ "routing", name ]
            });
        }
        if (prefix !== "/" && prefix.endsWith("/"))
        {
            diagnostics.push({
                message: "must not end with /",
                path: [ "routing", name ]
            });
        }
        if (prefix === "/")
        {
            diagnostics.push({
                message:
                    "must not be / because / belongs to the landing package",
                path: [ "routing", name ]
            });
        }
    }
    if (
        routePrefixesOverlap(
            config.routing.documentationPrefix,
            config.routing.storybookPrefix
        )
    )
    {
        diagnostics.push({
            message: "documentationPrefix and storybookPrefix must not overlap",
            path: [ "routing" ]
        });
    }
    if (config.vercel.projects.landing.routePrefix !== "/")
    {
        diagnostics.push({
            message: "must be / because Landing owns the public root",
            path: [ "vercel", "projects", "landing", "routePrefix" ]
        });
    }
    if (
        config.vercel.projects.documentation.routePrefix !==
        config.routing.documentationPrefix
    )
    {
        diagnostics.push({
            message: "must match routing.documentationPrefix",
            path: [ "vercel", "projects", "documentation", "routePrefix" ]
        });
    }
    if (
        config.vercel.projects.storybook !== undefined &&
        config.vercel.projects.storybook.routePrefix !==
            config.routing.storybookPrefix
    )
    {
        diagnostics.push({
            message: "must match routing.storybookPrefix",
            path: [ "vercel", "projects", "storybook", "routePrefix" ]
        });
    }
    if (config.agent.mcp.enabled && config.metadata.url === "")
    {
        diagnostics.push({
            message: "is required when agent.mcp.enabled is true",
            path: [ "metadata", "url" ]
        });
    }
    if (config.agent.mcp.enabled && config.vercel.projects.mcp === undefined)
    {
        diagnostics.push({
            message: "is required when agent.mcp.enabled is true",
            path: [ "vercel", "projects", "mcp" ]
        });
    }
    return uniqueDiagnostics(diagnostics);
};
export /** @internal */ const normalizeDocsConfig = (
    input: DocsConfigInput
): DocsConfig =>
{
    const metadataInput = input.metadata ?? {};
    const banner = input.banner === undefined
        ? undefined
        : decodeAs<BannerConfig>(BannerSchema, input.banner);
    const metadata = decodeAs<SiteMetadata>(
        SiteMetadataSchema,
        omitUndefined({
            description:
                metadataInput.description ??
                "Documentation generated with Sorrell documentation tooling.",
            logo: metadataInput.logo,
            name: metadataInput.name ?? "Sorrell Documentation",
            repository: metadataInput.repository,
            title:
                metadataInput.title ??
                metadataInput.name ??
                "Sorrell Documentation",
            url: metadataInput.url ?? ""
        })
    );
    const tokenInput = input.tokens ?? {};
    const tokens = decodeAs<DesignTokens>(DesignTokensSchema, {
        dark: mergeColors(defaultDarkColors, tokenInput.dark),
        light: mergeColors(defaultColors, tokenInput.light)
    });
    const navigation = decodeAs<Navigation>(
        NavigationSchema as Schema.Schema<Navigation>,
        {
            groups: (input.navigation?.groups ?? []).map(
                (group: {
                    readonly id: string;
                    readonly items: ReadonlyArray<NavigationItemInput>;
                    readonly label: string;
                }) => ({
                    id: group.id,
                    items: group.items.map((item: NavigationItemInput) => ({
                        ...item,
                        kind: item.kind ?? "page"
                    })),
                    label: group.label
                })
            )
        }
    );
    const versions = sortedByOrder(
        (
            input.versions ?? [
                {
                    current: true,
                    directory: ".",
                    id: "current",
                    label: "Current",
                    order: 0
                }
            ]
        ).map(
            (
                version: {
                    readonly id: string;
                    readonly version?: string;
                    readonly label?: string;
                    readonly href?: string;
                    readonly current?: boolean;
                    readonly order?: number;
                    readonly directory?: string;
                },
                index: number
            ) =>
                decodeAs<DocumentationVersion>(
                    DocumentationVersionSchema,
                    omitUndefined({
                        current: version.current ?? index === 0,
                        directory: version.directory ?? version.id,
                        href: version.href,
                        id: version.id,
                        label: version.label ?? version.version ?? version.id,
                        order: version.order ?? index,
                        version: version.version
                    })
                )
        )
    );
    const packages = [ ...(input.packages ?? []) ]
        .map(
            (value: {
                readonly id: string;
                readonly name: string;
                readonly version?: string;
                readonly source?: {
                    readonly url: string;
                    readonly branch?: string;
                    readonly directory?: string;
                };
                readonly description?: string;
                readonly directory?: string;
            }) => ({ ...value })
        )
        .sort(
            (
                left: {
                    id: string;
                    name: string;
                    version?: string;
                    source?: {
                        readonly url: string;
                        readonly branch?: string;
                        readonly directory?: string;
                    };
                    description?: string;
                    directory?: string;
                },
                right: {
                    id: string;
                    name: string;
                    version?: string;
                    source?: {
                        readonly url: string;
                        readonly branch?: string;
                        readonly directory?: string;
                    };
                    description?: string;
                    directory?: string;
                }
            ) => left.id.localeCompare(right.id)
        )
        .map(
            (value: {
                id: string;
                name: string;
                version?: string;
                source?: {
                    readonly url: string;
                    readonly branch?: string;
                    readonly directory?: string;
                };
                description?: string;
                directory?: string;
            }) =>
                decodeAs<PackageReference>(
                    PackageReferenceSchema,
                    omitUndefined({
                        description: value.description,
                        directory: value.directory,
                        id: value.id,
                        name: value.name,
                        source: value.source,
                        version: value.version
                    })
                )
        );
    const landing = decodeAs<LandingContent>(
        LandingContentSchema,
        omitUndefined({
            description: input.landing?.description ?? metadata.description,
            primaryAction: input.landing?.primaryAction,
            sections: (input.landing?.sections ?? []).map(
                (section: {
                    readonly id: string;
                    readonly title: string;
                    readonly href?: string;
                    readonly body?: string;
                }) => ({
                    ...section,
                    body: section.body ?? ""
                })
            ),
            title: input.landing?.title ?? metadata.title
        })
    );
    const footer: SiteFooter = {
        columns: input.footer?.columns ?? (
            navigation.groups.length > 0
                ? navigation.groups.map((group) => ({
                    links: group.items.map((item) => ({
                        href: item.href,
                        label: item.label
                    })),
                    title: group.label
                }))
                : [ {
                    links: [ {
                        href: `${input.routing?.documentationPrefix ?? "/docs"}/`,
                        label: "Documentation"
                    } ],
                    title: "Resources"
                } ]
        ) as ReadonlyArray<FooterColumn>,
        links: input.footer?.links ?? (
            metadata.repository === undefined
                ? []
                : [ {
                    href: metadata.repository.url,
                    icon: "github",
                    label: "GitHub"
                } ]
        ) as ReadonlyArray<FooterLink>,
        message: input.footer?.message ?? `© {year} ${metadata.name}`
    };
    const redirects = [ ...(input.redirects ?? []) ]
        .map(
            (redirect: {
                readonly from: string;
                readonly to: string;
                readonly status?: 301 | 302;
            }) =>
                decodeAs<Redirect>(RedirectSchema, {
                    from: redirect.from,
                    status: redirect.status ?? 301,
                    to: redirect.to
                })
        )
        .sort(
            (
                left: {
                    readonly from: string;
                    readonly status: 301 | 302;
                    readonly to: string;
                },
                right: {
                    readonly from: string;
                    readonly status: 301 | 302;
                    readonly to: string;
                }
            ) => left.from.localeCompare(right.from)
        );
    const storybook = decodeAs<StorybookConfig>(
        StorybookConfigSchema,
        omitUndefined({
            command: input.storybook?.command,
            directory: input.storybook?.directory,
            enabled: input.storybook?.enabled ?? false,
            stories: input.storybook?.stories ?? [],
            url: input.storybook?.url
        })
    );
    const api = decodeAs<ApiGenerationConfig>(
        ApiGenerationConfigSchema,
        omitUndefined({
            doxygen: {
                projects: input.api?.doxygen?.projects ?? []
            },
            enabled: input.api?.enabled ?? false,
            entryPoints: input.api?.entryPoints ?? [],
            jsonSchemas: input.api?.jsonSchemas ?? [],
            outputDirectory: input.api?.outputDirectory ?? "Documentation/Api",
            packages: input.api?.packages ?? [],
            sourceRepository: input.api?.sourceRepository,
            typedoc: input.api?.typedoc ?? {}
        })
    );
    const defaultSkillName =
        (metadata.name || "product-documentation")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "product-documentation";
    const skill = decodeAs<AgentSkillConfig>(AgentSkillConfigSchema, {
        enabled: input.agent?.skill?.enabled ?? false,
        name: input.agent?.skill?.name ?? defaultSkillName
    });
    const agent = decodeAs<AgentConfig>(
        AgentConfigSchema,
        omitUndefined({
            description: input.agent?.description,
            enabled: input.agent?.enabled ?? true,
            essentials: input.agent?.essentials ?? [],
            mcp: { enabled: input.agent?.mcp?.enabled ?? false },
            skill
        })
    );
    const routing = decodeAs<SiteRouting>(SiteRoutingSchema, {
        documentationPrefix: input.routing?.documentationPrefix ?? "/docs",
        storybookPrefix: input.routing?.storybookPrefix ?? "/storybook"
    });
    const vercelInput = input.vercel;
    const projectInput = vercelInput?.projects;
    const landingProject = projectInput?.landing;
    const documentationProject = projectInput?.documentation;
    const storybookProject = projectInput?.storybook;
    const mcpProject = projectInput?.mcp;
    const projectConfig = (
        value: typeof landingProject,
        directory: string,
        routePrefix: string,
        fallbackProject?: string
    ) =>
        omitUndefined({
            directory: value?.directory ?? directory,
            id: value?.id,
            origin: value?.origin,
            productionBranch:
                value?.productionBranch ?? vercelInput?.productionBranch,
            project: value?.project ?? fallbackProject,
            routePrefix: value?.routePrefix ?? routePrefix,
            team: value?.team ?? vercelInput?.team
        });
    const projects = omitUndefined({
        documentation: projectConfig(
            documentationProject,
            "Documentation",
            routing.documentationPrefix
        ),
        landing: projectConfig(
            landingProject,
            "Landing",
            "/",
            vercelInput?.project
        ),
        mcp: agent.mcp.enabled
            ? projectConfig(mcpProject, "Mcp", "/")
            : undefined,
        storybook: storybook.enabled
            ? projectConfig(
                storybookProject,
                "Storybook",
                routing.storybookPrefix
            )
            : undefined
    });
    const vercel = decodeAs<VercelConfig>(
        VercelConfigSchema,
        omitUndefined({
            domains: vercelInput?.domains ?? [],
            enabled: vercelInput?.enabled ?? false,
            outputDirectory: vercelInput?.outputDirectory ?? ".",
            productionBranch: vercelInput?.productionBranch ?? "Master",
            project: vercelInput?.project,
            projects,
            team: vercelInput?.team
        })
    );
    const manifests = (input.manifests ?? []).map(
        (manifest: {
            readonly kind: "site" | "api-reference" | "storybook" | "project";
            readonly path: string;
            readonly revision?: string;
            readonly checksum?: string;
            readonly generatedAt?: string;
        }) => decodeAs<GeneratedManifest>(GeneratedManifestSchema, manifest)
    );
    const mcpEndpoint =
        metadata.url === ""
            ? "https://mcp.localhost"
            : `https://mcp.${new URL(metadata.url).host.replace(/^www\./u, "")}`;
    return {
        agent,
        api,
        banner,
        footer,
        landing,
        manifests,
        mcpEndpoint,
        metadata,
        navigation,
        packages,
        redirects,
        routing,
        storybook,
        tokens,
        vercel,
        versions
    };
};
export /** @internal */ const decodeDocsConfig = (
    input: unknown
): Result.Result<DocsConfig, DocsConfigError> =>
{
    const decoded = decodeInput(input);
    if (Result.isFailure(decoded))
    {
        return Result.fail(decoded.failure);
    }
    const normalized = normalizeDocsConfig(decoded.success);
    const diagnostics = validate(normalized);
    return diagnostics.length > 0
        ? Result.fail(new DocsConfigError({ diagnostics }))
        : Result.succeed(normalized);
};
export /** @internal */ const decodeDocsConfigSync = (
    input: unknown
): DocsConfig =>
{
    const decoded = decodeDocsConfig(input);
    if (Result.isFailure(decoded))
    {
        throw decoded.failure;
    }
    return decoded.success;
};
export /** @internal */ const decodeDocsConfigEffect = (
    input: unknown
): Effect.Effect<DocsConfig, DocsConfigError> =>
    Effect.suspend(() =>
    {
        const decoded = decodeDocsConfig(input);
        return Result.isFailure(decoded)
            ? Effect.fail(decoded.failure)
            : Effect.succeed(decoded.success);
    });
