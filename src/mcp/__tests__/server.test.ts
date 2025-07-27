import { RecapAIMCPServer } from '../server.js';
import { TOOLS } from '../tools/index.js';

describe('RecapAIMCPServer', () => {
  let server: RecapAIMCPServer;

  beforeEach(() => {
    server = new RecapAIMCPServer();
  });

  test('should initialize with correct number of tools', () => {
    expect(TOOLS).toHaveLength(3);
  });

  test('should have all expected tools', () => {
    const toolNames = TOOLS.map((tool) => tool.name);

    expect(toolNames).toContain('get_activity_summary');
    expect(toolNames).toContain('get_activity_data');
    expect(toolNames).toContain('get_configuration');
  });

  test('tools should have required properties', () => {
    TOOLS.forEach((tool) => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool).toHaveProperty('handler');

      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(typeof tool.handler).toBe('function');
      expect(tool.inputSchema).toHaveProperty('type', 'object');
    });
  });

  test('get_activity_summary tool should have correct schema', () => {
    const summaryTool = TOOLS.find(
      (tool) => tool.name === 'get_activity_summary'
    );

    expect(summaryTool).toBeDefined();
    expect(summaryTool!.inputSchema.properties).toHaveProperty('repository');
    expect(summaryTool!.inputSchema.properties).toHaveProperty('timeframe');
    expect(summaryTool!.inputSchema.properties).toHaveProperty('author');
  });

  test('get_activity_data tool should have correct schema', () => {
    const dataTool = TOOLS.find((tool) => tool.name === 'get_activity_data');

    expect(dataTool).toBeDefined();
    expect(dataTool!.inputSchema.properties).toHaveProperty('repository');
    expect(dataTool!.inputSchema.properties).toHaveProperty('timeframe');
    expect(dataTool!.inputSchema.properties).toHaveProperty('format');
  });

  test('get_configuration tool should have correct schema', () => {
    const configTool = TOOLS.find((tool) => tool.name === 'get_configuration');

    expect(configTool).toBeDefined();
    expect(configTool!.inputSchema.properties).toHaveProperty('key');
    expect(configTool!.inputSchema.properties).toHaveProperty(
      'includeDefaults'
    );
  });

  test('server should initialize without throwing', () => {
    expect(() => new RecapAIMCPServer()).not.toThrow();
  });
});
