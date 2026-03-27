import fs from "node:fs";
import { OpenAPI } from "./index";

const paths = ["./openapi.json", "../../apps/api/static/openapi.json"];

for (const p of paths) {
  fs.writeFile(p, JSON.stringify(OpenAPI, null, 2), (err) => {
    if (err) console.error(`Error writing to ${p}:`, err);
    else console.log(`OpenAPI spec written to ${p}`);
  });
}
