/**
 *
 *
 * @module @sorrell/docs-ui
 *
 * @file      index.ts
 * @author    Gage Sorrell <gage@sorrell.sh>
 * @copyright (c) 2026 Gage Sorrell
 * @license   MIT
 */
export * from "./ApiReference.js";
export * from "./CopyForLlm.js";
export * from "./Landing.js";
export * from "./Mdx.js";
export * from "./Navigation.js";
export * from "./Sections.js";
export * from "./Theme.js";
export * from "./Types.js";
export/** @internal */
const docsUiCss = `
:root {
    font-family: Inter,
ui-sans-serif,
system-ui,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;
    color: var(--docs-foreground,
#111111);
    background: var(--docs-background,
#ffffff);
    font-synthesis: none;
    text-rendering: optimizeLegibility;
}
html { scroll-behavior: smooth;
}

* { box-sizing: border-box;
}
body { margin: 0;
min-width: 320px;
background: var(--docs-background,
#ffffff);
color: var(--docs-foreground,
#111111);
}
a { color: inherit;
text-decoration: none;
}
button,
a { -webkit-tap-highlight-color: transparent;
}
button { font: inherit;
}

.docs-site { min-height: 100vh;
background: var(--docs-background);
color: var(--docs-foreground);
}
.docs-header { align-items: center;
background: color-mix(in srgb,
var(--docs-background) 92%,
transparent);
border-bottom: 1px solid var(--docs-border);
display: flex;
gap: 28px;
height: 72px;
padding: 0 28px;
position: sticky;
top: 0;
z-index: 10;
backdrop-filter: blur(16px);
}
.docs-brand { align-items: center;
display: inline-flex;
font-size: 18px;
font-weight: 750;
gap: 10px;
letter-spacing: -0.03em;
white-space: nowrap;
}
.docs-brand-mark { align-items: center;
background: var(--docs-foreground);
color: var(--docs-background);
display: inline-flex;
height: 24px;
justify-content: center;
transform: rotate(45deg);
width: 24px;
}
.docs-brand-mark::first-letter { transform: rotate(-45deg);
}
.docs-header-nav { align-items: center;
display: flex;
gap: 24px;
margin-right: auto;
}
.docs-header-nav a { color: var(--docs-muted);
font-size: 14px;
font-weight: 600;
}
.docs-header-nav a:hover,
.docs-header-nav a.is-active { color: var(--docs-foreground);
}
.docs-header-actions { align-items: center;
display: flex;
gap: 10px;
}
.docs-search-button,
.docs-icon-button,
.docs-copy-button,
.docs-install-command { align-items: center;
background: transparent;
border: 1px solid var(--docs-border);
border-radius: 8px;
color: var(--docs-muted);
cursor: pointer;
display: inline-flex;
gap: 9px;
justify-content: center;
}
.docs-search-button { height: 38px;
min-width: 132px;
padding: 0 11px;
}
.docs-search-button kbd { border: 1px solid var(--docs-border);
border-radius: 4px;
font-size: 11px;
padding: 2px 5px;
}
.docs-icon-button { height: 38px;
width: 38px;
}
.docs-icon-button:hover,
.docs-search-button:hover,
.docs-copy-button:hover { border-color: var(--docs-accent);
color: var(--docs-foreground);
}
.docs-menu-button { display: none;
}

.docs-layout { display: grid;
grid-template-columns: 250px minmax(0,
1fr) 230px;
min-height: calc(100vh - 72px);
}
.docs-sidebar { border-right: 1px solid var(--docs-border);
padding: 40px 22px;
}
.docs-sidebar-label,
.docs-toc-title { color: var(--docs-muted);
font-size: 11px;
font-weight: 800;
letter-spacing: 0.16em;
text-transform: uppercase;
}
.docs-api-page > .docs-sidebar .docs-sidebar-label { font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
}
.docs-sidebar-group { margin-top: 30px;
}
.docs-sidebar-group h2 { font-size: 13px;
margin: 0 0 9px;
}
.docs-nav-items { list-style: none;
margin: 0;
padding: 0;
}
.docs-nav-items .docs-nav-items { padding-left: 12px;
}
.docs-nav-items li { margin: 2px 0;
}
.docs-nav-items a { border-radius: 6px;
color: var(--docs-muted);
display: block;
font-size: 14px;
line-height: 1.45;
padding: 7px 14px;
}
.docs-nav-items a:hover,
.docs-nav-items a.is-active { background: color-mix(in srgb,
var(--docs-accent) 12%,
transparent);
color: var(--docs-foreground);
}
.docs-toc { border-left: 1px solid var(--docs-border);
padding: 42px 22px;
}
.docs-toc .docs-nav-items { margin-top: 17px;
}
.docs-toc .docs-nav-items a { font-size: 13px;
padding-left: 14px;
}
.docs-main { min-width: 0;
padding: 48px clamp(24px,
6vw,
88px);
}

.docs-breadcrumbs { color: var(--docs-muted);
display: flex;
flex-wrap: wrap;
font-size: 12px;
font-weight: 700;
gap: 8px;
letter-spacing: 0.12em;
text-transform: uppercase;
}
.docs-breadcrumbs a:hover { color: var(--docs-foreground);
}
.docs-breadcrumb-separator { color: var(--docs-accent);
margin-right: 8px;
}
.docs-article { margin: 0 auto;
max-width: 920px;
}
.docs-article-topline,
.docs-api-heading-row { align-items: flex-start;
display: flex;
gap: 28px;
justify-content: space-between;
margin: 48px 0 32px;
}
.docs-article h1,
.docs-api-heading-row h1 { font-size: clamp(38px,
5vw,
66px);
font-weight: 700;
letter-spacing: -0.065em;
line-height: 0.98;
margin: 0;
}
.docs-article-description,
.docs-api-heading-row p { color: var(--docs-muted);
font-size: 19px;
line-height: 1.6;
margin: 22px 0 0;
max-width: 760px;
}
.docs-copy-button { align-items: center;
flex-shrink: 0;
font-size: 12px;
font-weight: 400;
gap: 7px;
justify-content: flex-start;
min-height: 34px;
padding: 0 10px;
text-align: left;
}
.docs-copy-button-icon { display: inline-grid;
flex: 0 0 14px;
height: 14px;
width: 14px;
}
.docs-copy-button-icon svg { grid-area: 1 / 1;
height: 14px;
width: 14px;
}
.docs-copy-button-icon .docs-copy-success-icon { color: #16a34a;
display: none;
}
.docs-copy-button[data-copied="true"] .docs-copy-icon { display: none;
}
.docs-copy-button[data-copied="true"] .docs-copy-success-icon { display: block;
}
.docs-copy-button-label { display: grid;
text-align: left;
white-space: nowrap;
}
.docs-copy-button-label > span { grid-area: 1 / 1;
}
.docs-copy-button-label > span:last-child { visibility: hidden;
}
.docs-copy-button[data-copied="true"] .docs-copy-button-label > span:first-child { visibility: hidden;
}
.docs-copy-button[data-copied="true"] .docs-copy-button-label > span:last-child { visibility: visible;
}
.docs-prose { font-size: 17px;
line-height: 1.75;
max-width: 780px;
}
.docs-prose p { margin: 1.2em 0;
}
.docs-prose a { color: var(--docs-accent);
text-decoration: underline;
text-underline-offset: 3px;
}
.docs-heading { letter-spacing: -0.035em;
line-height: 1.15;
margin: 2em 0 0.65em;
position: relative;
}
.docs-heading-link { color: var(--docs-accent);
font-size: 0.55em;
margin-left: 9px;
opacity: 0;
vertical-align: middle;
}
.docs-heading:hover .docs-heading-link,
.docs-heading-link:focus { opacity: 1;
}

.docs-code-frame { background: var(--docs-card-background,
var(--docs-code-background));
border: 1px solid var(--docs-border);
border-radius: 12px;
box-shadow: 0 2px 5px color-mix(in srgb,
var(--docs-foreground) 14%,
transparent);
margin: 1.5rem 0;
overflow: hidden;
position: relative;
}
.docs-code-frame pre { background: transparent !important;
border: 0 !important;
border-radius: 0 !important;
box-shadow: none !important;
box-sizing: border-box;
color: var(--docs-foreground) !important;
font-family: "JetBrains Mono",
ui-monospace,
SFMono-Regular,
Menlo,
monospace !important;
font-size: 13px;
line-height: 1.65;
margin: 0 !important;
max-width: none !important;
overflow: auto;
padding: 18px 60px 24px 20px !important;
scrollbar-color: color-mix(in srgb,
var(--docs-muted) 35%,
var(--docs-code-background)) transparent;
scrollbar-width: thin;
white-space: pre;
}
.docs-code-frame pre::-webkit-scrollbar { height: 10px;
width: 10px;
}
.docs-code-frame pre::-webkit-scrollbar-track { background: var(--docs-code-background);
}
.docs-code-frame pre::-webkit-scrollbar-thumb { background: color-mix(in srgb,
var(--docs-muted) 35%,
var(--docs-code-background));
border: 2px solid var(--docs-code-background);
border-radius: 999px;
}
.docs-code-frame pre::-webkit-scrollbar-thumb:hover { background: var(--docs-muted);
}
.docs-code-frame pre code { background: transparent !important;
font-family: inherit !important;
font-size: inherit !important;
padding: 0 !important;
white-space: inherit;
}
.docs-code-copy { align-items: center;
background: var(--docs-code-background);
border: 1px solid var(--docs-border);
border-radius: 5px;
color: var(--docs-muted);
cursor: pointer;
display: inline-flex;
height: 40px;
justify-content: center;
position: absolute;
right: 10px;
top: 8px;
transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
width: 40px;
z-index: 1;
}
.docs-code-copy:hover,
.docs-code-copy:focus-visible { background: var(--docs-background);
border-color: var(--docs-muted);
color: var(--docs-foreground);
outline: none;
}
.docs-code-copy:focus-visible { box-shadow: 0 0 0 2px var(--docs-accent);
}
.docs-code-copy svg { height: 20px;
width: 20px;
}
.docs-code-copy[data-copied="true"] { color: var(--docs-accent);
}
.docs-description-external-icon { height: .8em;
margin-left: .2em;
vertical-align: -0.08em;
width: .8em;
}
.docs-code-block { margin: 22px 0;
}
.docs-code-language { color: var(--docs-muted);
font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
font-size: 11px;
padding: 12px 16px 0;
text-transform: uppercase;
}
.docs-code-block pre { margin: 0;
padding: 14px 16px 18px;
}
.docs-code-block code { font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
font-size: 14px;
line-height: 1.7;
white-space: pre;
}
.docs-callout { border-left: 3px solid var(--docs-accent);
background: color-mix(in srgb,
var(--docs-accent) 8%,
transparent);
border-radius: 0 8px 8px 0;
margin: 26px 0;
padding: 16px 18px;
}
.docs-callout strong { display: block;
margin-bottom: 5px;
}
.docs-callout-warning { border-color: #d97706;
}
.docs-callout-tip { border-color: #059669;
}
.docs-tabs { border: 1px solid var(--docs-border);
border-radius: 10px;
margin: 24px 0;
overflow: hidden;
}
.docs-tab-list { border-bottom: 1px solid var(--docs-border);
display: flex;
gap: 4px;
overflow-x: auto;
padding: 6px;
}
.docs-tab-list button { background: transparent;
border: 0;
border-radius: 6px;
color: var(--docs-muted);
cursor: pointer;
font-size: 13px;
padding: 8px 12px;
}
.docs-tab-list button.is-active { background: var(--docs-code-background);
color: var(--docs-foreground);
}
.docs-tab-panel { padding: 2px 16px;
}

.docs-api-page { display: grid;
grid-template-columns: 250px minmax(0,
1fr) 230px;
min-height: calc(100vh - 72px);
}
.docs-api-page > .docs-sidebar { padding-top: 44px;
}
.docs-api-main { min-width: 0;
padding: 48px clamp(24px,
5vw,
72px);
}
.docs-api-heading-row { margin-top: 44px;
}
.docs-api-title-row { align-items: baseline;
display: flex;
gap: 24px;
justify-content: space-between;
}
.docs-api-title-row .docs-copy-button { margin-left: auto;
}
.docs-api-heading-row h1 { font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
font-size: clamp(34px,
5vw,
58px);
overflow-wrap: anywhere;
}
.docs-api-heading-row p { font-size: 18px;
}
.docs-api-meta { align-items: center;
color: var(--docs-muted);
display: flex;
flex-wrap: wrap;
font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
font-size: 13px;
gap: 24px;
margin: 28px 0 62px;
}
.docs-api-meta a,
.docs-declaration-links a { color: var(--docs-accent);
}
.docs-api-meta .docs-source-link { align-items: center;
color: var(--docs-muted);
display: inline-flex;
gap: 7px;
text-decoration: none;
}
.docs-package-link { align-items: center;
color: var(--docs-muted) !important;
display: inline-flex;
gap: 7px;
text-decoration: none;
}
.docs-package-link:hover { color: var(--docs-foreground) !important;
}
.docs-npm-logo { flex: none;
height: 14px;
width: 32px;
}
.docs-package-modules { margin: -30px 0 62px;
}
.docs-package-search-label { display: block;
font-size: 13px;
font-weight: 600;
margin-bottom: 10px;
}
.docs-package-search { background: var(--docs-card-background);
border: 1px solid var(--docs-border);
border-radius: 9px;
box-sizing: border-box;
color: var(--docs-foreground);
font: inherit;
margin-bottom: 28px;
max-width: 100%;
padding: 12px 14px;
width: min(100%, 560px);
}
.docs-package-search:focus-visible { border-color: var(--docs-accent);
outline: 2px solid color-mix(in srgb, var(--docs-accent) 30%, transparent);
outline-offset: 2px;
}
.docs-package-module-group { margin: 0 0 30px;
}
.docs-package-module-group h2 { font-size: 1.25rem;
margin: 0 0 12px;
}
.docs-package-module-grid { display: grid;
gap: 12px;
grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
}
.docs-package-module-card { align-items: center;
background: var(--docs-card-background);
border: 1px solid var(--docs-border);
border-radius: 10px;
color: var(--docs-foreground);
display: flex;
font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
gap: 12px;
justify-content: space-between;
min-width: 0;
padding: 15px 16px;
text-decoration: none;
transition: border-color 120ms ease, background 120ms ease;
}
.docs-package-module-card:hover,
.docs-package-module-card:focus-visible { background: var(--docs-code-background);
border-color: var(--docs-accent);
}
.docs-package-module-card span:first-child { overflow-wrap: anywhere;
}
.docs-package-module-card span:last-child { color: var(--docs-muted);
flex: none;
}
.docs-package-no-results { color: var(--docs-muted);
}
.docs-source-link svg { flex: none;
height: 14px;
width: 14px;
}
.docs-api-meta .docs-source-link:hover,
.docs-declaration-links .docs-source-link:hover { color: var(--docs-foreground);
}
.docs-api-category { scroll-margin-top: 96px;
}
.docs-api-category > h2 { font-size: clamp(28px,
4vw,
42px);
letter-spacing: -0.05em;
margin: 1.4em 0 0.35em;
}
.docs-api-declaration { border-top: 1px solid var(--docs-border);
padding: 30px 0 45px;
scroll-margin-top: 96px;
}
.docs-api-category > .docs-api-declaration:first-of-type { border-top: 0;
padding-top: 12px;
}
.docs-declaration-heading { align-items: baseline;
display: flex;
gap: 16px;
justify-content: space-between;
}
.docs-declaration-heading h3 { font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
font-size: 25px;
letter-spacing: -0.04em;
margin: 0;
overflow-wrap: anywhere;
}
.docs-declaration-name { align-items: center;
color: inherit;
cursor: pointer;
display: inline-flex;
gap: 8px;
text-decoration: none;
}
.docs-declaration-link-icon { color: var(--docs-accent);
flex: none;
height: 18px;
opacity: 0;
transition: opacity 120ms ease;
width: 18px;
}
.docs-declaration-name:hover .docs-declaration-link-icon,
.docs-declaration-name:focus-visible .docs-declaration-link-icon { opacity: 1;
}
.docs-declaration-heading p,
.docs-api-declaration > p { color: var(--docs-muted);
font-size: 16px;
line-height: 1.65;
}
.docs-kind-badge { border: 1px solid var(--docs-border);
border-radius: 999px;
color: var(--docs-accent);
display: inline-block;
flex-shrink: 0;
font-family: inherit;
font-size: 10px;
letter-spacing: 0.1em;
margin-left: 10px;
padding: 4px 8px;
vertical-align: middle;
white-space: nowrap;
}
.docs-declaration-links { display: flex;
flex-wrap: wrap;
font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
font-size: 12px;
gap: 14px;
white-space: nowrap;
}
.docs-declaration-links .docs-source-link { align-items: center;
display: inline-flex;
gap: 4px;
text-decoration: none;
white-space: nowrap;
}
.docs-api-declaration h4 { font-size: 14px;
margin: 25px 0 8px;
}
.docs-api-example { margin-top: 1.5rem;
}
.docs-api-declaration .docs-api-example-heading { align-items: baseline;
display: flex;
gap: .45rem;
}
.docs-api-example-heading span { color: var(--docs-muted);
font-weight: 400;
}

.docs-landing { margin: 0 auto;
max-width: 1180px;
padding: 72px 28px 0;
}
.docs-landing-hero { max-width: 780px;
padding: 50px 0 80px;
}
.docs-eyebrow { color: var(--docs-accent);
font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
font-size: 12px;
font-weight: 700;
letter-spacing: 0.14em;
text-transform: uppercase;
}
.docs-landing h1 { font-size: clamp(48px,
9vw,
112px);
letter-spacing: -0.08em;
line-height: 0.9;
margin: 18px 0 28px;
}
.docs-landing-hero p { color: var(--docs-muted);
font-size: 20px;
line-height: 1.55;
max-width: 600px;
}
.docs-landing-grid { display: grid;
gap: 14px;
grid-template-columns: repeat(3,
minmax(0,
1fr));
}
.docs-landing-card { border: 1px solid var(--docs-border);
border-radius: 12px;
min-height: 250px;
padding: 25px;
position: relative;
transition: border-color 150ms ease,
transform 150ms ease;
}
.docs-landing-card:hover { border-color: var(--docs-accent);
transform: translateY(-3px);
}
.docs-card-index { color: var(--docs-accent);
font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
font-size: 12px;
}
.docs-landing-card h2 { font-size: 25px;
letter-spacing: -0.04em;
margin: 62px 0 10px;
}
.docs-landing-card p { color: var(--docs-muted);
line-height: 1.55;
margin: 0;
}
.docs-card-arrow { bottom: 23px;
color: var(--docs-accent);
position: absolute;
right: 24px;
}
.docs-landing-section { border-top: 1px solid var(--docs-border);
margin-top: 96px;
padding: 72px 0;
}
.docs-landing-section h2 { font-size: clamp(32px,
5vw,
58px);
letter-spacing: -0.06em;
margin: 14px 0 22px;
}
.docs-install-command { background: var(--docs-code-background);
color: var(--docs-foreground);
font-family: ui-monospace,
SFMono-Regular,
Menlo,
monospace;
justify-content: space-between;
margin-top: 30px;
max-width: 440px;
padding: 13px 15px;
width: 100%;
}
.docs-install-command span { color: var(--docs-accent);
font-family: inherit;
font-size: 11px;
}
.docs-quote-rail { border-left: 3px solid var(--docs-accent);
margin: 0;
max-width: 700px;
padding: 4px 0 4px 24px;
}
.docs-quote-rail blockquote { font-size: 26px;
letter-spacing: -0.035em;
line-height: 1.35;
margin: 0 0 16px;
}
.docs-quote-rail figcaption { color: var(--docs-muted);
}
.docs-faq { border-top: 1px solid var(--docs-border);
}
.docs-faq details { border-bottom: 1px solid var(--docs-border);
padding: 20px 0;
}
.docs-faq summary { cursor: pointer;
display: flex;
font-size: 17px;
font-weight: 700;
justify-content: space-between;
list-style: none;
}
.docs-faq summary::-webkit-details-marker { display: none;
}
.docs-faq details > div { color: var(--docs-muted);
line-height: 1.6;
padding: 14px 30px 0 0;
}
.docs-cta { align-items: center;
background: var(--docs-foreground);
border-radius: 14px;
color: var(--docs-background);
display: flex;
gap: 24px;
justify-content: space-between;
margin: 80px 0;
padding: 30px;
}
.docs-cta h2 { margin: 0;
}
.docs-cta a { border: 1px solid color-mix(in srgb,
var(--docs-background) 40%,
transparent);
border-radius: 7px;
flex-shrink: 0;
padding: 11px 14px;
}
.docs-footer { border-top: 1px solid var(--docs-border);
color: var(--docs-muted);
display: flex;
font-size: 13px;
justify-content: space-between;
margin-top: 90px;
padding: 24px 0;
}

@media (max-width: 1120px) {
    .docs-layout,
.docs-api-page { grid-template-columns: 220px minmax(0,
1fr);
}
    .docs-layout > .docs-toc,
.docs-api-page > .docs-toc { display: none;
}
}
@media (max-width: 780px) {
    .docs-header { gap: 12px;
height: 62px;
padding: 0 16px;
}
    .docs-menu-button { background: transparent;
border: 1px solid var(--docs-border);
border-radius: 6px;
color: var(--docs-muted);
display: block;
font-size: 12px;
margin-left: auto;
padding: 7px 9px;
}
    .docs-header-nav { background: var(--docs-background);
border: 1px solid var(--docs-border);
border-radius: 8px;
display: none;
left: 16px;
padding: 8px;
position: absolute;
right: 16px;
top: 54px;
}
    .docs-header-nav.is-open { display: grid;
}
    .docs-header-actions { margin-left: 0;
}
    .docs-search-button { min-width: 38px;
padding: 0;
}
    .docs-search-button span:nth-child(2),
.docs-search-button kbd,
.docs-repository-link { display: none;
}
    .docs-layout,
.docs-api-page { display: block;
}
    .docs-layout > .docs-sidebar,
.docs-api-page > .docs-sidebar { border-bottom: 1px solid var(--docs-border);
border-right: 0;
padding: 18px 16px;
}
    .docs-sidebar-group { margin-top: 15px;
}
    .docs-sidebar-group:not(:first-of-type) { display: none;
}
    .docs-sidebar .docs-nav-items { display: flex;
gap: 4px;
overflow-x: auto;
}
    .docs-sidebar .docs-nav-items li { flex: 0 0 auto;
}
    .docs-sidebar .docs-nav-items .docs-nav-items { display: none;
}
    .docs-main,
.docs-api-main { padding: 30px 18px 50px;
}
    .docs-article-topline,
.docs-api-heading-row { display: block;
margin: 34px 0 26px;
}
    .docs-copy-button { margin-top: 22px;
}
    .docs-landing { padding: 22px 18px 0;
}
    .docs-landing-hero { padding: 35px 0 50px;
}
    .docs-landing-grid { grid-template-columns: 1fr;
}
    .docs-landing-card { min-height: 190px;
}
    .docs-landing-card h2 { margin-top: 36px;
}
    .docs-declaration-heading { align-items: flex-start;
display: block;
}
    .docs-declaration-links { margin-top: 12px;
white-space: normal;
}
    .docs-cta { align-items: flex-start;
display: block;
}
    .docs-cta a { display: inline-block;
margin-top: 20px;
}
}
@media (prefers-reduced-motion: reduce) {
    *,
*::before,
*::after { scroll-behavior: auto !important;
transition: none !important;
}
}
`;
