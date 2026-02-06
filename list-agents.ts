import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://fortunate-bat-669.convex.cloud");

const result = await client.query("queries:listAgents" as any, {});
console.log("Agents:");
for (const agent of result) {
  console.log(`  - name: "${agent.name}"`);
}
