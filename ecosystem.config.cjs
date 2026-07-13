// PM2 process definitions for production.
// Apps run via tsx (node --import tsx) — packages export raw TS, so there is no
// build step and `node dist/index.js` would fail resolving @repo/* to .ts source.
module.exports = {
  apps: [
    {
      name: "api",
      cwd: "./apps/api",
      script: "src/index.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      restart_delay: 2000
    },
    {
      name: "agent",
      cwd: "./apps/agent",
      script: "src/index.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      env: { NODE_ENV: "production" },
      max_restarts: 10,
      restart_delay: 2000
    }
  ]
};
