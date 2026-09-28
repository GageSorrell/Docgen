/**
 * Programmatic TypeDoc discovery and normalization.
 *
 * @module @sorrell/docs-api-reference/TypeDoc
 *
 * @file      TypeDoc.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import type {
    ApiReferenceDataset,
    ApiReferenceGenerationOptions
} from "./Types.js";
import type {
    ApiReferenceDeclaration,
    ApiReferenceDescriptionPart,
    ApiReferenceExample,
    ApiReferenceRecord,
    ApiReferenceSource
} from "@sorrell/docs-core";
import {
    Application,
    ReflectionKind,
    TSConfigReader,
    TypeDocReader
} from "typedoc";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, parse, relative, resolve, sep } from "node:path";
import { createApiDataset, validateApiRecords } from "./Serialization.js";
import { ApiReferenceError } from "./Errors.js";
interface ReflectionSource {
    readonly fileName?: string;
    readonly line?: number;
    readonly character?: number;
}
interface ReflectionCommentPart {
    readonly kind?: string;
    readonly tag?: string;
    readonly text?: string;
    readonly target?: unknown;
    readonly tsLinkText?: string;
}
interface ReflectionCommentTag {
    readonly tag: string;
    readonly name?: string;
    readonly content?: ReadonlyArray<ReflectionCommentPart>;
}
interface ReflectionComment {
    readonly summary?: ReadonlyArray<ReflectionCommentPart>;
    readonly blockTags?: ReadonlyArray<ReflectionCommentTag>;
}
interface PackageManifestLike {
    readonly name?: string;
    readonly main?: string;
    readonly exports?: unknown;
    readonly description?: string;
    readonly private?: boolean;
    readonly repository?: string | { readonly url?: string };
}
interface ReflectionFlagsLike {
    readonly isAbstract?: boolean;
    readonly isConst?: boolean;
    readonly isOptional?: boolean;
    readonly isPrivate?: boolean;
    readonly isProtected?: boolean;
    readonly isReadonly?: boolean;
    readonly isRest?: boolean;
    readonly isStatic?: boolean;
}
interface ReflectionLike {
    readonly id?: number;
    readonly name?: string;
    readonly kind?: number;
    readonly children?: ReadonlyArray<ReflectionLike>;
    readonly signatures?: ReadonlyArray<ReflectionLike>;
    readonly parameters?: ReadonlyArray<ReflectionLike>;
    readonly typeParameters?: ReadonlyArray<ReflectionLike>;
    readonly extendedTypes?: ReadonlyArray<{ readonly toString?: () => string }>;
    readonly comment?: ReflectionComment;
    readonly sources?: ReadonlyArray<ReflectionSource>;
    readonly flags?: ReflectionFlagsLike;
    readonly defaultValue?: string;
    readonly type?: {
        readonly toString?: () => string;
    };
    readonly parent?: ReflectionLike;
}
interface ReflectionSymbolIdLike {
    readonly fileName?: string;
    readonly packageName?: string;
    readonly packagePath?: string;
    readonly qualifiedName?: string;
}
const textOf = (reflection: ReflectionLike | undefined): string =>
    [
        ...(reflection?.comment === undefined ? [] : [ reflection.comment ]),
        ...(reflection?.signatures ?? [])
            .flatMap((signature) => signature.comment === undefined ? [] : [ signature.comment ])
    ]
        .map((comment) => comment.summary
            ?.map((part: { readonly text?: string }) => part.text ?? "")
            .join("")
            .trim() ?? "")
        .find((description) => description !== "") ?? "";
const tsdocCategoryOf = (reflection: ReflectionLike): string | undefined =>
{
    const comments = [
        ...(reflection.comment === undefined ? [] : [ reflection.comment ]),
        ...(reflection.signatures ?? [])
            .flatMap((signature) => signature.comment === undefined ? [] : [ signature.comment ])
    ];
    const categoryTag = comments
        .flatMap((comment) => comment.blockTags ?? [])
        .find((tag) => tag.tag === "@category");
    const category = categoryTag?.content?.map((part) => part.text ?? "").join("").trim();
    return category === undefined || category === "" ? undefined : category;
};
const sourceOf = (
    reflection: ReflectionLike | undefined,
    repositoryUrl: string | undefined,
    revision: string | undefined,
    sourceRoot: string | undefined
): ApiReferenceSource | undefined =>
{
    const source = reflection?.sources?.[0];
    if (
        source?.fileName === undefined ||
        repositoryUrl === undefined ||
        revision === undefined
    )
    {
        return undefined;
    }
    const rawFile = source.fileName.replaceAll("\\", "/");
    const normalizedRoot = sourceRoot?.replaceAll("\\", "/").replace(/\/$/, "");
    const file =
        normalizedRoot !== undefined && rawFile.startsWith(`${normalizedRoot}/`)
            ? rawFile.slice(normalizedRoot.length + 1)
            : rawFile;
    return {
        file,
        repositoryUrl,
        revision,
        ...(source.line === undefined ? {} : { line: source.line })
    };
};
const sourceFromPath = (
    fileName: string | undefined,
    repositoryUrl: string | undefined,
    revision: string | undefined,
    sourceRoot: string | undefined
): ApiReferenceSource | undefined =>
{
    if (fileName === undefined || repositoryUrl === undefined || revision === undefined || sourceRoot === undefined)
    {
        return undefined;
    }
    const file = relative(resolve(sourceRoot), resolve(fileName));
    if (file === "" || file === ".." || file.startsWith(`..${sep}`) || file.startsWith("../"))
    {
        return undefined;
    }
    return {
        file: file.replaceAll("\\", "/"),
        repositoryUrl,
        revision
    };
};
const recordLike = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
    value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as Readonly<Record<string, unknown>>
        : undefined;
const exportTarget = (value: unknown): string | undefined =>
{
    if (typeof value === "string")
    {
        return value;
    }
    const conditions = recordLike(value);
    if (conditions === undefined)
    {
        return undefined;
    }
    for (const condition of [ "types", "import", "node", "default", "require" ])
    {
        const target = exportTarget(conditions[condition]);
        if (target !== undefined)
        {
            return target;
        }
    }
    return undefined;
};
const manifestFor = async (
    entryPoints: ReadonlyArray<string>,
    packageName: string
): Promise<{ readonly directory: string; readonly manifest: PackageManifestLike } | undefined> =>
{
    for (const entryPoint of entryPoints)
    {
        let directory = dirname(resolve(entryPoint));
        while (true)
        {
            try
            {
                const content = await readFile(join(directory, "package.json"), "utf8");
                const manifest = JSON.parse(content) as PackageManifestLike;
                if (manifest.name === undefined || manifest.name === packageName)
                {
                    return { directory, manifest };
                }
            }
            catch
            {
                // Continue toward the workspace root when no package manifest exists here.
            }
            const parent = dirname(directory);
            if (parent === directory)
            {
                break;
            }
            directory = parent;
        }
    }
    return undefined;
};
const packageMetadataFor = async (
    packageInput: ApiReferenceGenerationOptions["packages"][number]
): Promise<{
    readonly description?: string;
    readonly directory?: string;
    readonly exports: ReadonlyArray<string>;
    readonly private?: boolean;
    readonly repositoryUrl?: string;
}> =>
{
    const located = await manifestFor(packageInput.entryPoints, packageInput.name);
    if (located === undefined)
    {
        return { exports: [ "." ] };
    }
    const exportsMap = recordLike(located.manifest.exports);
    const exportPaths = exportsMap === undefined
        ? [ "." ]
        : Object.keys(exportsMap)
            .filter((path) => path === "." || path.startsWith("./"))
            .sort((left, right) => left.localeCompare(right));
    const exports = exportPaths.length === 0 ? [ "." ] : exportPaths;
    const repository = typeof located.manifest.repository === "string"
        ? located.manifest.repository
        : located.manifest.repository?.url;
    const repositoryUrl = repository
        ?.replace(/^git@github\.com:/u, "https://github.com/")
        .replace(/^git\+/u, "")
        .replace(/\.git(?:#.*)?$/u, "")
        .replace(/#.*$/u, "")
        .replace(/\/tree\/[^/]+(?:\/.*)?$/u, "")
        .replace(/\/$/u, "");
    return {
        exports,
        directory: located.directory,
        ...(located.manifest.description === undefined
            ? {}
            : { description: located.manifest.description }),
        ...(located.manifest.private === undefined
            ? {}
            : { private: located.manifest.private }),
        ...(repositoryUrl === undefined ? {} : { repositoryUrl })
    };
};
interface PackageExportEntryPoint {
    readonly exportPath: string;
    readonly entryPoint: string;
}
const sourceEntryPointForExport = async (
    directory: string,
    exportPath: string,
    target: string | undefined
): Promise<string | undefined> =>
{
    const candidates = new Set<string>();
    if (target !== undefined)
    {
        const targetAbsolute = resolve(directory, target);
        const targetRelative = target.replace(/^\.\//u, "").replaceAll("\\", "/");
        const targetParts = targetRelative.split("/");
        const buildDirectoryIndex = targetParts.findIndex((part) =>
            [ "dist", "distribution", "build", "lib" ].includes(part.toLocaleLowerCase())
        );
        const sourceRelative = buildDirectoryIndex < 0
            ? targetRelative
            : targetParts.slice(buildDirectoryIndex + 1).join("/");
        const sourceStem = sourceRelative.replace(/\.(?:d\.)?[cm]?[jt]sx?$/iu, "");
        const sourceExtensions = [ ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx" ];
        for (const sourceDirectory of [ "Source", "source", "src" ])
        {
            for (const extension of sourceExtensions)
            {
                candidates.add(resolve(directory, sourceDirectory, `${sourceStem}${extension}`));
                candidates.add(resolve(directory, sourceDirectory, sourceStem, `index${extension}`));
            }
        }
        candidates.add(targetAbsolute);
    }
    const exportSubpath = exportPath.replace(/^\.\//u, "");
    if (exportSubpath !== "")
    {
        const exportStem = exportSubpath.replace(/\.(?:d\.)?[cm]?[jt]sx?$/iu, "");
        for (const sourceDirectory of [ "Source", "source", "src" ])
        {
            for (const extension of [ ".ts", ".tsx", ".mts", ".cts" ])
            {
                candidates.add(resolve(directory, sourceDirectory, `${exportStem}${extension}`));
                candidates.add(resolve(directory, sourceDirectory, exportStem, `index${extension}`));
            }
        }
    }
    for (const candidate of candidates)
    {
        try
        {
            await readFile(candidate);
            return candidate;
        }
        catch
        {
            // Try the next source layout used by TypeScript packages.
        }
    }
    return undefined;
};
const packageExportEntryPoints = async (
    packageInput: ApiReferenceGenerationOptions["packages"][number]
): Promise<ReadonlyArray<PackageExportEntryPoint>> =>
{
    const located = await manifestFor(packageInput.entryPoints, packageInput.name);
    if (located === undefined)
    {
        const fallback = packageInput.entryPoints[0];
        return fallback === undefined ? [] : [ { exportPath: ".", entryPoint: resolve(fallback) } ];
    }
    const exportsMap = recordLike(located.manifest.exports);
    const paths = exportsMap === undefined
        ? [ "." ]
        : Object.keys(exportsMap)
            .filter((path) => path === "." || path.startsWith("./"))
            .sort((left, right) => left.localeCompare(right));
    const exportPaths = paths.length === 0 ? [ "." ] : paths;
    const result: Array<PackageExportEntryPoint> = [];
    for (const exportPath of exportPaths)
    {
        const target = exportPath === "."
            ? await packageModuleEntryPoint(packageInput)
            : await sourceEntryPointForExport(
                located.directory,
                exportPath,
                exportsMap === undefined ? undefined : exportTarget(exportsMap[exportPath])
            );
        const entryPoint = target ?? (exportPath === "." ? packageInput.entryPoints[0] : undefined);
        if (entryPoint !== undefined)
        {
            result.push({ exportPath, entryPoint: resolve(entryPoint) });
        }
    }
    return result;
};
const packageModuleEntryPoint = async (
    packageInput: ApiReferenceGenerationOptions["packages"][number]
): Promise<string | undefined> =>
{
    const located = await manifestFor(packageInput.entryPoints, packageInput.name);
    if (located === undefined)
    {
        return undefined;
    }
    const { directory, manifest } = located;
    const exportsMap = recordLike(manifest.exports);
    const target = exportsMap !== undefined && Object.hasOwn(exportsMap, ".")
        ? exportTarget(exportsMap["."])
        : typeof manifest.exports === "string"
            ? manifest.exports
            : manifest.main;
    if (target === undefined)
    {
        return undefined;
    }
    const targetPath = resolve(directory, target);
    const normalizedTarget = targetPath.replaceAll("\\", "/");
    const normalizedEntries = packageInput.entryPoints.map((entryPoint) =>
    {
        const absolute = resolve(entryPoint);
        const relative = absolute.startsWith(`${directory}${sep}`)
            ? absolute.slice(directory.length + 1)
            : basename(absolute);
        return { absolute, relative: relative.replaceAll("\\", "/") };
    });
    const exact = normalizedEntries.find(({ absolute }) => absolute === targetPath);
    if (exact !== undefined)
    {
        return exact.absolute;
    }
    const targetName = parse(normalizedTarget).name.replace(/\.d$/u, "");
    const sameName = normalizedEntries.filter(({ relative }) =>
        parse(relative).name.replace(/\.d$/u, "") === targetName
    );
    if (sameName.length === 1)
    {
        return sameName[0]?.absolute;
    }
    const normalizedTargetStem = normalizedTarget
        .replace(/\.(?:d\.)?[cm]?[jt]sx?$/iu, "")
        .replace(/\/(?:distribution|dist|build|lib)\//giu, "/");
    const matchingSuffix = normalizedEntries.filter(({ relative }) =>
        normalizedTargetStem.endsWith(
            `/${relative.replace(/\.(?:d\.)?[cm]?[jt]sx?$/iu, "").replace(/\/(?:source|src|lib)\//giu, "/")}`
        )
    );
    if (matchingSuffix.length === 1)
    {
        return matchingSuffix[0]?.absolute;
    }
    return packageInput.entryPoints.length === 1
        ? resolve(packageInput.entryPoints[0] ?? "")
        : undefined;
};
const moduleDescriptionFrom = async (
    entryPoint: string | undefined
): Promise<string | undefined> =>
{
    if (entryPoint === undefined)
    {
        return undefined;
    }
    let source: string;
    try
    {
        source = await readFile(entryPoint, "utf8");
    }
    catch
    {
        return undefined;
    }
    const comment = source.match(/^\uFEFF?\s*\/\*\*([\s\S]*?)\*\//u)?.[1];
    if (comment === undefined)
    {
        return undefined;
    }
    const lines = comment
        .split(/\r?\n/u)
        .map((line) => line.replace(/^\s*\* ?/u, ""));
    const moduleTag = lines.findIndex((line) => /^\s*@module\b/u.test(line));
    if (moduleTag < 0 || lines.slice(0, moduleTag).some((line) => /^\s*@\w+/u.test(line)))
    {
        return undefined;
    }
    const description = lines.slice(0, moduleTag).join("\n").trim();
    return description === "" ? undefined : description;
};
interface Category {
    readonly id: string;
    readonly label: string;
    readonly order: number;
    readonly collapsed: boolean;
}
const categoryFor = (reflection: ReflectionLike): Category =>
{
    const kind = reflection.kind;
    if (kind === ReflectionKind.Function)
    {
        return {
            collapsed: false,
            id: "functions",
            label: "Functions",
            order: 0
        };
    }
    if (kind === ReflectionKind.Class)
    {
        return { collapsed: false, id: "classes", label: "Classes", order: 1 };
    }
    if (kind === ReflectionKind.Interface)
    {
        return {
            collapsed: false,
            id: "interfaces",
            label: "Interfaces",
            order: 2
        };
    }
    if (kind === ReflectionKind.TypeAlias)
    {
        return { collapsed: false, id: "types", label: "Types", order: 3 };
    }
    if (kind === ReflectionKind.Variable || kind === ReflectionKind.Enum)
    {
        return {
            collapsed: false,
            id: "constants",
            label: "Constants",
            order: 4
        };
    }
    if (kind === ReflectionKind.Namespace)
    {
        return {
            collapsed: false,
            id: "namespaces",
            label: "Namespaces",
            order: 5
        };
    }
    return {
        collapsed: false,
        id: "other",
        label: "Other",
        order: 6
    };
};
const declarationKind = (
    reflection: ReflectionLike
): ApiReferenceDeclaration["kind"] =>
{
    if (reflection.kind === ReflectionKind.Function)
    {
        return "function";
    }
    if (reflection.kind === ReflectionKind.Class)
    {
        return "class";
    }
    if (reflection.kind === ReflectionKind.Interface)
    {
        return "interface";
    }
    if (reflection.kind === ReflectionKind.TypeAlias)
    {
        return "type";
    }
    if (reflection.kind === ReflectionKind.Namespace)
    {
        return "namespace";
    }
    return "variable";
};
const typeText = (reflection: ReflectionLike | undefined): string =>
    reflection?.type?.toString?.() ?? "unknown";
const objectTypeMembers = (body: string): ReadonlyArray<string> =>
{
    const members: Array<string> = [];
    let start = 0;
    let braces = 0;
    let brackets = 0;
    let parentheses = 0;
    let angles = 0;
    let quote: "\"" | "'" | "`" | undefined;
    let escaped = false;
    for (let index = 0; index < body.length; index += 1)
    {
        const character = body[index];
        if (quote !== undefined)
        {
            if (escaped) { escaped = false; continue; }
            if (character === "\\") { escaped = true; continue; }
            if (character === quote) { quote = undefined; }
            continue;
        }
        if (character === "\"" || character === "'" || character === "`")
        {
            quote = character;
            continue;
        }
        if (character === "{") { braces += 1; }
        else if (character === "}") { braces -= 1; }
        else if (character === "[") { brackets += 1; }
        else if (character === "]") { brackets -= 1; }
        else if (character === "(") { parentheses += 1; }
        else if (character === ")") { parentheses -= 1; }
        else if (character === "<") { angles += 1; }
        else if (character === ">" && angles > 0) { angles -= 1; }
        else if (
            character === ";" &&
            braces === 0 &&
            brackets === 0 &&
            parentheses === 0 &&
            angles === 0
        )
        {
            const member = body.slice(start, index).trim();
            if (member !== "") { members.push(member); }
            start = index + 1;
        }
    }
    const finalMember = body.slice(start).trim();
    if (finalMember !== "") { members.push(finalMember); }
    return members;
};
const matchingObjectEnd = (text: string, start: number): number | undefined =>
{
    let depth = 0;
    let quote: "\"" | "'" | "`" | undefined;
    let escaped = false;
    for (let index = start; index < text.length; index += 1)
    {
        const character = text[index];
        if (quote !== undefined)
        {
            if (escaped) { escaped = false; continue; }
            if (character === "\\") { escaped = true; continue; }
            if (character === quote) { quote = undefined; }
            continue;
        }
        if (character === "\"" || character === "'" || character === "`")
        {
            quote = character;
            continue;
        }
        if (character === "{") { depth += 1; }
        else if (character === "}" && --depth === 0) { return index; }
    }
    return undefined;
};
const formatInlineObjectType = (type: string, indentation = "    "): string =>
{
    let result = "";
    for (let index = 0; index < type.length; index += 1)
    {
        if (type[index] !== "{")
        {
            result += type[index];
            continue;
        }
        const end = matchingObjectEnd(type, index);
        if (end === undefined)
        {
            result += type.slice(index);
            break;
        }
        const body = type.slice(index + 1, end);
        const members = objectTypeMembers(body);
        if (members.length < 2)
        {
            result += `{${formatInlineObjectType(body, indentation)}}`;
        }
        else
        {
            const memberIndentation = `${indentation}    `;
            result += `{\n${members.map((member) => `${memberIndentation}${formatInlineObjectType(member, memberIndentation)}`).join(";\n")}\n${indentation}}`;
        }
        index = end;
    }
    return result;
};
const typeParametersText = (
    parameters: ReadonlyArray<ReflectionLike> | undefined
): string =>
{
    if (parameters === undefined || parameters.length === 0)
    {
        return "";
    }
    return `<${parameters.map((parameter) =>
    {
        const constraint = parameter.type?.toString?.();
        const defaultValue = parameter.defaultValue;
        return `${parameter.name ?? "T"}${constraint === undefined ? "" : ` extends ${constraint}`}${defaultValue === undefined ? "" : ` = ${defaultValue}`}`;
    }).join(", ")}>`;
};
const parameterText = (parameter: ReflectionLike): string =>
    `${parameter.flags?.isRest === true ? "..." : ""}${parameter.name ?? "value"}${parameter.flags?.isOptional === true || parameter.defaultValue !== undefined ? "?" : ""}: ${formatInlineObjectType(typeText(parameter))}`;
const parametersText = (
    parameters: ReadonlyArray<ReflectionLike> | undefined
): string => parameters === undefined || parameters.length === 0
    ? "()"
    : `(\n${parameters.map((parameter) => `    ${parameterText(parameter)}`).join(",\n")}\n)`;
const methodText = (reflection: ReflectionLike): string =>
{
    const signature = reflection.signatures?.[0];
    if (signature === undefined)
    {
        return `${reflection.name ?? "unknown"}: ${typeText(reflection)};`;
    }
    const name = reflection.name ?? signature.name ?? "unknown";
    const modifiers = [
        signature.flags?.isStatic === true ? "static " : "",
        signature.flags?.isAbstract === true ? "abstract " : ""
    ].join("");
    return `${modifiers}${name}${typeParametersText(signature.typeParameters)}${parametersText(signature.parameters)}: ${typeText(signature)};`;
};
const memberText = (reflection: ReflectionLike): string | undefined =>
{
    if (reflection.flags?.isPrivate === true)
    {
        return undefined;
    }
    const accessibility = reflection.flags?.isProtected === true
        ? "protected "
        : "";
    if (reflection.kind === ReflectionKind.Method)
    {
        return `${accessibility}${methodText(reflection)}`;
    }
    if (reflection.kind === ReflectionKind.Constructor)
    {
        return `${accessibility}${methodText({ ...reflection, name: "constructor" })}`;
    }
    if (reflection.kind === ReflectionKind.Accessor)
    {
        const accessor = reflection.signatures?.[0];
        return accessor === undefined
            ? undefined
            : `${accessibility}get ${reflection.name ?? "value"}(): ${typeText(accessor)};`;
    }
    if (reflection.kind !== ReflectionKind.Property)
    {
        return undefined;
    }
    return `${accessibility}${reflection.flags?.isStatic === true ? "static " : ""}${reflection.flags?.isReadonly === true ? "readonly " : ""}${reflection.name ?? "value"}${reflection.flags?.isOptional === true ? "?" : ""}: ${typeText(reflection)};`;
};
const signatureFor = (reflection: ReflectionLike): string =>
{
    const name = reflection.name ?? "unknown";
    if (reflection.kind === ReflectionKind.Function)
    {
        const signature = reflection.signatures?.[0];
        if (signature !== undefined)
        {
            return `export declare function ${name}${typeParametersText(signature.typeParameters)}${parametersText(signature.parameters)}: ${typeText(signature)};`;
        }
    }
    if (reflection.kind === ReflectionKind.Interface || reflection.kind === ReflectionKind.Class)
    {
        const keyword = reflection.kind === ReflectionKind.Interface
            ? "interface"
            : "class";
        const inherited = reflection.extendedTypes
            ?.map((type) => type.toString?.())
            .filter((type): type is string => type !== undefined) ?? [];
        const members = reflection.children
            ?.map(memberText)
            .filter((member): member is string => member !== undefined) ?? [];
        return `export declare ${keyword} ${name}${typeParametersText(reflection.typeParameters)}${inherited.length === 0 ? "" : ` extends ${inherited.join(", ")}`} {\n${members.map((member) => `    ${member}`).join("\n")}\n}`;
    }
    if (reflection.kind === ReflectionKind.TypeAlias)
    {
        return `export declare type ${name}${typeParametersText(reflection.typeParameters)} = ${typeText(reflection)};`;
    }
    if (reflection.kind === ReflectionKind.Variable)
    {
        const variableKind = reflection.flags?.isConst === true ? "const" : "let";
        return `export declare ${variableKind} ${name}: ${typeText(reflection)};`;
    }
    if (reflection.kind === ReflectionKind.Enum)
    {
        const members = reflection.children?.map((member) =>
            `${member.name ?? "value"}${member.defaultValue === undefined ? "" : ` = ${member.defaultValue}`}`
        ) ?? [];
        return `export declare enum ${name} {\n${members.map((member) => `    ${member}`).join(",\n")}\n}`;
    }
    const kind = declarationKind(reflection);
    return `export declare ${kind} ${name}`;
};
const declarationId = (name: string): string =>
{
    const normalized = name
        .replace(/[^A-Za-z0-9_$.-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized === "" ? "declaration" : normalized;
};
const descriptionCommentsOf = (
    reflection: ReflectionLike | undefined
): ReadonlyArray<ReflectionComment> => [
    ...(reflection?.comment === undefined ? [] : [ reflection.comment ]),
    ...(reflection?.signatures ?? [])
        .flatMap((signature) => signature.comment === undefined ? [] : [ signature.comment ])
];
const summaryPartsOf = (
    reflection: ReflectionLike | undefined
): ReadonlyArray<ReflectionCommentPart> | undefined =>
    descriptionCommentsOf(reflection)
        .map((comment) => comment.summary ?? [])
        .find((parts) => parts.some((part) => (part.text ?? "").trim() !== ""));
const exampleFrom = (tag: ReflectionCommentTag): ApiReferenceExample | undefined =>
{
    const parts = tag.content ?? [];
    const content = parts.map((part) => part.text ?? "").join("");
    const fence = content.match(/^\s*(`{3,}|~{3,})([^\r\n]*)\r?\n([\s\S]*?)\r?\n\1\s*$/mu);
    const codePart = parts.find((part) => part.kind === "code");
    const code = (fence?.[3] ?? codePart?.text ?? content).trim();
    if (code === "")
    {
        return undefined;
    }
    const rawLanguage = fence?.[2]?.trim().split(/\s+/u)[0]?.toLowerCase();
    const language = rawLanguage === undefined || rawLanguage === ""
        ? undefined
        : ({
            js: "javascript",
            jsx: "javascript",
            sh: "bash",
            shell: "bash",
            ts: "typescript",
            tsx: "typescript"
        } as Record<string, string>)[rawLanguage] ?? rawLanguage;
    return {
        code,
        ...(language === undefined ? {} : { language }),
        ...(tag.name === undefined || tag.name.trim() === "" ? {} : { name: tag.name.trim() })
    };
};
const examplesOf = (reflection: ReflectionLike | undefined): ReadonlyArray<ApiReferenceExample> =>
    descriptionCommentsOf(reflection)
        .flatMap((comment) => comment.blockTags ?? [])
        .filter((tag) => tag.tag === "@example")
        .map(exampleFrom)
        .filter((example): example is ApiReferenceExample => example !== undefined);
const displayTextOf = (part: ReflectionCommentPart): string =>
    (part.tsLinkText ?? part.text ?? "").trim();
const normalizedSourceFile = (value: string): string =>
    value
        .replaceAll("\\", "/")
        .replace(/^\.\//u, "")
        .replace(/\.(?:d\.)?[cm]?[jt]sx?$/iu, "")
        .toLocaleLowerCase();
const moduleEntryForTarget = (
    target: ReflectionSymbolIdLike,
    packageDirectory: string | undefined,
    moduleEntries: ReadonlyArray<PackageExportEntryPoint>
): PackageExportEntryPoint | undefined =>
{
    const targetPaths = [
        ...(target.fileName === undefined ? [] : [ target.fileName ]),
        ...(target.packagePath === undefined ? [] : [ target.packagePath ]),
        ...(target.packagePath === undefined || packageDirectory === undefined
            ? []
            : [ resolve(packageDirectory, target.packagePath) ])
    ].map(normalizedSourceFile);
    const matches = moduleEntries.filter((entry) =>
    {
        const entryPath = normalizedSourceFile(entry.entryPoint);
        const relativePath = packageDirectory === undefined
            ? ""
            : normalizedSourceFile(relative(packageDirectory, entry.entryPoint));
        return targetPaths.some((targetPath) =>
            targetPath === entryPath ||
            targetPath === relativePath ||
            (relativePath !== "" && targetPath.endsWith(`/${relativePath}`)) ||
            (relativePath !== "" && relativePath.endsWith(`/${targetPath}`))
        );
    });
    return matches.length === 1 ? matches[0] : undefined;
};
const moduleHrefFor = (
    packageId: string,
    exportPath: string,
    moduleCount: number,
    options: ApiReferenceGenerationOptions
): string =>
{
    const modulePath = exportPath === "." ? "Core" : exportPath.replace(/^\.\//u, "");
    return `${options.referencePrefix ?? "/docs/api"}/${packageId}${moduleCount === 1 ? "" : `/${modulePath}`}`;
};
const publicPackageCache = new Map<string, Promise<boolean>>();
const isPublicNpmPackage = (
    packageName: string,
    target: ReflectionSymbolIdLike,
    packageInput: ApiReferenceGenerationOptions["packages"][number]
): Promise<boolean> =>
{
    const cached = publicPackageCache.get(packageName);
    if (cached !== undefined)
    {
        return cached;
    }
    const result = (async () =>
    {
        let located = target.fileName === undefined
            ? undefined
            : await manifestFor([ target.fileName ], packageName);
        if (located === undefined)
        {
            try
            {
                const reference = resolve(packageInput.entryPoints[0] ?? process.cwd(), "__sorrell_docs_resolver__.js");
                const require = createRequire(reference);
                const packageEntry = require.resolve(packageName);
                located = await manifestFor([ packageEntry ], packageName);
            }
            catch
            {
                // If no local manifest can be inspected, retain the external package link.
            }
        }
        return located?.manifest.private !== true;
    })();
    publicPackageCache.set(packageName, result);
    return result;
};
const linkPartFor = async (
    part: ReflectionCommentPart,
    moduleReflection: ReflectionLike,
    packageInput: ApiReferenceGenerationOptions["packages"][number],
    packageDirectory: string | undefined,
    moduleEntries: ReadonlyArray<PackageExportEntryPoint>,
    exportPath: string,
    options: ApiReferenceGenerationOptions
): Promise<ApiReferenceDescriptionPart> =>
{
    const text = displayTextOf(part);
    const target = part.target;
    if (part.kind !== "inline-tag" || !part.tag?.startsWith("@link") || text === "")
    {
        return { kind: "text", text: part.text ?? "" };
    }
    const makeLink = (
        href: string,
        external: boolean,
        code = part.tag === "@linkcode"
    ): ApiReferenceDescriptionPart => ({
        code,
        external,
        href,
        kind: "link",
        text
    });
    if (typeof target === "string")
    {
        const urlTarget = target.split("|")[0]?.trim() ?? target.trim();
        try
        {
            const url = new URL(urlTarget);
            if (url.protocol === "http:" || url.protocol === "https:")
            {
                return makeLink(urlTarget, true);
            }
        }
        catch
        {
            // A string target that is not a URL may be a TypeDoc symbol identifier.
        }
    }
    const targetRecord = recordLike(target);
    if (targetRecord !== undefined)
    {
        const targetReflection = targetRecord as ReflectionLike;
        if (typeof targetRecord.id === "number" && typeof targetRecord.kind === "number")
        {
            let childOnModule = targetReflection;
            let ancestor = targetReflection.parent;
            while (ancestor !== undefined && ancestor.id !== moduleReflection.id)
            {
                childOnModule = ancestor;
                ancestor = ancestor.parent;
            }
            if (targetReflection.id === moduleReflection.id || ancestor?.id === moduleReflection.id)
            {
                const href = moduleHrefFor(packageInput.id, exportPath, moduleEntries.length, options);
                const targetIsModule = targetReflection.id === moduleReflection.id ||
                    targetReflection.kind === ReflectionKind.Module ||
                    targetReflection.kind === ReflectionKind.Project;
                return makeLink(
                    targetIsModule ? href : `${href}#${declarationId(childOnModule.name ?? text)}`,
                    false
                );
            }
        }
        const symbol = targetRecord as ReflectionSymbolIdLike;
        if (typeof symbol.packageName === "string" && symbol.packageName !== "<unknown>")
        {
            if (symbol.packageName === packageInput.name)
            {
                const entry = moduleEntryForTarget(symbol, packageDirectory, moduleEntries);
                if (entry !== undefined)
                {
                    const href = moduleHrefFor(packageInput.id, entry.exportPath, moduleEntries.length, options);
                    const targetName = symbol.qualifiedName?.split(".")[0];
                    return makeLink(
                        targetName === undefined || targetName === ""
                            ? href
                            : `${href}#${declarationId(targetName)}`,
                        false
                    );
                }
            }
            else if (await isPublicNpmPackage(symbol.packageName, symbol, packageInput))
            {
                const npmPath = symbol.packageName
                    .split("/")
                    .map((part) => encodeURIComponent(part))
                    .join("/");
                return makeLink(`https://www.npmjs.com/package/${npmPath}`, false);
            }
        }
    }
    if (typeof target === "string")
    {
        const packageTarget = target.match(/^(@[^/]+\/[^!#]+|[^/!#]+)[!#].+$/u)?.[1];
        if (
            packageTarget !== undefined &&
            packageTarget !== packageInput.name &&
            await isPublicNpmPackage(packageTarget, { packageName: packageTarget }, packageInput)
        )
        {
            return makeLink(
                `https://www.npmjs.com/package/${packageTarget.split("/").map((part) => encodeURIComponent(part)).join("/")}`,
                false
            );
        }
    }
    return { kind: "text", text: part.text ?? "" };
};
const descriptionPartsFor = async (
    moduleReflection: ReflectionLike,
    reflection: ReflectionLike,
    packageInput: ApiReferenceGenerationOptions["packages"][number],
    packageDirectory: string | undefined,
    moduleEntries: ReadonlyArray<PackageExportEntryPoint>,
    exportPath: string,
    options: ApiReferenceGenerationOptions
): Promise<ReadonlyArray<ApiReferenceDescriptionPart> | undefined> =>
{
    const summary = summaryPartsOf(reflection);
    if (summary === undefined)
    {
        return undefined;
    }
    const parts = await Promise.all(summary.map((part) =>
        linkPartFor(part, moduleReflection, packageInput, packageDirectory, moduleEntries, exportPath, options)
    ));
    return parts.some((part) => part.kind === "link") ? parts : undefined;
};
const declarationFrom = (
    reflection: ReflectionLike,
    categoryId: string,
    options: ApiReferenceGenerationOptions,
    descriptionParts: ReadonlyArray<ApiReferenceDescriptionPart> | undefined
): ApiReferenceDeclaration =>
{
    const name = reflection.name ?? "unknown";
    const category = tsdocCategoryOf(reflection);
    const source = sourceOf(
        reflection,
        options.repositoryUrl,
        options.revision,
        options.sourceRoot
    );
    const description = textOf(reflection);
    const examples = examplesOf(reflection);
    return {
        ...(category === undefined ? {} : { category }),
        categoryId,
        ...(description === "" ? {} : { description }),
        ...(descriptionParts === undefined ? {} : { descriptionParts }),
        ...(examples.length === 0 ? {} : { examples }),
        id: declarationId(name),
        kind: declarationKind(reflection),
        name,
        signature: signatureFor(reflection),
        ...(source === undefined ? {} : { source })
    };
};
const recordFrom = async (
    reflection: ReflectionLike,
    packageInput: ApiReferenceGenerationOptions["packages"][number],
    options: ApiReferenceGenerationOptions,
    summary: string | undefined,
    selectedModuleSource: ApiReferenceSource | undefined,
    packageMetadata: Awaited<ReturnType<typeof packageMetadataFor>>,
    moduleEntries: ReadonlyArray<PackageExportEntryPoint>,
    exportPath: string
): Promise<ApiReferenceRecord> =>
{
    const packageOptions = options.repositoryUrl === undefined && packageMetadata.repositoryUrl !== undefined
        ? { ...options, repositoryUrl: packageMetadata.repositoryUrl }
        : options;
    const children = [ ...(reflection.children ?? []) ]
        .filter((child: ReflectionLike) => child.name !== undefined)
        .sort((left: ReflectionLike, right: ReflectionLike) =>
            (left.name ?? "").localeCompare(right.name ?? "")
        );
    const categories = [
        ...new Map(
            children.map((child: ReflectionLike) =>
            {
                const category = categoryFor(child);
                return [ category.id, category ];
            })
        ).values()
    ].sort((left: Category, right: Category) => left.order - right.order);
    const declarations = await Promise.all(children.map(async (child: ReflectionLike) =>
        declarationFrom(
            child,
            categoryFor(child).id,
            packageOptions,
            await descriptionPartsFor(
                reflection,
                child,
                packageInput,
                packageMetadata.directory,
                moduleEntries,
                exportPath,
                packageOptions
            )
        )
    ));
    const moduleSummary = textOf(reflection) || summary;
    const summaryParts = await descriptionPartsFor(
        reflection,
        reflection,
        packageInput,
        packageMetadata.directory,
        moduleEntries,
        exportPath,
        packageOptions
    );
    const modulePath = exportPath === "." ? "Core" : exportPath.replace(/^\.\//u, "");
    const moduleName = exportPath === "."
        ? packageInput.id
        : `${packageInput.id}/${modulePath}`;
    const displayName = exportPath === "."
        ? reflection.name ?? packageInput.name
        : modulePath;
    const moduleSource = sourceOf(
        reflection,
        packageOptions.repositoryUrl,
        packageOptions.revision,
        packageOptions.sourceRoot
    ) ?? selectedModuleSource;
    return {
        breadcrumbs: [
            {
                current: false,
                href: `${options.referencePrefix ?? "/docs/api"}/`,
                label: "API Reference"
            },
            {
                current: false,
                href: `${options.referencePrefix ?? "/docs/api"}/${packageInput.version}`,
                label: `V${packageInput.version.replace(/^[vV]/u, "")}`
            },
            {
                current: exportPath === ".",
                ...(exportPath === "."
                    ? {}
                    : { href: `${options.referencePrefix ?? "/docs/api"}/${packageInput.id}` }),
                label: packageInput.name
            },
            ...(exportPath === "." ? [] : [ { current: true, label: displayName } ])
        ],
        categories,
        declarations,
        displayName,
        exportCount: declarations.length,
        ...(exportPath === "." ? {} : { introductionVersion: packageInput.version }),
        module: moduleName,
        packageId: packageInput.id,
        packageName: packageInput.name,
        packageExports: packageMetadata.exports,
        ...(packageMetadata.repositoryUrl === undefined
            ? {}
            : { packageSourceUrl: packageMetadata.repositoryUrl }),
        ...(packageMetadata.description === undefined
            ? {}
            : { packageDescription: packageMetadata.description }),
        ...(packageMetadata.private === undefined
            ? {}
            : { packagePrivate: packageMetadata.private }),
        version: packageInput.version,
        ...(moduleSummary === undefined ? {} : { summary: moduleSummary }),
        ...(summaryParts === undefined ? {} : { summaryParts }),
        ...(moduleSource === undefined ? {} : { source: moduleSource }),
        link: {
            external: false,
            href: `${options.referencePrefix ?? "/docs/api"}/${packageInput.id}${moduleEntries.length === 1 ? "" : `/${modulePath}`}`,
            label: displayName
        }
    };
};
const moduleReflection = (project: ReflectionLike): ReflectionLike =>
{
    return project;
};
const typedocOptionsFor = (
    options: ApiReferenceGenerationOptions
): Readonly<Record<string, unknown>> =>
{
    const repositoryUrl = options.repositoryUrl
        ?.replace(/\/+$/u, "")
        .replace(/\.git$/u, "");
    return {
        ...(repositoryUrl === undefined
            ? {}
            : {
                sourceLinkTemplate:
                    `${repositoryUrl}/blob/{gitRevision}/{path}#L{line}`
            }),
        ...(options.typedoc ?? {})
    };
};
export/** @internal */
const generateApiDataset = async (
    options: ApiReferenceGenerationOptions
): Promise<ApiReferenceDataset> =>
{
    if (options.packages.length === 0)
    {
        throw new ApiReferenceError("at least one package must be configured");
    }
    const records: Array<ApiReferenceRecord> = [];
    for (const packageInput of options.packages)
    {
        const packageMetadata = await packageMetadataFor(packageInput);
        const moduleEntries = await packageExportEntryPoints(packageInput);
        for (const { entryPoint, exportPath } of moduleEntries)
        {
            const app = await Application.bootstrapWithPlugins(
                {
                    entryPoints: [ entryPoint.replaceAll("\\", "/") ],
                    skipErrorChecking: true,
                    ...(packageInput.tsconfig === undefined
                        ? {}
                        : { tsconfig: packageInput.tsconfig }),
                    ...typedocOptionsFor(options)
                },
                [ new TSConfigReader(), new TypeDocReader() ]
            );
            const project = await app.convert();
            if (project === undefined)
            {
                throw new ApiReferenceError(
                    `TypeDoc could not convert ${packageInput.name} export ${exportPath}`
                );
            }
            records.push(
                await recordFrom(
                    moduleReflection(project as unknown as ReflectionLike),
                    packageInput,
                    options,
                    await moduleDescriptionFrom(entryPoint),
                    sourceFromPath(
                        entryPoint,
                        options.repositoryUrl ?? packageMetadata.repositoryUrl,
                        options.revision,
                        options.sourceRoot
                    ),
                    packageMetadata,
                    moduleEntries,
                    exportPath
                )
            );
        }
    }
    const validation = validateApiRecords(records);
    if (!validation.valid)
    {
        throw new ApiReferenceError(validation.errors.join("; "));
    }
    const datasetOptions = {
        generatedAt: options.generatedAt ?? new Date().toISOString(),
        ...(options.revision === undefined
            ? {}
            : { sourceRevision: options.revision })
    };
    return createApiDataset(
        records.sort(
            (left: ApiReferenceRecord, right: ApiReferenceRecord) =>
                `${left.packageId}:${left.module}`.localeCompare(
                    `${right.packageId}:${right.module}`
                )
        ),
        datasetOptions
    );
};
