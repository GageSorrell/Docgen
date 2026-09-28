/**
 *
 *
 * @module @sorrell/docs-core/Schemas
 *
 * @file      Schemas.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { Schema } from "effect";

const optionalString = Schema.optionalKey(Schema.String);
const optionalNumber = Schema.optionalKey(Schema.Number);
const optionalBoolean = Schema.optionalKey(Schema.Boolean);
export/** @internal */
const RepositorySchema = Schema.Struct({
    branch: Schema.optionalKey(Schema.String),
    directory: optionalString,
    url: Schema.String
});
export/** @internal */
const SiteMetadataSchema = Schema.Struct({
    description: Schema.String,
    logo: optionalString,
    name: Schema.String,
    repository: Schema.optionalKey(RepositorySchema),
    title: Schema.String,
    url: Schema.String
});
export/** @internal */
const ColorTokensSchema = Schema.Struct({
    accent: Schema.String,
    background: Schema.String,
    border: Schema.String,
    cardBackground: Schema.optionalKey(Schema.String),
    codeBackground: Schema.String,
    foreground: Schema.String,
    muted: Schema.String,
    proseForeground: Schema.optionalKey(Schema.String),
    subtleForeground: Schema.optionalKey(Schema.String)
});
export/** @internal */
const DesignTokensSchema = Schema.Struct({
    dark: ColorTokensSchema,
    light: ColorTokensSchema
});
/** @internal */
export interface NavigationItem {
    readonly id: string;
    readonly label: string;
    readonly href: string;
    readonly kind: "page" | "section" | "external";
    readonly children?: ReadonlyArray<NavigationItem>;
}
/** @internal */
export interface NavigationGroup {
    readonly id: string;
    readonly label: string;
    readonly items: ReadonlyArray<NavigationItem>;
}
/** @internal */
export interface Navigation {
    readonly groups: ReadonlyArray<NavigationGroup>;
}
/** @internal */
export interface NavigationItemInput {
    readonly id: string;
    readonly label: string;
    readonly href: string;
    readonly kind?: "page" | "section" | "external";
    readonly children?: ReadonlyArray<NavigationItemInput>;
}
export/** @internal */
const NavigationItemSchema = Schema.Struct({
    children: Schema.optionalKey(
        Schema.Array(Schema.suspend(() => NavigationItemSchema))
    ),
    href: Schema.String,
    id: Schema.String,
    kind: Schema.Literals([ "page", "section", "external" ]),
    label: Schema.String
}) as Schema.Schema<NavigationItem>;
export/** @internal */
const NavigationGroupSchema = Schema.Struct({
    id: Schema.String,
    items: Schema.Array(NavigationItemSchema),
    label: Schema.String
});
export/** @internal */
const NavigationSchema = Schema.Struct({
    groups: Schema.Array(NavigationGroupSchema)
}) as Schema.Schema<Navigation>;
export/** @internal */
const DocumentationVersionSchema = Schema.Struct({
    current: Schema.Boolean,
    directory: Schema.String,
    href: optionalString,
    id: Schema.String,
    label: Schema.String,
    order: Schema.Number,
    version: optionalString
});
export/** @internal */
const PackageReferenceSchema = Schema.Struct({
    description: optionalString,
    directory: optionalString,
    id: Schema.String,
    name: Schema.String,
    source: Schema.optionalKey(RepositorySchema),
    version: optionalString
});
export/** @internal */
const LandingSectionSchema = Schema.Struct({
    body: Schema.String,
    href: optionalString,
    id: Schema.String,
    title: Schema.String
});
export/** @internal */
const LandingContentSchema = Schema.Struct({
    description: Schema.String,
    primaryAction: Schema.optionalKey(
        Schema.Struct({
            href: Schema.String,
            label: Schema.String
        })
    ),
    sections: Schema.Array(LandingSectionSchema),
    title: Schema.String
});
export/** @internal */
const RedirectSchema = Schema.Struct({
    from: Schema.String,
    status: Schema.Literals([ 301, 302 ]),
    to: Schema.String
});
export/** @internal */
const StorybookConfigSchema = Schema.Struct({
    command: optionalString,
    directory: optionalString,
    enabled: Schema.Boolean,
    stories: Schema.Array(Schema.String),
    url: optionalString
});
export/** @internal */
const ApiGenerationConfigSchema = Schema.Struct({
    enabled: Schema.Boolean,
    entryPoints: Schema.Array(Schema.String),
    outputDirectory: Schema.String,
    packages: Schema.Array(Schema.String),
    sourceRepository: Schema.optionalKey(RepositorySchema),
    typedoc: Schema.Record(Schema.String, Schema.Unknown)
});
export/** @internal */
const SiteRoutingSchema = Schema.Struct({
    documentationPrefix: Schema.String,
    storybookPrefix: Schema.String
});
export/** @internal */
const VercelProjectSchema = Schema.Struct({
    directory: Schema.String,
    id: optionalString,
    origin: optionalString,
    productionBranch: optionalString,
    project: optionalString,
    routePrefix: Schema.String,
    team: optionalString
});
export/** @internal */
const VercelProjectsSchema = Schema.Struct({
    documentation: VercelProjectSchema,
    landing: VercelProjectSchema,
    mcp: Schema.optionalKey(VercelProjectSchema),
    storybook: Schema.optionalKey(VercelProjectSchema)
});
export/** @internal */
const VercelDeploymentSchema = Schema.Struct({
    deploymentId: Schema.String,
    project: Schema.String,
    revision: optionalString,
    url: Schema.String
});
export/** @internal */
const VercelDeploymentsSchema = Schema.Struct({
    documentation: VercelDeploymentSchema,
    landing: VercelDeploymentSchema,
    mcp: Schema.optionalKey(VercelDeploymentSchema),
    storybook: Schema.optionalKey(VercelDeploymentSchema)
});
export/** @internal */
const AgentSearchIndexEntrySchema = Schema.Struct({
    id: Schema.String,
    terms: Schema.Array(Schema.String),
    version: optionalString
});
export/** @internal */
const AgentSearchIndexSchema = Schema.Struct({
    checksum: Schema.String,
    entries: Schema.Array(AgentSearchIndexEntrySchema),
    version: Schema.Literals([ 1 ])
});
export/** @internal */
const VercelReleaseManifestSchema = Schema.Struct({
    apiSnapshot: optionalString,
    deployments: VercelDeploymentsSchema,
    generatedAt: Schema.String,
    landingConfig: Schema.Unknown,
    mcpEndpoint: optionalString,
    mode: Schema.Literals([ "preview", "production" ]),
    previousReleaseId: optionalString,
    publicUrl: Schema.String,
    releaseId: Schema.String,
    revision: Schema.String,
    routes: SiteRoutingSchema,
    version: Schema.Literals([ 2 ])
});
export/** @internal */
const VercelConfigSchema = Schema.Struct({
    domains: Schema.Array(Schema.String),
    enabled: Schema.Boolean,
    outputDirectory: Schema.String,
    productionBranch: Schema.String,
    project: optionalString,
    projects: VercelProjectsSchema,
    team: optionalString
});
export/** @internal */
const GeneratedManifestSchema = Schema.Struct({
    checksum: optionalString,
    generatedAt: Schema.optionalKey(Schema.String),
    kind: Schema.Literals([ "site", "api-reference", "storybook", "project" ]),
    path: Schema.String,
    revision: optionalString
});
export/** @internal */
const ApiReferenceBreadcrumbSchema = Schema.Struct({
    current: Schema.Boolean,
    href: optionalString,
    label: Schema.String
});
export/** @internal */
const ApiReferenceCategorySchema = Schema.Struct({
    collapsed: Schema.Boolean,
    id: Schema.String,
    label: Schema.String,
    order: Schema.Number
});
export/** @internal */
const ApiReferenceSourceSchema = Schema.Struct({
    endLine: optionalNumber,
    file: Schema.String,
    line: optionalNumber,
    repositoryUrl: Schema.String,
    revision: Schema.String
});
export/** @internal */
const StableLinkSchema = Schema.Struct({
    external: Schema.Boolean,
    href: Schema.String,
    label: optionalString
});
export/** @internal */
const ApiReferenceDeclarationSchema = Schema.Struct({
    categoryId: Schema.String,
    description: Schema.String,
    id: Schema.String,
    introductionVersion: optionalString,
    kind: Schema.Literals([
        "function",
        "const",
        "class",
        "interface",
        "type",
        "variable",
        "namespace"
    ]),
    link: Schema.optionalKey(StableLinkSchema),
    name: Schema.String,
    signature: Schema.String,
    source: Schema.optionalKey(ApiReferenceSourceSchema)
});
export/** @internal */
const ApiReferenceRecordSchema = Schema.Struct({
    breadcrumbs: Schema.Array(ApiReferenceBreadcrumbSchema),
    categories: Schema.Array(ApiReferenceCategorySchema),
    declarations: Schema.Array(ApiReferenceDeclarationSchema),
    displayName: Schema.String,
    exportCount: Schema.Number,
    introductionVersion: optionalString,
    link: Schema.optionalKey(StableLinkSchema),
    module: Schema.String,
    packageId: Schema.String,
    packageName: Schema.String,
    packageDescription: Schema.optionalKey(Schema.String),
    packageExports: Schema.optionalKey(Schema.Array(Schema.String)),
    packagePrivate: Schema.optionalKey(Schema.Boolean),
    packageSourceUrl: Schema.optionalKey(Schema.String),
    source: Schema.optionalKey(ApiReferenceSourceSchema),
    summary: Schema.optionalKey(Schema.String),
    version: Schema.String
});
export/** @internal */
const AgentDocumentSchema = Schema.Struct({
    content: Schema.String,
    context: optionalString,
    description: optionalString,
    id: Schema.String,
    kind: Schema.Literals([ "article", "api-module", "component" ]),
    metadata: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
    source: Schema.optionalKey(ApiReferenceSourceSchema),
    title: Schema.String,
    url: Schema.String,
    version: optionalString
});
export/** @internal */
const AgentManifestEntrySchema = Schema.Struct({
    checksum: Schema.String,
    id: Schema.String,
    kind: Schema.Literals([ "article", "api-module", "component" ]),
    markdownUrl: Schema.String,
    title: Schema.String,
    url: Schema.String,
    version: optionalString
});
export/** @internal */
const AgentSkillArtifactSchema = Schema.Struct({
    archive: Schema.String,
    checksum: Schema.String,
    directory: Schema.String,
    name: Schema.String
});
export/** @internal */
const AgentManifestSchema = Schema.Struct({
    checksum: Schema.String,
    documents: Schema.Array(AgentManifestEntrySchema),
    generatedAt: Schema.String,
    mcpEndpoint: optionalString,
    skills: Schema.optionalKey(Schema.Array(AgentSkillArtifactSchema)),
    version: Schema.Literals([ 1 ]),
    versions: Schema.Array(Schema.String)
});
export/** @internal */
const AgentCorpusSchema = Schema.Struct({
    checksum: Schema.String,
    documents: Schema.Array(AgentDocumentSchema),
    generatedAt: Schema.String,
    sourceRevision: optionalString,
    version: Schema.Literals([ 1 ])
});
export/** @internal */
const AgentSkillConfigSchema = Schema.Struct({
    enabled: Schema.Boolean,
    name: Schema.String
});
export/** @internal */
const AgentConfigSchema = Schema.Struct({
    description: optionalString,
    enabled: Schema.Boolean,
    essentials: Schema.Array(Schema.String),
    mcp: Schema.Struct({ enabled: Schema.Boolean }),
    skill: AgentSkillConfigSchema
});
const OptionalSiteMetadataSchema = Schema.Struct({
    description: optionalString,
    logo: optionalString,
    name: Schema.optionalKey(Schema.String),
    repository: Schema.optionalKey(RepositorySchema),
    title: optionalString,
    url: optionalString
});
const OptionalColorTokensSchema = Schema.Struct({
    accent: optionalString,
    background: optionalString,
    border: optionalString,
    cardBackground: optionalString,
    codeBackground: optionalString,
    foreground: optionalString,
    muted: optionalString,
    proseForeground: optionalString,
    subtleForeground: optionalString
});
const OptionalDesignTokensSchema = Schema.Struct({
    dark: Schema.optionalKey(OptionalColorTokensSchema),
    light: Schema.optionalKey(OptionalColorTokensSchema)
});
const OptionalNavigationItemSchema = Schema.Struct({
    children: Schema.optionalKey(
        Schema.Array(Schema.suspend(() => OptionalNavigationItemSchema))
    ),
    href: Schema.String,
    id: Schema.String,
    kind: Schema.optionalKey(Schema.Literals([ "page", "section", "external" ])),
    label: Schema.String
}) as Schema.Schema<NavigationItemInput>;
const OptionalNavigationSchema = Schema.Struct({
    groups: Schema.optionalKey(
        Schema.Array(
            Schema.Struct({
                id: Schema.String,
                items: Schema.Array(OptionalNavigationItemSchema),
                label: Schema.String
            })
        )
    )
});
const OptionalVersionSchema = Schema.Struct({
    current: optionalBoolean,
    directory: optionalString,
    href: optionalString,
    id: Schema.String,
    label: optionalString,
    order: optionalNumber,
    version: optionalString
});
const OptionalPackageSchema = Schema.Struct({
    description: optionalString,
    directory: optionalString,
    id: Schema.String,
    name: Schema.String,
    source: Schema.optionalKey(RepositorySchema),
    version: optionalString
});
const OptionalLandingSchema = Schema.Struct({
    description: optionalString,
    primaryAction: Schema.optionalKey(
        Schema.Struct({
            href: Schema.String,
            label: Schema.String
        })
    ),
    sections: Schema.optionalKey(
        Schema.Array(
            Schema.Struct({
                body: optionalString,
                href: optionalString,
                id: Schema.String,
                title: Schema.String
            })
        )
    ),
    title: optionalString
});
const OptionalRedirectSchema = Schema.Struct({
    from: Schema.String,
    status: Schema.optionalKey(Schema.Literals([ 301, 302 ])),
    to: Schema.String
});
const OptionalStorybookSchema = Schema.Struct({
    command: optionalString,
    directory: optionalString,
    enabled: optionalBoolean,
    stories: Schema.optionalKey(Schema.Array(Schema.String)),
    url: optionalString
});
const OptionalApiSchema = Schema.Struct({
    enabled: optionalBoolean,
    entryPoints: Schema.optionalKey(Schema.Array(Schema.String)),
    outputDirectory: optionalString,
    packages: Schema.optionalKey(Schema.Array(Schema.String)),
    sourceRepository: Schema.optionalKey(RepositorySchema),
    typedoc: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown))
});
const OptionalAgentSchema = Schema.Struct({
    description: optionalString,
    enabled: optionalBoolean,
    essentials: Schema.optionalKey(Schema.Array(Schema.String)),
    mcp: Schema.optionalKey(Schema.Struct({ enabled: optionalBoolean })),
    skill: Schema.optionalKey(
        Schema.Struct({
            enabled: optionalBoolean,
            name: optionalString
        })
    )
});
const OptionalRoutingSchema = Schema.Struct({
    documentationPrefix: optionalString,
    storybookPrefix: optionalString
});
const OptionalVercelProjectSchema = Schema.Struct({
    directory: optionalString,
    id: optionalString,
    origin: optionalString,
    productionBranch: optionalString,
    project: optionalString,
    routePrefix: optionalString,
    team: optionalString
});
const OptionalVercelProjectsSchema = Schema.Struct({
    documentation: Schema.optionalKey(OptionalVercelProjectSchema),
    landing: Schema.optionalKey(OptionalVercelProjectSchema),
    mcp: Schema.optionalKey(OptionalVercelProjectSchema),
    storybook: Schema.optionalKey(OptionalVercelProjectSchema)
});
const OptionalVercelSchema = Schema.Struct({
    domains: Schema.optionalKey(Schema.Array(Schema.String)),
    enabled: optionalBoolean,
    outputDirectory: optionalString,
    productionBranch: optionalString,
    project: optionalString,
    projects: Schema.optionalKey(OptionalVercelProjectsSchema),
    team: optionalString
});
const OptionalManifestSchema = Schema.Struct({
    checksum: optionalString,
    generatedAt: optionalString,
    kind: Schema.Literals([ "site", "api-reference", "storybook", "project" ]),
    path: Schema.String,
    revision: optionalString
});
export/** @internal */
const DocsConfigInputSchema = Schema.Struct({
    agent: Schema.optionalKey(OptionalAgentSchema),
    api: Schema.optionalKey(OptionalApiSchema),
    landing: Schema.optionalKey(OptionalLandingSchema),
    manifests: Schema.optionalKey(Schema.Array(OptionalManifestSchema)),
    metadata: Schema.optionalKey(OptionalSiteMetadataSchema),
    navigation: Schema.optionalKey(OptionalNavigationSchema),
    packages: Schema.optionalKey(Schema.Array(OptionalPackageSchema)),
    redirects: Schema.optionalKey(Schema.Array(OptionalRedirectSchema)),
    routing: Schema.optionalKey(OptionalRoutingSchema),
    storybook: Schema.optionalKey(OptionalStorybookSchema),
    tokens: Schema.optionalKey(OptionalDesignTokensSchema),
    vercel: Schema.optionalKey(OptionalVercelSchema),
    versions: Schema.optionalKey(Schema.Array(OptionalVersionSchema))
});
/** @internal */
export type SiteMetadata = Schema.Schema.Type<typeof SiteMetadataSchema>;
/** @internal */
export type DesignTokens = Schema.Schema.Type<typeof DesignTokensSchema>;
/** @internal */
export type DocumentationVersion = Schema.Schema.Type<
    typeof DocumentationVersionSchema
