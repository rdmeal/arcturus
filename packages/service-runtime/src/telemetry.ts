// Loaded with `node --import`, before any application code, so instrumentations
// can patch modules as they load: docs/adr/0041-start-opentelemetry-from-service-runtime-with-import.md
// oxlint-disable-next-line unicorn/require-module-specifiers -- the service scripts already load this entry point, which starts nothing until OpenTelemetry is set up, and an empty file fails unicorn/no-empty-file
export {};
