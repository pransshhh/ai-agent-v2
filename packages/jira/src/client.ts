import { AgileClient, Version3Client } from "jira.js";
import type { JiraConfig } from "./types";

export interface JiraClients {
  v3: Version3Client;
  agile: AgileClient;
}

export function createJiraClients(config: JiraConfig): JiraClients {
  const clientConfig = {
    host: config.baseUrl,
    authentication: {
      basic: {
        email: config.email,
        apiToken: config.apiToken
      }
    }
  };

  return {
    v3: new Version3Client(clientConfig),
    agile: new AgileClient(clientConfig)
  };
}
