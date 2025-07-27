import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  ListToolsRequestSchema,
  ToolSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { config } from '../utils/config.js';
import { TOOLS } from './tools/index.js';
import { RecapAITool } from './types.js';

export class RecapAIMCPServer {
  private server: Server;
  private tools: Map<string, RecapAITool>;

  constructor() {
    this.server = new Server(
      {
        name: 'recap-ai-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new Map();
    this.setupHandlers();
    this.registerTools();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
      }

      try {
        // Validate arguments against schema
        this.validateArgs(args || {}, tool.inputSchema);

        // Execute tool
        const result = await tool.handler(args || {});

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private registerTools(): void {
    TOOLS.forEach((tool) => {
      this.tools.set(tool.name, tool);
    });
  }

  private validateArgs(args: any, schema: any): void {
    try {
      // Simple validation - in production, use a proper JSON schema validator
      if (schema.required) {
        for (const required of schema.required) {
          if (!(required in args)) {
            throw new Error(`Missing required parameter: ${required}`);
          }
        }
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }
}
