export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "chore",
        "ci",
        "revert"
      ]
    ],
    "scope-enum": [
      2,
      "always",
      [
        "api",
        "web",
        "worker",
        "agents",
        "integrations",
        "contracts",
        "validation",
        "config",
        "db",
        "queue",
        "deps",
        "ci",
        "release"
      ]
    ],
    "subject-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", 100]
  }
};
