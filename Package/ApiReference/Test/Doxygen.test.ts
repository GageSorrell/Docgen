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
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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
            expect(dataset.records.some((record) => (record.language ?? "typescript") === "typescript")).toBe(true);
            expect(dataset.jsonSchemas?.map((schema) => schema.title)).toEqual([ "Widget Config" ]);
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
