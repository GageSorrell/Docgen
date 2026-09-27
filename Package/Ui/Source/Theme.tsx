/**
 *
 *
 * @module @sorrell/docs-ui/Theme
 *
 * @file      Theme.tsx
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */

import {
    type ReactNode,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

import type { DesignTokens } from "@sorrell/docs-core";
import type { ThemeMode } from "./Types.js";

interface ThemeContextValue
{
    readonly mode: ThemeMode;
    readonly resolvedMode: "light" | "dark";
    readonly setMode: (mode: ThemeMode) => void;
    readonly toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const resolveMode = (mode: ThemeMode): "light" | "dark" =>
{
    if (mode !== "system")
    {
        return mode;
    }
    if (typeof window === "undefined")
    {
        return "light";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
};

export/** @internal */
const createThemeCss = (tokens: DesignTokens): string =>
    `:root {
  --docs-background: ${ tokens.light.background };
  --docs-foreground: ${ tokens.light.foreground };
  --docs-muted: ${ tokens.light.muted };
  --docs-border: ${ tokens.light.border };
  --docs-accent: ${ tokens.light.accent };
  --docs-card-background: ${ tokens.light.cardBackground ?? tokens.light.codeBackground };
  --docs-code-background: ${ tokens.light.codeBackground };
  --docs-prose-foreground: ${ tokens.light.proseForeground ?? tokens.light.foreground };
  --docs-subtle-foreground: ${ tokens.light.subtleForeground ?? tokens.light.muted };
}

[data-theme="dark"] {
  --docs-background: ${ tokens.dark.background };
  --docs-foreground: ${ tokens.dark.foreground };
  --docs-muted: ${ tokens.dark.muted};
  --docs-border: ${ tokens.dark.border };
  --docs-accent: ${ tokens.dark.accent };
  --docs-card-background: ${ tokens.dark.cardBackground ?? tokens.dark.codeBackground };
  --docs-code-background: ${ tokens.dark.codeBackground };
  --docs-prose-foreground: ${ tokens.dark.proseForeground ?? tokens.dark.foreground };
  --docs-subtle-foreground: ${ tokens.dark.subtleForeground ?? tokens.dark.muted };
}`;

export/** @internal */
const ThemeProvider = ({
    children,
    initialMode = "system"
}: {
    readonly children: ReactNode;
    readonly initialMode?: ThemeMode;
}) =>
{
    const [ mode, setMode ] = useState<ThemeMode>(() =>
    {
        if (typeof window === "undefined")
        {
            return initialMode;
        }
        return (
            (window.localStorage.getItem(
                "sorrell-docs-theme"
            ) as ThemeMode | null) ?? initialMode
        );
    });
    const resolvedMode = resolveMode(mode);
    useEffect(() =>
    {
        document.documentElement.dataset.theme = resolvedMode;
        document.documentElement.style.colorScheme = resolvedMode;
        window.localStorage.setItem("sorrell-docs-theme", mode);
    }, [ mode, resolvedMode ]);
    const value = useMemo<ThemeContextValue>(
        () => ({
            mode,
            resolvedMode,
            setMode,
            toggleMode: () =>
                setMode(resolvedMode === "dark" ? "light" : "dark")
        }),
        [ mode, resolvedMode ]
    );
    return (
        <ThemeContext.Provider value={ value }>{children}</ThemeContext.Provider>
    );
};
export/** @internal */
const useTheme = (): ThemeContextValue =>
    useContext(ThemeContext) ?? {
        mode: "system",
        resolvedMode: "light",
        setMode: () => undefined,
        toggleMode: () => undefined
    };
export/** @internal */
const ThemeToggle = () =>
{
    const theme = useTheme();

    return (
        <button
            aria-label={ `Use ${ theme.resolvedMode === "dark" ? "light" : "dark" } theme` }
            className="docs-icon-button"
            onClick={ theme.toggleMode }
            type="button">
            { theme.resolvedMode === "dark" ? "☼" : "☾" }
        </button>
    );
};
