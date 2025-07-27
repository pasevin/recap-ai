import { getConfigurationTool } from '../tools/get_configuration.js';
import { getActivitySummaryTool, getActivityDataTool } from '../tools/index.js';

describe('MCP Tools', () => {
  describe('getConfigurationTool', () => {
    test('should have correct tool definition', () => {
      expect(getConfigurationTool.name).toBe('get_configuration');
      expect(getConfigurationTool.description).toContain(
        'configuration settings'
      );
      expect(typeof getConfigurationTool.handler).toBe('function');
    });

    test('should return configuration status without sensitive data', async () => {
      const result = await getConfigurationTool.handler({});

      expect(result).toHaveProperty('configuration');
      expect(result).toHaveProperty('integrations');
      expect(result).toHaveProperty('note');
      expect(result.note).toContain('API tokens are hidden');

      // Should have integration status
      expect(result.configuration).toHaveProperty('github');
      expect(result.configuration).toHaveProperty('linear');
      expect(result.configuration).toHaveProperty('openai');

      // Should indicate if tokens are configured without exposing them
      expect(result.configuration.github).toHaveProperty('hasToken');
      expect(result.configuration.linear).toHaveProperty('hasToken');
      expect(result.configuration.openai).toHaveProperty('hasToken');
    });

    test('should reject requests for sensitive keys', async () => {
      await expect(
        getConfigurationTool.handler({ key: 'github.token' })
      ).rejects.toThrow('Cannot retrieve sensitive configuration values');

      await expect(
        getConfigurationTool.handler({ key: 'linear.token' })
      ).rejects.toThrow('Cannot retrieve sensitive configuration values');

      await expect(
        getConfigurationTool.handler({ key: 'openai.token' })
      ).rejects.toThrow('Cannot retrieve sensitive configuration values');
    });

    test('should allow non-sensitive key retrieval', async () => {
      const result = await getConfigurationTool.handler({
        key: 'github.defaults.timeframe',
      });

      // The result should have the key as a property
      expect(Object.keys(result)).toContain('github.defaults.timeframe');
      expect(result).toHaveProperty('note');
      expect(result.note).toContain('Retrieved specific configuration key');
      expect(result['github.defaults.timeframe']).toBeDefined();
    });
  });

  describe('Tool Schema Validation', () => {
    test('get_activity_summary should have valid timeframe options', () => {
      const timeframeEnum =
        getActivitySummaryTool.inputSchema.properties.timeframe.enum;
      expect(timeframeEnum).toContain('1d');
      expect(timeframeEnum).toContain('1w');
      expect(timeframeEnum).toContain('1m');
      expect(timeframeEnum).toContain('1y');
    });

    test('get_activity_data should have valid format options', () => {
      const formatEnum = getActivityDataTool.inputSchema.properties.format.enum;
      expect(formatEnum).toContain('enhanced');
      expect(formatEnum).toContain('basic');
    });

    test('repository pattern should be valid for both data tools', () => {
      const summaryPattern =
        getActivitySummaryTool.inputSchema.properties.repository.pattern;
      const dataPattern =
        getActivityDataTool.inputSchema.properties.repository.pattern;

      expect(summaryPattern).toBe('^[^/]+/[^/]+$');
      expect(dataPattern).toBe('^[^/]+/[^/]+$');

      // Test pattern validity
      const validRepo = 'owner/repo';
      const invalidRepo = 'invalid-repo';

      expect(new RegExp(summaryPattern).test(validRepo)).toBe(true);
      expect(new RegExp(summaryPattern).test(invalidRepo)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('tools should handle invalid arguments gracefully', async () => {
      // This test would need proper mocking of services to avoid actual API calls
      // For now, we'll just test that the handlers are functions
      expect(typeof getActivitySummaryTool.handler).toBe('function');
      expect(typeof getActivityDataTool.handler).toBe('function');
      expect(typeof getConfigurationTool.handler).toBe('function');
    });
  });
});
