/**
 * Doxygen XML generation coverage.
 *
 * @module @sorrell/docs-api-reference/Test/Doxygen.test
 *
 * @file      Doxygen.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { describe, expect, it } from "vitest";
import { copyFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateApiDataset } from "../Source/TypeDoc.js";
import { fileURLToPath } from "node:url";

const writeDoxygenFixture = async (root: string): Promise<void> =>
{
    const xml = join(root, "build", "xml");
    await mkdir(xml, { recursive: true });
    await writeFile(join(xml, "index.xml"), `<?xml version="1.0"?>
<doxygenindex version="1.9.8">
  <compound refid="namespace_demo" kind="namespace"><name>demo</name></compound>
  <compound refid="class_demo_1_1Widget" kind="class"><name>demo::Widget</name></compound>
</doxygenindex>`);
    await writeFile(join(xml, "namespace_demo.xml"), `<?xml version="1.0"?>
<doxygen><compounddef id="namespace_demo" kind="namespace">
  <compoundname>demo</compoundname>
  <briefdescription><para>Widget functions.</para></briefdescription>
  <sectiondef kind="func"><memberdef id="namespace_demo_1aadd" kind="function" prot="public">
    <type>int</type><name>add</name><argsstring>(int left, int right)</argsstring>
    <briefdescription><para>Adds two values.</para></briefdescription>
    <location file="include/widget.hpp" line="8" bodyend="11"/>
  </memberdef><memberdef id="namespace_demo_1ahidden" kind="function" prot="public">
    <type>void</type><name>undocumented</name><argsstring>()</argsstring>
  </memberdef></sectiondef>
</compounddef></doxygen>`);
    await writeFile(join(xml, "class_demo_1_1Widget.xml"), `<?xml version="1.0"?>
<doxygen><compounddef id="class_demo_1_1Widget" kind="class">
  <compoundname>demo::Widget</compoundname>
  <briefdescription><para>A sample widget.</para></briefdescription>
  <sectiondef kind="public-func"><memberdef id="class_demo_1_1Widget_1arun" kind="function" prot="public">
    <type>void</type><name>run</name><argsstring>() const</argsstring>
    <briefdescription><para>Runs the widget.</para></briefdescription>
    <location file="include/widget.hpp" line="18" bodyend="20"/>
  </memberdef></sectiondef>
  <sectiondef kind="private-func"><memberdef id="class_demo_1_1Widget_1asecret" kind="function" prot="private">
    <type>void</type><name>secret</name><argsstring>()</argsstring>
    <briefdescription><para>Private helper.</para></briefdescription>
  </memberdef></sectiondef>
  <sectiondef kind="public-type"><memberdef id="class_demo_1_1Widget_1aMode" kind="enum" prot="public" strong="yes">
    <type></type><name>Mode</name><briefdescription><para>Widget mode.</para></briefdescription>
  </memberdef><memberdef id="class_demo_1_1Widget_1aCount" kind="typedef" prot="public">
    <type>unsigned int</type><name>Count</name><briefdescription><para>Number of widgets.</para></briefdescription>
  </memberdef></sectiondef>
</compounddef></doxygen>`);
};
const writeUnrealDoxygenFixture = async (root: string): Promise<void> =>
{
    const xml = join(root, "xml");
    await mkdir(xml, { recursive: true });
    await writeFile(join(xml, "index.xml"), `<?xml version="1.0"?>
<doxygenindex>
  <compound refid="class_UExample" kind="class"><name>UExample</name></compound>
  <compound refid="struct_FSettings" kind="struct"><name>FSettings</name></compound>
  <compound refid="enum_EState" kind="enum"><name>EState</name></compound>
</doxygenindex>`);
    await writeFile(join(xml, "class_UExample.xml"), `<?xml version="1.0"?>
<doxygen><compounddef id="class_UExample" kind="class" prot="public">
  <compoundname>UExample</compoundname>
  <briefdescription><para>Unreal reflected actor API.</para></briefdescription>
  <sectiondef kind="public-func"><memberdef id="class_UExample_1aStart" kind="function" prot="public">
    <type>void</type><name>Start</name><argsstring>()</argsstring>
    <briefdescription><para>Starts the actor.</para></briefdescription>
  </memberdef></sectiondef>
  <sectiondef kind="public-attrib"><memberdef id="class_UExample_1aHealth" kind="property" prot="public">
    <type>float</type><name>Health</name>
    <briefdescription><para>Current actor health.</para></briefdescription>
  </memberdef></sectiondef>
</compounddef></doxygen>`);
    await writeFile(join(xml, "struct_FSettings.xml"), `<?xml version="1.0"?>
<doxygen><compounddef id="struct_FSettings" kind="struct" prot="public">
  <compoundname>FSettings</compoundname>
  <briefdescription><para>Public plugin settings.</para></briefdescription>
</compounddef></doxygen>`);
    await writeFile(join(xml, "enum_EState.xml"), `<?xml version="1.0"?>
<doxygen><compounddef id="enum_EState" kind="enum" prot="public">
  <compoundname>EState</compoundname>
  <briefdescription><para>Actor lifecycle state.</para></briefdescription>
  <sectiondef kind="enum"><memberdef id="enum_EState" kind="enum" prot="public">
    <name>EState</name>
    <enumvalue id="enum_EState_Ready"><name>Ready</name><initializer>= 0</initializer><briefdescription><para>Ready to run.</para></briefdescription></enumvalue>
    <enumvalue id="enum_EState_Stopped"><name>Stopped</name><briefdescription><para>Stopped.</para></briefdescription></enumvalue>
    <enumvalue id="enum_EState_Undocumented"><name>Undocumented</name></enumvalue>
  </memberdef></sectiondef>
</compounddef></doxygen>`);
};

describe("Doxygen XML generation", () =>
{
    it("generates one C++ reference page per documented compound with public members and source links", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-doxygen-"));
        try
        {
            await writeDoxygenFixture(root);
            const dataset = await generateApiDataset({
                doxygen: [ { id: "widgets", name: "Widgets", version: "2.1.0", xmlDirectory: "build/xml" } ],
                generatedAt: "2026-09-24T00:00:00.000Z",
                packages: [],
                repositoryRoot: root,
                repositoryUrl: "https://github.com/example/widgets",
                revision: "abc123"
            });
            const namespace = dataset.records.find((record) => record.displayName === "demo");
            const widget = dataset.records.find((record) => record.displayName === "demo::Widget");
            expect(dataset.records).toHaveLength(2);
            expect(namespace).toMatchObject({
                language: "cpp",
                link: { href: "/docs/api/widgets/demo" },
                declarations: [
                    { kind: "function", name: "add", signature: "int add(int left, int right);", source: { file: "include/widget.hpp", line: 8, revision: "abc123" } }
                ]
            });
            expect(widget).toMatchObject({
                language: "cpp",
                link: { href: "/docs/api/widgets/demo/Widget" }
            });
            expect(widget?.declarations).toEqual(expect.arrayContaining([
                expect.objectContaining({ kind: "function", name: "run", signature: "void run() const;" }),
                expect.objectContaining({ kind: "enum", name: "Mode", signature: "enum class Mode;" }),
                expect.objectContaining({ kind: "alias", name: "Count", signature: "typedef unsigned int Count;" })
            ]));
            expect(widget?.declarations.some((declaration) => declaration.name === "secret")).toBe(false);
            expect(namespace?.declarations.some((declaration) => declaration.name === "undocumented")).toBe(false);
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });

    it("combines Doxygen, TypeDoc, and JSON Schema references", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-api-mixed-"));
        try
        {
            await writeDoxygenFixture(root);
            const schemaPath = join(root, "config.schema.json");
            await writeFile(schemaPath, JSON.stringify({
                $schema: "https://json-schema.org/draft/2020-12/schema",
                properties: { enabled: { type: "boolean" } },
                title: "Widget Config",
                type: "object"
            }));
            const entryPoint = fileURLToPath(new URL("./Fixtures/ApiFixture.ts", import.meta.url));
            const tsconfig = fileURLToPath(new URL("./Fixtures/tsconfig.json", import.meta.url));
            const dataset = await generateApiDataset({
                doxygen: [ { id: "widgets", name: "Widgets", version: "2.1.0", xmlDirectory: "build/xml" } ],
                generatedAt: "2026-09-24T00:00:00.000Z",
                jsonSchemas: [ { path: "config.schema.json", route: "/docs/config" } ],
                packages: [ {
                    entryPoints: [ entryPoint ],
                    id: "fixture",
                    name: "@sorrell/fixture",
                    tsconfig,
                    version: "1.0.1"
                } ],
                repositoryRoot: root
            });
            expect(dataset.records.some((record) => record.language === "cpp")).toBe(true);
            expect(dataset.records.some((record) => record.language === "typescript")).toBe(true);
            expect(dataset.jsonSchemas?.map((schema) => schema.title)).toEqual([ "Widget Config" ]);
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });

    it("routes a one-compound C++ project through its package reference page", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-doxygen-single-"));
        try
        {
            await writeDoxygenFixture(root);
            await writeFile(join(root, "build", "xml", "index.xml"), `<?xml version="1.0"?>
<doxygenindex><compound refid="class_demo_1_1Widget" kind="class"><name>demo::Widget</name></compound></doxygenindex>`);
            const dataset = await generateApiDataset({
                doxygen: [ { id: "widgets", name: "Widgets", version: "2.1.0", xmlDirectory: "build/xml" } ],
                packages: [],
                repositoryRoot: root
            });
            expect(dataset.records).toHaveLength(1);
            expect(dataset.records[0]?.link?.href).toBe("/docs/api/widgets");
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });

    it("generates separate Unreal project and plugin references from descriptors and Doxygen XML", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-unreal-"));
        try
        {
            await writeUnrealDoxygenFixture(join(root, "project"));
            await mkdir(join(root, "plugin"), { recursive: true });
            for (const name of [ "index.xml", "class_UExample.xml", "struct_FSettings.xml", "enum_EState.xml" ])
            {
                await copyFile(join(root, "project", "xml", name), join(root, "plugin", name));
            }
            await mkdir(join(root, "Game", "Plugins", "Tools"), { recursive: true });
            await writeFile(join(root, "Game", "Game.uproject"), JSON.stringify({ FileVersion: 3 }));
            await writeFile(join(root, "Game", "Plugins", "Tools", "Tools.uplugin"), JSON.stringify({ FileVersion: 3, Modules: [] }));
            const dataset = await generateApiDataset({
                packages: [],
                repositoryRoot: root,
                unreal: {
                    plugins: [ {
                        descriptor: "Game/Plugins/Tools/Tools.uplugin",
                        id: "tools",
                        name: "Tools Plugin",
                        version: "2.0.0",
                        xmlDirectory: "plugin"
                    } ],
                    projects: [ {
                        descriptor: "Game/Game.uproject",
                        id: "game",
                        name: "Game Project",
                        version: "1.0.0",
                        xmlDirectory: "project/xml"
                    } ]
                }
            });
            expect(dataset.records).toHaveLength(6);
            expect(dataset.records).toEqual(expect.arrayContaining([
                expect.objectContaining({ displayName: "UExample", packageId: "game", link: { href: "/docs/api/game/UExample", external: false, label: "UExample" } }),
                expect.objectContaining({ displayName: "UExample", packageId: "tools", link: { href: "/docs/api/tools/UExample", external: false, label: "UExample" } }),
                expect.objectContaining({ displayName: "FSettings", packageId: "game", language: "cpp" }),
                expect.objectContaining({ displayName: "EState", packageId: "tools", summary: "Actor lifecycle state.", declarations: expect.arrayContaining([
                    expect.objectContaining({ name: "Ready", signature: "Ready = 0", description: "Ready to run." })
                ]) })
            ]));
            const actor = dataset.records.find((record) => record.packageId === "game" && record.displayName === "UExample");
            expect(actor?.declarations).toEqual(expect.arrayContaining([
                expect.objectContaining({ kind: "function", name: "Start" }),
                expect.objectContaining({ kind: "variable", name: "Health" })
            ]));
            expect(dataset.records.find((record) => record.displayName === "EState")?.declarations)
                .not.toEqual(expect.arrayContaining([ expect.objectContaining({ name: "Undocumented" }) ]));
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });

    it("validates Unreal descriptor extension, presence, and JSON", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-unreal-invalid-"));
        try
        {
            await mkdir(root, { recursive: true });
            await writeFile(join(root, "wrong.uplugin"), JSON.stringify({ FileVersion: 3 }));
            await writeFile(join(root, "broken.uproject"), "{");
            await writeFile(join(root, "valid.uproject"), JSON.stringify({ FileVersion: 3 }));
            await writeFile(join(root, "valid.uplugin"), JSON.stringify({ FileVersion: 3 }));
            await expect(generateApiDataset({
                packages: [],
                repositoryRoot: root,
                unreal: { projects: [ {
                    descriptor: "wrong.uplugin",
                    id: "game",
                    name: "Game",
                    version: "1.0.0",
                    xmlDirectory: "xml"
                } ] }
            })).rejects.toThrow("must end with .uproject");
            await expect(generateApiDataset({
                packages: [],
                repositoryRoot: root,
                unreal: { plugins: [ {
                    descriptor: "missing.uplugin",
                    id: "plugin",
                    name: "Plugin",
                    version: "1.0.0",
                    xmlDirectory: "xml"
                } ] }
            })).rejects.toThrow("could not read Unreal plugin descriptor");
            await expect(generateApiDataset({
                packages: [],
                repositoryRoot: root,
                unreal: { projects: [ {
                    descriptor: "broken.uproject",
                    id: "game",
                    name: "Game",
                    version: "1.0.0",
                    xmlDirectory: "xml"
                } ] }
            })).rejects.toThrow("contains invalid JSON");
            await expect(generateApiDataset({
                packages: [],
                repositoryRoot: root,
                unreal: {
                    plugins: [ {
                        descriptor: "valid.uplugin",
                        id: "same",
                        name: "Plugin",
                        version: "1.0.0",
                        xmlDirectory: "plugin-xml"
                    } ],
                    projects: [ {
                        descriptor: "valid.uproject",
                        id: "same",
                        name: "Project",
                        version: "1.0.0",
                        xmlDirectory: "project-xml"
                    } ]
                }
            })).rejects.toThrow("duplicate Doxygen project id same");
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });

    it("reports missing and malformed Doxygen XML", async () =>
    {
        const root = await mkdtemp(join(tmpdir(), "docs-doxygen-invalid-"));
        const project = { id: "widgets", name: "Widgets", version: "1.0.0", xmlDirectory: "build/xml" };
        try
        {
            await expect(generateApiDataset({ packages: [], doxygen: [ project ], repositoryRoot: root }))
                .rejects.toThrow("could not read Doxygen index.xml");
            await mkdir(join(root, "build", "xml"), { recursive: true });
            await writeFile(join(root, "build", "xml", "index.xml"), "<doxygenindex><compound>");
            await expect(generateApiDataset({ packages: [], doxygen: [ project ], repositoryRoot: root }))
                .rejects.toThrow("invalid Doxygen XML");
        }
        finally
        {
            await rm(root, { force: true, recursive: true });
        }
    });
});
