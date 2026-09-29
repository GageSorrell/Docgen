/**
 * Unreal project and plugin input validation.
 *
 * @module @sorrell/docs-api-reference/Unreal
 *
 * @file      Unreal.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { ApiReferenceError } from "./Errors.js";
import type {
    DoxygenProjectInput,
    UnrealGenerationInput,
    UnrealPluginInput,
    UnrealProjectInput
} from "./Types.js";

const validateDescriptor = async (
    input: UnrealProjectInput | UnrealPluginInput,
    kind: "project" | "plugin",
    repositoryRoot: string
): Promise<void> =>
{
    const extension = kind === "project" ? ".uproject" : ".uplugin";
    if (isAbsolute(input.descriptor))
    {
        throw new ApiReferenceError(`Unreal ${kind} descriptor ${input.descriptor} must be relative to the repository root`);
    }
    const descriptorPath = resolve(repositoryRoot, input.descriptor);
    const relativeDescriptor = relative(repositoryRoot, descriptorPath);
    if (relativeDescriptor === ".." || relativeDescriptor.startsWith(`..${sep}`) || isAbsolute(relativeDescriptor))
    {
        throw new ApiReferenceError(`Unreal ${kind} descriptor ${input.descriptor} must stay within the repository root`);
    }
    if (extname(input.descriptor).toLowerCase() !== extension)
    {
        throw new ApiReferenceError(`Unreal ${kind} descriptor ${input.descriptor} must end with ${extension}`);
    }
    let contents: string;
    try
    {
        contents = await readFile(descriptorPath, "utf8");
    }
    catch (cause)
    {
        throw new ApiReferenceError(`could not read Unreal ${kind} descriptor ${input.descriptor}: ${String(cause)}`);
    }
    let parsed: unknown;
    try
    {
        parsed = JSON.parse(contents);
    }
    catch (cause)
    {
        throw new ApiReferenceError(`Unreal ${kind} descriptor ${input.descriptor} contains invalid JSON: ${String(cause)}`);
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    {
        throw new ApiReferenceError(`Unreal ${kind} descriptor ${input.descriptor} must contain a JSON object`);
    }
};

/**
 * Validate Unreal descriptors and expose project metadata to the Doxygen reader.
 *
 * @internal
 */
export const doxygenProjectsForUnreal = async (
    input: UnrealGenerationInput | undefined,
    repositoryRoot: string
): Promise<ReadonlyArray<DoxygenProjectInput>> =>
{
    const projects = input?.projects ?? [];
    const plugins = input?.plugins ?? [];
    for (const project of projects)
    {
        await validateDescriptor(project, "project", repositoryRoot);
    }
    for (const plugin of plugins)
    {
        await validateDescriptor(plugin, "plugin", repositoryRoot);
    }
    return [ ...projects, ...plugins ].map(({ id, name, version, xmlDirectory }) => ({
        id,
        name,
        version,
        xmlDirectory
    }));
};
