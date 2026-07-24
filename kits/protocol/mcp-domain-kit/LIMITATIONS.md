# MCP Domain Kit Limitations

- The initial registry supports fixed resource URIs; URI templates are deferred.
- JSON Schema validation covers the bounded schema subset implemented by the
  kit and rejects `$ref`.
- Tool authorization is application supplied. Tools marked `required` fail
  closed when no authorization callback is configured.
- The Node adapter uses the stable MCP TypeScript SDK v1 line. HTTP transports
  and experimental MCP tasks are not part of this kit.
- Installing the kit does not expose any Engine API unless an application
  explicitly registers a provider.
