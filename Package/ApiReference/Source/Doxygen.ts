/**
 * Doxygen XML discovery and normalization.
 *
 * @module @sorrell/docs-api-reference/Doxygen
 *
 * @file      Doxygen.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import { DOMParser } from "@xmldom/xmldom";
import type {
    ApiReferenceCategory,
    ApiReferenceDeclaration,
    ApiReferenceRecord,
    ApiReferenceSource
} from "@sorrell/docs-core";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { ApiReferenceError } from "./Errors.js";
import type { DoxygenProjectInput } from "./Types.js";

interface DoxygenGenerationOptions {
    readonly projects: ReadonlyArray<DoxygenProjectInput>;
    readonly repositoryRoot?: string;
    readonly repositoryUrl?: string;
    readonly revision?: string;
    readonly referencePrefix?: string;
}

interface IndexedCompound {
    readonly refid: string;
    readonly kind: string;
    readonly name: string;
}

interface DoxygenMember {
    readonly element: Element;
    readonly id: string;
    readonly kind: string;
    readonly name: string;
    readonly section: string;
}

const childElements = (element: Element, name: string): ReadonlyArray<Element> =>
    Array.from(element.childNodes)
        .filter((node): node is Element => node.nodeType === 1 && (node as Element).tagName === name);
const firstChild = (element: Element, name: string): Element | undefined =>
    childElements(element, name)[0];
const text = (element: Element | undefined): string =>
    element?.textContent?.replace(/\s+/gu, " ").trim() ?? "";
const parseXml = (xml: string, path: string): Document =>
{
    const diagnostics: Array<string> = [];
    const document = new DOMParser({
        errorHandler: {
            error: (message: unknown) => diagnostics.push(String(message)),
            fatalError: (message: unknown) => diagnostics.push(String(message))
        }
    }).parseFromString(xml, "application/xml");
    if (diagnostics.length > 0 || document.documentElement === null || document.documentElement.tagName === "parsererror")
    {
        throw new ApiReferenceError(`invalid Doxygen XML ${path}: ${diagnostics.join("; ") || "missing document element"}`);
    }
    return document;
};
const safeDeclarationId = (value: string): string =>
{
    const normalized = value.replace(/[^A-Za-z0-9_$.-]+/gu, "-").replace(/^-+|-+$/gu, "");
    return normalized || createHash("sha1").update(value).digest("hex").slice(0, 10);
};
const kindFor = (kind: string): ApiReferenceDeclaration["kind"] | undefined =>
{
    switch (kind)
    {
        case "function":
        case "signal":
        case "slot":
            return "function";
        case "enum":
            return "enum";
        case "typedef":
        case "using":
            return "alias";
        case "variable":
        case "property":
        case "friend":
        case "define":
            return "variable";
        default:
            return undefined;
    }
};
const sourceFor = (
    location: Element | undefined,
    options: DoxygenGenerationOptions,
    repositoryRoot: string
): ApiReferenceSource | undefined =>
{
    const sourcePath = location?.getAttribute("file");
    if (sourcePath === null || sourcePath === undefined || sourcePath === "" || options.repositoryUrl === undefined)
    {
        return undefined;
    }
    const absolutePath = isAbsolute(sourcePath) ? sourcePath : resolve(repositoryRoot, sourcePath);
    const relativePath = relative(repositoryRoot, absolutePath);
    if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath))
    {
        return undefined;
    }
    const line = Number(location?.getAttribute("line"));
    const endLine = Number(location?.getAttribute("bodyend"));
    return {
        file: relativePath.replaceAll("\\", "/"),
        repositoryUrl: options.repositoryUrl.replace(/\/+$/u, "").replace(/\.git$/u, ""),
        revision: options.revision ?? "main",
        ...(Number.isFinite(line) && line > 0 ? { line } : {}),
        ...(Number.isFinite(endLine) && endLine > 0 ? { endLine } : {})
    };
};
const descriptionFor = (element: Element): string | undefined =>
{
    const description = text(firstChild(element, "briefdescription")) || text(firstChild(element, "detaileddescription"));
    return description === "" ? undefined : description;
};
const memberSignature = (member: Element, kind: string, name: string): string =>
{
    const type = text(firstChild(member, "type"));
    const args = text(firstChild(member, "argsstring"));
    if (kind === "function" || kind === "signal" || kind === "slot")
    {
        return `${type === "" ? "" : `${type} `}${name}${args || "()"};`;
    }
    if (kind === "typedef")
    {
        return `typedef ${type === "" ? "" : `${type} `}${name};`;
    }
    if (kind === "using")
    {
        const definition = text(firstChild(member, "definition"));
        return definition || `using ${name};`;
    }
    if (kind === "enum")
    {
        const scoped = member.getAttribute("strong") === "yes" ? " class" : "";
        return `enum${scoped} ${name};`;
    }
    if (kind === "define")
    {
        return `#define ${name}${args}`;
    }
    const definition = text(firstChild(member, "definition"));
    return definition || `${type === "" ? "" : `${type} `}${name};`;
};
const categoriesFor = (members: ReadonlyArray<ApiReferenceDeclaration>): ReadonlyArray<ApiReferenceCategory> =>
    [ ...new Set(members.map((member) => member.categoryId)) ]
        .map((id, order) => ({
            collapsed: false,
            id,
            label: ({
                "public-func": "Functions",
                "public-type": "Types",
                "public-attrib": "Attributes",
                "public-static-func": "Static Functions",
                "public-static-attrib": "Static Attributes",
                "enum-values": "Enumerators",
                func: "Functions",
                var: "Variables",
                enum: "Enumerations",
                typedef: "Types"
            } as Readonly<Record<string, string>>)[id] ??
                id.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()),
            order
        }));
const indexedCompounds = (document: Document): ReadonlyArray<IndexedCompound> =>
{
    const index = document.documentElement;
    if (index.tagName !== "doxygenindex")
    {
        throw new ApiReferenceError("Doxygen index.xml must have a <doxygenindex> root element");
    }
    return childElements(index, "compound")
        .map((compound) => ({
            kind: compound.getAttribute("kind") ?? "",
            name: text(firstChild(compound, "name")),
            refid: compound.getAttribute("refid") ?? ""
        }))
        .filter((compound) =>
            compound.refid !== "" && compound.name !== "" &&
            [ "namespace", "class", "struct", "group", "enum" ].includes(compound.kind)
        );
};
const membersFor = (compound: Element): ReadonlyArray<DoxygenMember> =>
    childElements(compound, "sectiondef").flatMap((section) =>
        childElements(section, "memberdef")
            .filter((member) => member.getAttribute("prot") === "public" || member.getAttribute("prot") === "")
            .map((member) => ({
                element: member,
                id: member.getAttribute("id") ?? "",
                kind: member.getAttribute("kind") ?? "",
                name: text(firstChild(member, "name")),
                section: section.getAttribute("kind") ?? "members"
            }))
            .filter((member) => member.name !== "" && descriptionFor(member.element) !== undefined)
    );
const declarationFor = (
    member: DoxygenMember,
    categoryId: string,
    options: DoxygenGenerationOptions,
    repositoryRoot: string
): ApiReferenceDeclaration | undefined =>
{
    const kind = kindFor(member.kind);
    if (kind === undefined)
    {
        return undefined;
    }
    const description = descriptionFor(member.element);
    const id = member.id === "" ? safeDeclarationId(member.name) : safeDeclarationId(member.id);
    const source = sourceFor(firstChild(member.element, "location"), options, repositoryRoot);
    return {
        categoryId,
        ...(description === undefined ? {} : { description }),
        id,
        kind,
        name: member.name,
        signature: memberSignature(member.element, member.kind, member.name),
        ...(source === undefined ? {} : { source })
    };
};
const recordFor = async (
    indexed: IndexedCompound,
    project: DoxygenProjectInput,
    options: DoxygenGenerationOptions,
    xmlDirectory: string,
    repositoryRoot: string
): Promise<ApiReferenceRecord | undefined> =>
{
    const compoundPath = resolve(xmlDirectory, `${indexed.refid}.xml`);
    let compoundXml: string;
    try
    {
        compoundXml = await readFile(compoundPath, "utf8");
    }
    catch (cause)
    {
        throw new ApiReferenceError(`could not read Doxygen compound ${indexed.refid}: ${String(cause)}`);
    }
    const document = parseXml(compoundXml, compoundPath);
    const compound = document.getElementsByTagName("compounddef").item(0);
    if (compound === null)
    {
        throw new ApiReferenceError(`Doxygen compound ${indexed.refid} has no <compounddef>`);
    }
    if ([ "private", "protected" ].includes(compound.getAttribute("prot") ?? ""))
    {
        return undefined;
    }
    const displayName = text(firstChild(compound, "compoundname")) || indexed.name;
    const summary = descriptionFor(compound);
    const declarations = membersFor(compound).flatMap((member) =>
    {
        const categoryId = safeDeclarationId(member.section || "members").toLowerCase();
        const declaration = declarationFor(member, categoryId, options, repositoryRoot);
        return declaration === undefined ? [] : [ declaration ];
    });
    if (indexed.kind === "enum")
    {
        declarations.push(...Array.from(compound.getElementsByTagName("enumvalue"))
            .filter((value): value is Element => value.nodeType === 1)
            .flatMap((value) =>
            {
                const description = descriptionFor(value);
                const name = text(firstChild(value, "name"));
                if (name === "" || description === undefined)
                {
                    return [];
                }
                const initializer = text(firstChild(value, "initializer"));
                return [ {
                    categoryId: "enum-values",
                    description,
                    id: safeDeclarationId(value.getAttribute("id") || `${displayName}-${name}`),
                    kind: "variable" as const,
                    name,
                    signature: `${name}${initializer === "" ? "" : ` ${initializer}`}`
                } ];
            }));
    }
    if (summary === undefined && declarations.length === 0)
    {
        return undefined;
    }
    const routeName = displayName.split("::").filter(Boolean).map(encodeURIComponent).join("/") || "index";
    const module = `${project.id}/${displayName.replaceAll("::", "/")}`;
    const href = `${options.referencePrefix ?? "/docs/api"}/${project.id}/${routeName}`;
    const location = firstChild(compound, "location");
    const source = sourceFor(location, options, repositoryRoot);
    return {
        breadcrumbs: [
            { current: false, href: `${options.referencePrefix ?? "/docs/api"}/`, label: "API Reference" },
            { current: false, href: `${options.referencePrefix ?? "/docs/api"}/${project.version}`, label: `V${project.version.replace(/^[vV]/u, "")}` },
            { current: false, href: `${options.referencePrefix ?? "/docs/api"}/${project.id}`, label: project.name },
            { current: true, label: displayName }
        ],
        categories: categoriesFor(declarations),
        declarations,
        displayName,
        exportCount: declarations.length,
        language: "cpp",
        link: { external: false, href, label: displayName },
        module,
        packageId: project.id,
        packageName: project.name,
        version: project.version,
        ...(summary === undefined ? {} : { summary }),
        ...(source === undefined ? {} : { source })
    };
};

/**
 * Parse configured Doxygen XML trees into shared API-reference records.
 *
 * @internal
 */
