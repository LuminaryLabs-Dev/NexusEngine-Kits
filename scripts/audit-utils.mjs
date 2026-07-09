import fs from "node:fs";
import path from "node:path";

export const rootDir = process.cwd();

export function repoPath(...parts) {
  return path.join(rootDir, ...parts);
}

export function exists(...parts) {
  return fs.existsSync(repoPath(...parts));
}

export function readJson(...parts) {
  return JSON.parse(fs.readFileSync(repoPath(...parts), "utf8"));
}

export function ensureDir(...parts) {
  fs.mkdirSync(repoPath(...parts), { recursive: true });
}

export function writeText(relativePath, content) {
  const fullPath = repoPath(relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

export function writeJson(relativePath, value) {
  writeText(relativePath, JSON.stringify(value, null, 2) + "\n");
}

export function createAudit(name) {
  const warnings = [];
  const errors = [];
  return {
    name,
    warnings,
    errors,
    warn(message) {
      warnings.push(message);
    },
    error(message) {
      errors.push(message);
    },
    ok() {
      return errors.length === 0;
    },
    toMarkdown() {
      const lines = [`# ${name}`, "", `Errors: ${errors.length}`, `Warnings: ${warnings.length}`, ""];
      if (errors.length) {
        lines.push("## Errors", "");
        for (const item of errors) lines.push(`- ${item}`);
        lines.push("");
      }
      if (warnings.length) {
        lines.push("## Warnings", "");
        for (const item of warnings) lines.push(`- ${item}`);
        lines.push("");
      }
      if (!errors.length && !warnings.length) lines.push("No issues found.", "");
      return lines.join("\n");
    },
    finish(reportPath) {
      ensureDir("audit", "reports");
      writeJson(`audit/reports/${reportPath}.json`, { name, errors, warnings });
      writeText(`audit/reports/${reportPath}.md`, this.toMarkdown());
      if (errors.length) {
        console.error(this.toMarkdown());
        process.exitCode = 1;
      } else {
        console.log(`${name} ok`, { warnings: warnings.length });
      }
    }
  };
}

export function pathFromPackageTarget(target) {
  return String(target).replace(/^\.\//, "");
}
