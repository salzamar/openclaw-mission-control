import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://fortunate-bat-669.convex.cloud");

const tasks = await client.query("queries:listTasks" as any, {});
const agents = await client.query("queries:listAgents" as any, {});

// Show most recent task
const sorted = tasks.sort((a: any, b: any) => b._creationTime - a._creationTime);
const task = sorted[0];
const assigneeNames = task.assigneeIds?.map((id: string) => {
  const agent = agents.find((a: any) => a._id === id);
  return agent?.name || "Unknown";
}) || [];

console.log("Latest task:");
console.log(`  Title: "${task.title}"`);
console.log(`  Status: ${task.status}`);
console.log(`  Assignees: [${assigneeNames.join(", ")}]`);
console.log(`  RunId: ${task.openclawRunId}`);
