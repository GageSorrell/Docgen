# Configuration

`docs.config.json` owns metadata, navigation, versions, packages, API
generation, Storybook, route prefixes, and Vercel projects. Prefixes begin
with `/` and have no trailing slash. Defaults are `/`, `/docs`, and
`/storybook`.

Configure generated JSON Schema reference pages with `api.jsonSchemas`. Each
entry requires a repository-root-relative `path` and a public `route`. Schema
files must declare the Draft 2020-12 URI
`https://json-schema.org/draft/2020-12/schema`. Routes must be unique. A route
outside `/docs` is prefixed with `/docs` and logged as a warning. External
`$ref` values are shown without fetching them; local `$defs` links point to
anchors on the generated page.
