/**
 * Tests for deterministic generated agent output.
 *
 * @module @sorrell/docs-create-website/Test/AgentOutput
 *
 * @file      AgentOutput.test.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { buildAgentOutput, verifyAgentOutput } from "../Source/AgentOutput.js";
import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { Effect } from "effect";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
describe("generated agent output", () =>
{
    it("emits deterministic corpora, Markdown twins, and indexes", async () =>
    {
        const target = await mkdtemp(join(tmpdir(), "sorrell-agent-"));
        try
        {
            await mkdir(
                join(target, "Documentation", "Source", "content", "docs"),
                { recursive: true }
            );
            await mkdir(join(target, "Landing", "Distribution"), {
                recursive: true
            });
            await mkdir(join(target, "Documentation", "Source", "data"), { recursive: true });
            await writeFile(
                join(target, "docs.config.json"),
                JSON.stringify({
                    agent: { enabled: true, mcp: { enabled: true } },
                    metadata: { name: "Fixture", url: "https://example.test" }
                })
            );
            await writeFile(
                join(
                    target,
                    "Documentation",
                    "Source",
                    "content",
                    "docs",
                    "index.md"
                ),
                "---\ntitle: Welcome\ndescription: A fixture.\n---\n\n# Welcome\n\nReadable content.\n"
            );
            await writeFile(
                join(target, "Documentation", "Source", "data", "ApiReference.json"),
                JSON.stringify({ jsonSchemas: [ {
                    description: "Settings for the fixture.",
                    path: "schemas/settings.json",
                    route: "/docs/settings-schema/",
                    schema: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" },
                    title: "Settings Schema"
                } ], records: [] })
            );
            await Effect.runPromise(
                buildAgentOutput(target, {
                    generatedAt: "2026-09-24T00:00:00.000Z",
                    revision: "fixture"
                })
            );
            const first = await readFile(
                join(target, "Documentation", "dist", "agent", "manifest.json"),
                "utf8"
            );
            await Effect.runPromise(verifyAgentOutput(target));
            const corpus = JSON.parse(await readFile(join(target, "Documentation", "dist", "agent", "corpus", "current.json"), "utf8"));
            expect(corpus.documents).toContainEqual(expect.objectContaining({
                id: "json-schema:/docs/settings-schema/",
                kind: "json-schema",
                title: "Settings Schema",
                url: "https://example.test/docs/settings-schema/"
            }));
            expect(JSON.parse(await readFile(join(target, "Documentation", "dist", "agent", "search-index.json"), "utf8")).entries)
                .toContainEqual(expect.objectContaining({ id: "json-schema:/docs/settings-schema/" }));
            await Effect.runPromise(
                buildAgentOutput(target, {
                    generatedAt: "2026-09-24T00:00:00.000Z",
                    revision: "fixture"
                })
            );
            expect(
                await readFile(
                    join(
                        target,
                        "Documentation",
                        "dist",
                        "agent",
                        "manifest.json"
                    ),
                    "utf8"
                )
            ).toBe(first);
            expect(
                await readFile(
                    join(target, "Documentation", "dist", "index.md"),
                    "utf8"
                )
            ).toContain("Kind: article");
            expect(
                await readFile(
                    join(target, "Landing", "Distribution", "llms.txt"),
                    "utf8"
                )
            ).toContain("current documentation");
        }
        finally
        {
            await rm(target, { force: true, recursive: true });
        }
    });
    it("generates a validated product skill and archive when enabled", async () =>
    {
        const target = await mkdtemp(join(tmpdir(), "sorrell-product-skill-"));
        try
        {
            await mkdir(
                join(target, "Documentation", "Source", "content", "docs"),
                { recursive: true }
            );
            await mkdir(join(target, "Landing", "Distribution"), {
                recursive: true
            });
            await writeFile(
                join(target, "docs.config.json"),
                JSON.stringify({
                    agent: {
                        description: "Documentation for the fixture product.",
                        enabled: true,
                        skill: { enabled: true, name: "fixture-product" }
                    },
                    metadata: { name: "Fixture", url: "https://example.test" }
                })
            );
            await writeFile(
                join(
                    target,
                    "Documentation",
                    "Source",
                    "content",
                    "docs",
                    "index.md"
                ),
                "---\ntitle: Welcome\n---\n\nFixture content.\n"
            );
            await Effect.runPromise(
                buildAgentOutput(target, {
                    generatedAt: "2026-09-24T00:00:00.000Z",
                    revision: "fixture"
                })
            );
            const manifest = JSON.parse(
                await readFile(
                    join(
                        target,
                        "Documentation",
                        "dist",
                        "agent",
                        "manifest.json"
                    ),
                    "utf8"
                )
            ) as {
                readonly skills?: ReadonlyArray<{
                    readonly name: string;
                }>;
            };
            expect(
                manifest.skills?.map(
                    (skill: { readonly name: string }) => skill.name
                )
            ).toEqual([ "fixture-product" ]);
            expect(
                await readFile(
                    join(
                        target,
                        "Documentation",
                        "dist",
                        "agent",
                        "skills",
                        "fixture-product",
                        "SKILL.md"
                    ),
                    "utf8"
                )
            ).toContain("Documentation for the fixture product.");
            expect(
                existsSync(
                    join(
                        target,
                        "Documentation",
                        "dist",
                        "agent",
                        "skills",
                        "fixture-product.zip"
                    )
                )
            ).toBe(true);
        }
        finally
        {
            await rm(target, { force: true, recursive: true });
        }
    });
});
