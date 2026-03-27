import { initContract } from "@ts-rest/core";
import { authContract } from "./auth";

const c = initContract();

export const apiContract = c.router({
  auth: authContract
});

export type ApiContract = typeof apiContract;
