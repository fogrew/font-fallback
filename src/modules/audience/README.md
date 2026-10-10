# audience

Resolves a browserslist query (including the Baseline queries) to browser versions in the browser, lazily loaded on first use. `resolveQuery` never reads files (`path: false`) and rejects empty, oversized and invalid queries. `AudienceEditor` offers presets plus a free-form query and shows the resolved list and the date of the bundled browser data (the newest release date in it).
