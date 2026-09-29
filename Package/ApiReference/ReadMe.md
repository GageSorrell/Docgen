*&copy; 2026 Gage Sorrell.  Released under the [MIT license](./License.md).*

# `@sorrell/docs-api-reference`

Programmatic TypeDoc discovery, Doxygen XML parsing, Draft 2020-12 JSON Schema
references, and deterministic mixed-language API-reference snapshots for
Sorrell documentation sites.

Add C++ APIs under `api.doxygen.projects` in `docs.config.json`. The project's
own build should run Doxygen with XML output enabled before `sorrell-docs api
generate`; Sorrell Docs reads the configured repository-root-relative XML
directory and does not invoke Doxygen.

```json
{
  "api": {
    "doxygen": {
      "projects": [
        {
          "id": "engine",
          "name": "Engine",
          "version": "1.2.0",
          "xmlDirectory": "build/docs/xml"
        }
      ]
    }
  }
}
```

Add schema references under `api.jsonSchemas` in `docs.config.json`:

```json
{
  "api": {
    "jsonSchemas": [
      {
        "path": "Package/Example/Source/Settings.schema.json",
        "route": "/docs/settings-schema/"
      }
    ]
  }
}
```

`path` is relative to the repository root. Each schema must declare
`"$schema": "https://json-schema.org/draft/2020-12/schema"`. Routes outside
`/docs` are prefixed with `/docs` and produce a warning. External `$ref` values
are displayed without fetching their targets; local `$defs` references link to
anchors on the generated page.
