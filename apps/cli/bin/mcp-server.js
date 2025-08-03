#!/usr/bin/env bun
import { RecapAIMCPServer } from '../dist/mcp/server.js';

async function main() {
  const server = new RecapAIMCPServer();

  process.stderr.write('Starting Recap AI MCP Server...\n');

  try {
    await server.run();
  } catch (error) {
    process.stderr.write(`Error starting MCP server: ${error}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});
