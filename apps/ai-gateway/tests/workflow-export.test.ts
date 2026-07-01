import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

interface WorkflowNode {
  readonly name: string;
  readonly parameters: Record<string, unknown>;
}

interface WorkflowExport {
  readonly nodes: readonly WorkflowNode[];
}

const testDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testDir, "../../..");

async function readWorkflow(path: string): Promise<WorkflowExport> {
  const content = await readFile(resolve(rootDir, path), "utf8");

  return JSON.parse(content) as WorkflowExport;
}

function findNode(workflow: WorkflowExport, name: string): WorkflowNode {
  const node = workflow.nodes.find((candidate) => candidate.name === name);

  assert.ok(node, `Expected workflow node: ${name}`);

  return node;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("n8n workflow exports", () => {
  it("maps Gmail draft recipients through draft options", async () => {
    const workflow = await readWorkflow(
      "workflows/n8n/leadops-main.workflow.json",
    );
    const node = findNode(workflow, "Create Gmail Draft");
    const options = node.parameters.options;

    assert.equal(node.parameters.resource, "draft");
    assert.equal(node.parameters.operation, "create");
    assert.equal("sendTo" in node.parameters, false);
    assert.ok(isRecord(options));
    assert.equal(
      options.sendTo,
      '={{ $node["Build CRM Record"].json.gmail_draft.to }}',
    );
  });
});
