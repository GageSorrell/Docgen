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

Unreal projects and plugins can be configured separately under
`api.unreal.projects` and `api.unreal.plugins`. Each entry requires an explicit
ID, display name, version, descriptor path, and Doxygen XML directory. Project
descriptors must be `.uproject` files and plugin descriptors must be
`.uplugin` files. Descriptor paths and XML directories are relative to the
repository root; the descriptor is validated, while declarations come from
the Doxygen XML prepared by the Unreal build.

```json
{
  "api": {
    "unreal": {
      "projects": [
        {
          "id": "sample-game",
          "name": "Sample Game",
          "version": "1.0.0",
          "descriptor": "SampleGame/SampleGame.uproject",
          "xmlDirectory": "SampleGame/build/docs/xml"
        }
      ],
      "plugins": [
        {
          "id": "sample-plugin",
          "name": "Sample Plugin",
          "version": "1.0.0",
          "descriptor": "SampleGame/Plugins/SamplePlugin/SamplePlugin.uplugin",
          "xmlDirectory": "SampleGame/Plugins/SamplePlugin/build/docs/xml"
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
