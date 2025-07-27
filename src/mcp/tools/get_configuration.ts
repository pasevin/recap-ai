import { config } from '../../utils/config.js';
import { RecapAITool, ConfigurationArgs } from '../types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const getConfigurationTool: RecapAITool = {
  name: 'get_configuration',
  description:
    'Get current recap-ai configuration settings (excludes sensitive tokens)',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description:
          'Specific configuration key to retrieve (e.g., "github.defaults")',
      },
      includeDefaults: {
        type: 'boolean',
        description: 'Include default configuration values',
        default: true,
      },
    },
  },
  handler: async (args: ConfigurationArgs) => {
    try {
      if (args.key) {
        // Return specific key (but sanitize sensitive data)
        if (args.key.includes('token') || args.key.includes('password')) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Cannot retrieve sensitive configuration values via MCP'
          );
        }

        const value = config.get(args.key);
        return {
          [args.key]: value,
          note: 'Retrieved specific configuration key (sensitive data excluded)',
        };
      }

      // Return safe subset of configuration
      const safeConfig = {
        github: {
          defaults: {
            timeframe: config.get('github.defaults.timeframe'),
            repository: config.get('github.defaults.repository'),
            branch: config.get('github.defaults.branch'),
            person: {
              identifier: config.get('github.defaults.person.identifier'),
              includeAuthored: config.get(
                'github.defaults.person.includeAuthored'
              ),
              includeReviewed: config.get(
                'github.defaults.person.includeReviewed'
              ),
              includeAssigned: config.get(
                'github.defaults.person.includeAssigned'
              ),
              includeCommented: config.get(
                'github.defaults.person.includeCommented'
              ),
              includeMentioned: config.get(
                'github.defaults.person.includeMentioned'
              ),
            },
            prState: config.get('github.defaults.prState'),
          },
          hasToken: !!config.get('github.token'),
          configured: !!config.get('github.token'),
        },
        linear: {
          defaults: {
            teamId: config.get('linear.defaults.teamId'),
            timeframe: config.get('linear.defaults.timeframe'),
            state: config.get('linear.defaults.state'),
            person: {
              identifier: config.get('linear.defaults.person.identifier'),
              includeCreated: config.get(
                'linear.defaults.person.includeCreated'
              ),
              includeAssigned: config.get(
                'linear.defaults.person.includeAssigned'
              ),
              includeCommented: config.get(
                'linear.defaults.person.includeCommented'
              ),
              includeSubscribed: config.get(
                'linear.defaults.person.includeSubscribed'
              ),
              includeMentioned: config.get(
                'linear.defaults.person.includeMentioned'
              ),
            },
            limit: config.get('linear.defaults.limit'),
          },
          hasToken: !!config.get('linear.token'),
          configured: !!config.get('linear.token'),
        },
        openai: {
          model: config.get('openai.model'),
          hasToken: !!config.get('openai.token'),
          configured: !!config.get('openai.token'),
        },
      };

      // Add integration status summary
      const integrations = [];
      if (safeConfig.github.configured) integrations.push('GitHub');
      if (safeConfig.linear.configured) integrations.push('Linear');
      if (safeConfig.openai.configured) integrations.push('OpenAI');

      return {
        configuration: safeConfig,
        integrations: {
          available: integrations,
          count: integrations.length,
          summary:
            integrations.length > 0
              ? `${integrations.join(', ')} configured`
              : 'No integrations configured',
        },
        metadata: {
          retrieved_at: new Date().toISOString(),
          includeDefaults: args.includeDefaults !== false,
        },
        note: 'API tokens are hidden for security. Use CLI to configure tokens: recap config set <key> <value>',
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to retrieve configuration: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};
