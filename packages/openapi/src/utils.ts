type SecurityRequirementObject = { [key: string]: string[] };

export const getSecurityMetadata = () => ({
  openApiSecurity: [{ bearerAuth: [] }] as SecurityRequirementObject[]
});
