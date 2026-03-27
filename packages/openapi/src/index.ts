import { generateOpenApi } from "@ts-rest/open-api";
import { apiContract } from "./contracts";

type SecurityRequirementObject = { [key: string]: string[] };

type OperationMapper = NonNullable<
  Parameters<typeof generateOpenApi>[2]
>["operationMapper"];

const hasSecurity = (
  metadata: unknown
): metadata is { openApiSecurity: SecurityRequirementObject[] } =>
  !!metadata && typeof metadata === "object" && "openApiSecurity" in metadata;

const operationMapper: OperationMapper = (operation, appRoute) => ({
  ...operation,
  ...(hasSecurity(appRoute.metadata)
    ? { security: appRoute.metadata.openApiSecurity }
    : {})
});

export const OpenAPI = {
  ...generateOpenApi(
    apiContract,
    {
      openapi: "3.0.2",
      info: { version: "1.0.0", title: "AI Dev Agent API" },
      servers: [{ url: "http://localhost:3000", description: "Local" }]
    },
    { operationMapper, setOperationId: true }
  ),
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    }
  }
};

export * from "./contracts";
export * from "./utils";