>;
/** @internal */
export type PackageReference = Schema.Schema.Type<
    typeof PackageReferenceSchema
>;
/** @internal */
export type LandingContent = Schema.Schema.Type<typeof LandingContentSchema>;
/** @internal */
export type Redirect = Schema.Schema.Type<typeof RedirectSchema>;
/** @internal */
export type StorybookConfig = Schema.Schema.Type<typeof StorybookConfigSchema>;
/** @internal */
export type ApiGenerationConfig = Schema.Schema.Type<
    typeof ApiGenerationConfigSchema
>;
/** @internal */
export type SiteRouting = Schema.Schema.Type<typeof SiteRoutingSchema>;
/** @internal */
export type VercelProject = Schema.Schema.Type<typeof VercelProjectSchema>;
/** @internal */
export type VercelProjects = Schema.Schema.Type<typeof VercelProjectsSchema>;
/** @internal */
export type VercelDeployment = Schema.Schema.Type<
    typeof VercelDeploymentSchema
>;
/** @internal */
export type VercelReleaseManifest = Schema.Schema.Type<
    typeof VercelReleaseManifestSchema
>;
/** @internal */
export type VercelConfig = Schema.Schema.Type<typeof VercelConfigSchema>;
/** @internal */
export type GeneratedManifest = Schema.Schema.Type<
    typeof GeneratedManifestSchema
