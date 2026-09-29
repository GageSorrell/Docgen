/**
 *
 *
 * @module @sorrell/docs-api-reference/Test/TypeDoc.test
 *
 * @file      TypeDoc.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateApiDataset } from "../Source/TypeDoc.js";
describe("TypeDoc generation", () =>
{
    it("generates a Draft 2020-12 schema reference and normalizes its route", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-schema-"));
        const schema = {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            $defs: { Shared: { type: "string", minLength: 2 } },
            description: "Example schema.",
            properties: {
                active: true,
                external: { $ref: "https://example.test/schema.json#/$defs/Name" },
                internal: { $ref: "#/$defs/Shared" },
                name: { maxLength: 30, type: "string" }
            },
            required: [ "name" ],
            title: "Example Config",
            type: "object"
        };
        await mkdir(join(root, "schemas"));
        await writeFile(join(root, "schemas/example.json"), JSON.stringify(schema));
        const warning = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        try
        {
            const dataset = await generateApiDataset({
                generatedAt: "2026-09-24T00:00:00.000Z",
                jsonSchemas: [ { path: "schemas/example.json", route: "config/example/" } ],
                packages: [],
                repositoryRoot: root
            });
            expect(dataset.records).toEqual([]);
            expect(dataset.jsonSchemas?.[0]).toMatchObject({
                description: "Example schema.",
                path: "schemas/example.json",
                route: "/docs/config/example/",
                title: "Example Config"
            });
            expect(warning).toHaveBeenCalledWith(expect.stringContaining("\"config/example/\""));
            expect(warning).toHaveBeenCalledWith(expect.stringContaining("\"/docs/config/example/\""));
        }
        finally
        {
            warning.mockRestore();
            await rm(root, { force: true, recursive: true });
        }
    });

    it("requires an explicit Draft 2020-12 dialect and rejects unreadable or invalid files", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-schema-invalid-"));
        const schemaPath = join(root, "schema.json");
        const options = { generatedAt: "2026-09-24T00:00:00.000Z", packages: [], repositoryRoot: root, jsonSchemas: [ { path: "schema.json", route: "/docs/schema/" } ] };
        try
        {
            await expect(generateApiDataset(options)).rejects.toThrow("could not read JSON Schema");
            await writeFile(schemaPath, JSON.stringify({ type: "object" }));
            await expect(generateApiDataset(options)).rejects.toThrow("must declare $schema");
            await writeFile(schemaPath, JSON.stringify({ $schema: "https://json-schema.org/draft-07/schema#", type: "object" }));
            await expect(generateApiDataset(options)).rejects.toThrow("must declare $schema");
            await writeFile(schemaPath, "{");
            await expect(generateApiDataset(options)).rejects.toThrow("contains invalid JSON");
            await writeFile(schemaPath, JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" }));
            await expect(generateApiDataset({
                ...options,
                jsonSchemas: [ { path: schemaPath, route: "/docs/schema/" } ]
            })).rejects.toThrow("must be relative to the repository root");
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });

    it("rejects duplicate schema routes", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-schema-duplicate-"));
        const schemaPath = join(root, "schema.json");
        await writeFile(schemaPath, JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" }));
        try
        {
            await expect(generateApiDataset({
                packages: [], repositoryRoot: root,
                jsonSchemas: [ { path: "schema.json", route: "/docs/schema/" }, { path: "schema.json", route: "/docs/schema/" } ]
            })).rejects.toThrow("duplicate JSON Schema route");
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });

    it("rejects a schema route that collides with a TypeScript API route", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-schema-api-collision-"));
        await writeFile(join(root, "schema.json"), JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" }));
        const entryPoint = fileURLToPath(new URL("./Fixtures/Single/Source/index.ts", import.meta.url));
        const tsconfig = fileURLToPath(new URL("./Fixtures/Single/tsconfig.json", import.meta.url));
        try
        {
            await expect(generateApiDataset({
                packages: [ { entryPoints: [ entryPoint ], id: "single", name: "@sorrell/single-fixture", tsconfig, version: "1.0.0" } ],
                jsonSchemas: [ { path: "schema.json", route: "/docs/api/single" } ],
                repositoryRoot: root
            })).rejects.toThrow("collides with a TypeScript API reference route");
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });

    it("uses the package URL as the module page when a package has one exported module", async () =>
    {
        const entryPoint = fileURLToPath(
            new URL("./Fixtures/Single/Source/index.ts", import.meta.url)
        );
        const tsconfig = fileURLToPath(
            new URL("./Fixtures/Single/tsconfig.json", import.meta.url)
        );
        const dataset = await generateApiDataset({
            generatedAt: "2026-09-24T00:00:00.000Z",
            packages: [
                {
                    entryPoints: [ entryPoint ],
                    id: "single",
                    name: "@sorrell/single-fixture",
                    tsconfig,
                    version: "1.0.0"
                }
            ]
        });
        expect(dataset.records).toHaveLength(1);
        expect(dataset.records[0]?.link?.href).toBe("/docs/api/single");
        expect(dataset.records[0]?.declarations.find((declaration) => declaration.name === "linkToOnly")?.descriptionParts)
            .toContainEqual(expect.objectContaining({
                external: false,
                href: "/docs/api/single#only",
                kind: "link",
                text: "the only export"
            }));
    });

    it("discovers exported declarations programmatically", async () =>
    {
        const entryPoint = fileURLToPath(
            new URL("./Fixtures/ApiFixture.ts", import.meta.url)
        );
        const tsconfig = fileURLToPath(
            new URL("./Fixtures/tsconfig.json", import.meta.url)
        );
        const dataset = await generateApiDataset({
            generatedAt: "2026-09-24T00:00:00.000Z",
            packages: [
                {
                    entryPoints: [ entryPoint ],
                    id: "fixture",
                    name: "@sorrell/fixture",
                    tsconfig,
                    version: "1.0.1"
                }
            ]
        });
        expect(dataset.records).toHaveLength(2);
        const rootModule = dataset.records.find((record) => record.module === "fixture");
        const extraModule = dataset.records.find((record) => record.module === "fixture/Extra");
        expect(rootModule?.breadcrumbs[1]?.label).toBe("V1.0.1");
        expect(rootModule?.breadcrumbs.map((breadcrumb) => breadcrumb.label)).toEqual([
            "API Reference",
            "V1.0.1",
            "@sorrell/fixture"
        ]);
        expect(rootModule?.breadcrumbs.at(-1)).toMatchObject({
            current: true,
            label: "@sorrell/fixture"
        });
        expect(rootModule?.packageDescription)
            .toBe("A fixture package with an exported root module.");
        expect(rootModule?.packagePrivate).toBe(false);
        expect(rootModule?.packageSourceUrl).toBe("https://github.com/Sorrell/fixture");
        expect(rootModule?.packageExports).toEqual([ ".", "./Extra" ]);
        expect(rootModule?.introductionVersion).toBeUndefined();
        expect(rootModule?.link?.href).toBe("/docs/api/fixture/Core");
        expect(extraModule?.displayName).toBe("Extra");
        expect(extraModule?.breadcrumbs.map((breadcrumb) => breadcrumb.label)).toEqual([
            "API Reference",
            "V1.0.1",
            "@sorrell/fixture",
            "Extra"
        ]);
        expect(extraModule?.link?.href).toBe("/docs/api/fixture/Extra");
        expect(extraModule?.introductionVersion).toBe("1.0.1");
        expect(rootModule?.declarations.find((declaration) => declaration.name === "hello")?.category)
            .toBe("Greetings");
        expect(rootModule?.declarations.find((declaration) => declaration.name === "hello")?.description)
            .toBe("Returns a greeting.");
        expect(rootModule?.declarations.find((declaration) => declaration.name === "hello")?.examples)
            .toEqual([
                {
                    code: "const greeting = hello();",
                    language: "typescript",
                    name: "Selecting the data-first style"
                },
                {
                    code: "hello();",
                    language: "typescript"
                }
            ]);
        expect(rootModule?.declarations.find((declaration) => declaration.name === "undocumented")?.description)
            .toBeUndefined();
        expect(rootModule?.declarations.find((declaration) => declaration.name === "Greeting")?.category)
            .toBeUndefined();
        const linkedReferences = rootModule?.declarations.find(
            (declaration) => declaration.name === "linkedReferences"
        );
        expect(linkedReferences?.descriptionParts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    external: false,
                    href: "/docs/api/fixture/Core#hello",
                    kind: "link",
                    text: "the greeting function"
                }),
                expect.objectContaining({
                    external: true,
                    href: "https://example.com",
                    kind: "link",
                    text: "the external site"
                }),
                expect.objectContaining({
                    external: false,
                    href: "https://www.npmjs.com/package/effect",
                    kind: "link",
                    text: "Effect.gen"
                })
            ])
        );
        const extraRootLink = extraModule?.declarations.find(
            (declaration) => declaration.name === "rootGreeting"
        )?.descriptionParts?.find((part) => part.kind === "link");
        expect(extraRootLink).toMatchObject({
            external: false,
            href: "/docs/api/fixture/Core#hello",
            text: "greeting function"
        });
        expect(
            dataset.records[0]?.declarations.some(
                (declaration: {
                    readonly id: string;
                    readonly name: string;
                    readonly kind:
                        | "function"
                        | "const"
                        | "class"
                        | "interface"
                        | "type"
                        | "variable"
                        | "namespace";
                    readonly categoryId: string;
                    readonly description?: string;
                    readonly signature: string;
                    readonly introductionVersion?: string;
                    readonly source?: {
                        readonly repositoryUrl: string;
                        readonly revision: string;
                        readonly file: string;
                        readonly line?: number;
                        readonly endLine?: number;
                    };
                    readonly link?: {
                        readonly href: string;
                        readonly external: boolean;
                        readonly label?: string;
                    };
                }) => declaration.name === "hello"
            )
        ).toBe(true);
    });
});
