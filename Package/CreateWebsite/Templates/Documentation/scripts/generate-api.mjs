/**
 * Generate configured TypeDoc and JSON Schema API references.
 *
 * @file      generate-api.mjs
 * @author    Sorrell Documentation
 * @license   MIT
 */

import * as ApiReference from "@sorrell/docs-api-reference";
import * as Effect from "effect/Effect";
import { dirname, join, relative, resolve } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";

/** @type {string} */
let repositoryRoot = resolve(".");
while (
    !existsSync(join(repositoryRoot, "Package/Core/Source/index.ts")) &&
    dirname(repositoryRoot) !== repositoryRoot
)
{
    repositoryRoot = dirname(repositoryRoot);
}
const configPath = [
    join(repositoryRoot, "docs.config.json"),
    join(repositoryRoot, "Documentation/docs.config.json")
].find(existsSync);
if (configPath === undefined)
{
    throw new Error("Could not locate docs.config.json from the repository root.");
}
const config = JSON.parse(readFileSync(configPath, "utf8"));
const api = config.api ?? {};
/**
 * @type {Map<string, { entryPoints: string[]; id: string; name: string; tsconfig: string; version: string }>}
 */
const packages = new Map();
for (const configuredEntry of api.entryPoints ?? [])
{
    const entryPoint = resolve(repositoryRoot, configuredEntry);
    const packageDirectory = dirname(dirname(entryPoint));
    const manifestPath = join(packageDirectory, "package.json");
    if (!existsSync(entryPoint) || !existsSync(manifestPath))
    {
        throw new Error(`Configured API entry point or package manifest is missing: ${configuredEntry}`);
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!(api.packages ?? []).includes(manifest.name))
    {
        continue;
    }
    const packageInput = packages.get(manifest.name) ?? {
        entryPoints: [],
        id: manifest.name.replace(/^@sorrell\/docs-/u, ""),
        name: manifest.name,
        tsconfig: join(packageDirectory, "tsconfig.json"),
        version: manifest.version ?? "0.0.0"
    };
    packageInput.entryPoints.push(entryPoint);
    packages.set(manifest.name, packageInput);
}
const dataset = await ApiReference.generateApiDataset({
    generatedAt: process.env.SORRELL_API_GENERATED_AT ?? "2026-09-24T00:00:00.000Z",
    jsonSchemas: api.jsonSchemas ?? [],
    packages: api.enabled === false ? [] : [ ...packages.values() ],
    repositoryRoot,
    repositoryUrl: api.sourceRepository?.url ?? config.metadata.repository?.url,
    revision: api.sourceRepository?.branch ?? config.metadata.repository?.branch ?? "main",
    sourceRoot: repositoryRoot,
    typedoc: api.typedoc ?? {}
});
const sourceContent = resolve("Source/content/docs");

/**
 * Collects article routes recursively from a content directory.
 * @param {string} directory - Directory to inspect recursively.
 * @returns {ReadonlyArray<string>} The route slugs relative to the content root.
 * @type {(directory: string) => ReadonlyArray<string>}
 */
/* eslint-disable @typescript-eslint/typedef -- JSDoc types annotate JavaScript function parameters. */
const markdownRoutes = (/** @type {string} */ directory) =>
{
    /**
     * Maps one filesystem entry to its documentation routes.
     * @param {{ name: string; isDirectory: () => boolean }} entry - Directory entry to inspect.
     * @type {(entry: { name: string; isDirectory: () => boolean }) => ReadonlyArray<string>}
     */
    const routesForEntry = (/** @type {{ name: string; isDirectory: () => boolean }} */ entry) =>
    {
        const path = join(directory, entry.name);
        if (entry.isDirectory())
        {
            return markdownRoutes(path);
        }
        if (!/\.mdx?$/u.test(entry.name))
        {
            return [];
        }
        const route = relative(sourceContent, path)
            .replace(/\\/gu, "/")
            .replace(/\.mdx?$/u, "")
            .replace(/(?:^|\/)index$/u, "")
            .replace(/\/$/u, "");
        return [ route ];
    };
    return readdirSync(directory, { withFileTypes: true }).flatMap(routesForEntry);
};
/* eslint-enable @typescript-eslint/typedef */
if (existsSync(sourceContent))
{
    const authoredRoutes = new Set(markdownRoutes(sourceContent));
    for (const schema of dataset.jsonSchemas ?? [])
    {
        const slug = schema.route.replace(/^\/docs\/?/u, "").replace(/\/$/u, "");
        if (authoredRoutes.has(slug))
        {
            throw new Error(`JSON Schema route ${schema.route} collides with an authored documentation page`);
        }
    }
}
await Effect.runPromise(
    ApiReference.writeApiSnapshot(resolve("Source/data/ApiReference.json"), dataset).pipe(
        Effect.provide(ApiReference.ApiReferenceSnapshotStore.layer)
    )
);
process.stdout.write(
    `Generated ${dataset.records.length} TypeScript and ` +
    `${(dataset.jsonSchemas ?? []).length} JSON Schema API references.\n`
);
