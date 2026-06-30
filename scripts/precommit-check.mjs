import { spawnSync } from "node:child_process";
import prettier from "prettier";

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    ...options,
    encoding: options.encoding ?? "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

const errors = [];

const diffCheck = runGit(["diff", "--cached", "--check"]);
if (diffCheck.status !== 0) {
  errors.push("Fix staged whitespace errors reported by git diff --check.");
  const output = `${diffCheck.stdout ?? ""}${diffCheck.stderr ?? ""}`.trim();
  if (output) {
    errors.push(output);
  }
}

const stagedResult = runGit(
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  {
    encoding: "buffer",
  },
);
const stagedFiles = stagedResult.stdout
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const prettierFiles = [];

for (const file of stagedFiles) {
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example")) {
    errors.push(`Do not commit secret-bearing env file: ${file}`);
    continue;
  }

  const blob = runGit(["show", `:${file}`], {
    encoding: "buffer",
    maxBuffer: 50 * 1024 * 1024,
  });

  if (blob.status !== 0) {
    errors.push(`Read staged file before committing: ${file}`);
    continue;
  }

  const content = blob.stdout;
  const hasBom =
    content.length >= 3 &&
    content[0] === 0xef &&
    content[1] === 0xbb &&
    content[2] === 0xbf;
  if (hasBom) {
    errors.push(`Save as UTF-8 without BOM: ${file}`);
  }

  const isBinary = content.includes(0);
  if (!isBinary && content.includes(13)) {
    errors.push(`Use LF line endings: ${file}`);
  }

  if (!isBinary) {
    prettierFiles.push({ file, content: content.toString("utf8") });
  }
}

for (const { file, content } of prettierFiles) {
  const fileInfo = await prettier.getFileInfo(file, {
    ignorePath: ".prettierignore",
  });
  if (fileInfo.ignored || !fileInfo.inferredParser) {
    continue;
  }

  const config = (await prettier.resolveConfig(file)) ?? {};
  const isFormatted = await prettier.check(content, {
    ...config,
    filepath: file,
  });
  if (!isFormatted) {
    errors.push(`Format staged file with Prettier: ${file}`);
  }
}

if (errors.length > 0) {
  console.error("pre-commit checks failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("pre-commit staged file checks passed");