export const generateDoxygenRecords = async (
    options: DoxygenGenerationOptions
): Promise<ReadonlyArray<ApiReferenceRecord>> =>
{
    const repositoryRoot = resolve(options.repositoryRoot ?? process.cwd());
    const records: Array<ApiReferenceRecord> = [];
    const packageIds = new Set<string>();
    for (const project of options.projects)
    {
        if (!/^[A-Za-z0-9_-]+$/u.test(project.id))
        {
            throw new ApiReferenceError(`Doxygen project id ${project.id} must contain only letters, numbers, underscores, and hyphens`);
        }
        if (packageIds.has(project.id))
        {
            throw new ApiReferenceError(`duplicate Doxygen project id ${project.id}`);
        }
        packageIds.add(project.id);
        if (isAbsolute(project.xmlDirectory))
        {
            throw new ApiReferenceError(`Doxygen XML directory ${project.xmlDirectory} must be relative to the repository root`);
        }
        const xmlDirectory = resolve(repositoryRoot, project.xmlDirectory);
        const relativeXml = relative(repositoryRoot, xmlDirectory);
        if (relativeXml === ".." || relativeXml.startsWith(`..${sep}`))
        {
            throw new ApiReferenceError(`Doxygen XML directory ${project.xmlDirectory} must stay within the repository root`);
        }
        const indexPath = resolve(xmlDirectory, "index.xml");
        let indexXml: string;
        try
        {
            indexXml = await readFile(indexPath, "utf8");
        }
        catch (cause)
        {
            throw new ApiReferenceError(`could not read Doxygen index.xml in ${project.xmlDirectory}: ${String(cause)}`);
        }
        const index = parseXml(indexXml, indexPath);
        const projectRecords: Array<ApiReferenceRecord> = [];
        for (const indexed of indexedCompounds(index))
        {
            if (!/^[A-Za-z0-9_.-]+$/u.test(indexed.refid))
            {
                throw new ApiReferenceError(`Doxygen compound reference ${indexed.refid} is not a safe XML filename`);
            }
            const record = await recordFor(indexed, project, options, xmlDirectory, repositoryRoot);
            if (record !== undefined)
            {
                projectRecords.push(record);
            }
        }
        if (projectRecords.length === 0)
        {
            throw new ApiReferenceError(`Doxygen project ${project.name} did not contain any documented namespace, class, struct, or group compounds`);
        }
        if (projectRecords.length === 1)
        {
            const onlyRecord = projectRecords[0];
            if (onlyRecord?.link !== undefined)
            {
                projectRecords[0] = {
                    ...onlyRecord,
                    link: {
                        ...onlyRecord.link,
                        href: `${options.referencePrefix ?? "/docs/api"}/${project.id}`
                    }
                };
            }
        }
        records.push(...projectRecords);
    }
    return records;
};