>;
/** @internal */
export type ApiReferenceBreadcrumb = Schema.Schema.Type<
    typeof ApiReferenceBreadcrumbSchema
>;
/** @internal */
export type ApiReferenceCategory = Schema.Schema.Type<
    typeof ApiReferenceCategorySchema
>;
/** @internal */
export type ApiReferenceSource = Schema.Schema.Type<
    typeof ApiReferenceSourceSchema
>;
/** @internal */
export type StableLink = Schema.Schema.Type<typeof StableLinkSchema>;
/** @internal */
export type ApiReferenceDeclaration = Schema.Schema.Type<
    typeof ApiReferenceDeclarationSchema
>;
/** @internal */
export type ApiReferenceRecord = Schema.Schema.Type<
    typeof ApiReferenceRecordSchema
>;
/** @internal */
export type AgentDocument = Schema.Schema.Type<typeof AgentDocumentSchema>;
/** @internal */
export type AgentManifestEntry = Schema.Schema.Type<
    typeof AgentManifestEntrySchema
>;
/** @internal */
export type AgentManifest = Schema.Schema.Type<typeof AgentManifestSchema>;
/** @internal */
export type AgentSearchIndex = Schema.Schema.Type<
    typeof AgentSearchIndexSchema
>;
/** @internal */
export type AgentCorpus = Schema.Schema.Type<typeof AgentCorpusSchema>;
/** @internal */
export type AgentConfig = Schema.Schema.Type<typeof AgentConfigSchema>;
/** @internal */
export type AgentSkillConfig = Schema.Schema.Type<
    typeof AgentSkillConfigSchema
>;
/** @internal */
export type AgentSkillArtifact = Schema.Schema.Type<
    typeof AgentSkillArtifactSchema
>;
/** @internal */
export type DocsConfigInput = Schema.Schema.Type<typeof DocsConfigInputSchema>;
