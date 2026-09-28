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

import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { generateApiDataset } from "../Source/TypeDoc.js";
describe("TypeDoc generation", () =>
{
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
        expect(dataset.records).toHaveLength(1);
        expect(dataset.records[0]?.breadcrumbs[1]?.label).toBe("V1.0.1");
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
                    readonly description: string;
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
