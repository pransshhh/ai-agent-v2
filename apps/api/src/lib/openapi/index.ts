import {
  OpenAPIRegistry,
  OpenApiGeneratorV3
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "@asteasolutions/zod-to-openapi/dist/types";
import { registerAgentPaths } from "./agent";
import { registerAuthPaths } from "./auth";
import { registerJiraPaths } from "./jira";

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "better-auth.session_token"
});

registerAuthPaths(registry);
registerJiraPaths(registry);
registerAgentPaths(registry);

export const generateOpenAPISpec = (): OpenAPIObject => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "AI Dev Agent API",
      version: "1.0.0"
    },
    servers: [{ url: process.env.API_URL ?? "http://localhost:3000" }]
  }) as OpenAPIObject;
};
