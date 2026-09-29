*&copy; 2026 Gage Sorrell.  Released under the [MIT license](./License.md).*

# `@sorrell/docs-api-reference`

Programmatic TypeDoc discovery, Draft 2020-12 JSON Schema references, and
deterministic API-reference snapshots for Sorrell documentation sites.

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
