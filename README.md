# Recap AI

A modern CLI tool for aggregating and summarizing development activity from GitHub and Linear using AI to generate insightful reports and summaries.

## 🚀 Features

### Multi-Service Integration

- **GitHub Integration**:
  - Full repository analysis (commits, PRs, issues, reviews)
  - Global user activity search across all repositories
  - Enhanced data collection with intelligent commit-PR associations
  - Comprehensive metrics and statistics
- **Linear Integration**:
  - Issue tracking and cycle management
  - Team-based filtering and analysis
  - Priority and state-based insights
- **AI-Powered Summarization**:
  - Smart activity summaries using OpenAI GPT models
  - Contextual work updates and progress tracking
  - Enhanced formatting with source references

### Advanced Capabilities

- **MCP Integration**: Full Model Context Protocol support for AI agent integration
- **Flexible Output Formats**: JSON, summary, detailed enhanced output
- **Intelligent Filtering**: Time-based, author-based, state-based filtering
- **Configuration Management**: Interactive setup wizard and manual configuration
- **Extensible Architecture**: Plugin-ready design with service factory pattern

## 📋 Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- GitHub Personal Access Token
- Linear API Token
- OpenAI API Key (for AI summarization features)

## 🛠 Installation

```bash
# Install the CLI globally
bun install -g recap-ai
```

## ⚙️ Configuration

### Quick Setup (Recommended)

Run the interactive setup wizard:

```bash
recap config --setup
```

### Manual Configuration

```bash
# Set API tokens
recap config set github.token YOUR_GITHUB_TOKEN
recap config set linear.token YOUR_LINEAR_TOKEN
recap config set openai.token YOUR_OPENAI_TOKEN

# Configure GitHub defaults (optional)

# Set defaults (optional)
recap config set github.defaults.timeframe 1w
recap config set github.defaults.person.identifier your-github-username
recap config set linear.defaults.teamId YOUR_LINEAR_TEAM_ID
recap config set linear.defaults.person.identifier your-email@example.com

# View current configuration
recap config get github.token
recap config get linear.token
```

### Service-Specific Configuration

```bash
# Configure individual services
recap config --github    # GitHub-specific setup
recap config --linear     # Linear-specific setup
recap config --openai     # OpenAI-specific setup
```

## 🎯 Usage

### AI-Powered Activity Summaries

Generate intelligent summaries combining GitHub and Linear activity:

```bash
# Default summary for configured user
recap summarize

# Repository-specific activity summary
recap summarize --repo owner/repo

# Global user activity summary
recap summarize --author johndoe

# Custom date range
recap summarize --since 2024-01-01 --until 2024-01-31

# Detailed summary with source references
recap summarize --detailed

# JSON output for programmatic use
recap summarize --format json
```

### GitHub Integration

#### Repository Analysis

```bash
# Basic repository analysis
recap github --repo owner/repo

# With custom timeframe
recap github --repo owner/repo --timeframe 2w

# Filter by author and PR state
recap github --repo owner/repo --author johndoe --pr-state open

# Custom date range
recap github --repo owner/repo --since 2024-01-01 --until 2024-01-31

# Enhanced data collection (now default behavior)
recap github --repo owner/repo
```

#### Global User Activity

```bash
# Search user activity across all repositories
recap github --author username --timeframe 1w

# User activity with custom date range
recap github --author username --since 2024-01-01 --until 2024-01-31
```

#### GitHub Command Options

- `--repo, -r`: Repository in format owner/repo
- `--timeframe, -t`: Time period (1d, 1w, 1m, 1y)
- `--since, -s`: Start date (YYYY-MM-DD)
- `--until, -u`: End date (YYYY-MM-DD)
- `--branch, -b`: Branch name to analyze
- `--author, -a`: Filter by author (use "none" to disable)
- `--pr-state`: Filter PRs by state (open, closed, all)
- `--format, -f`: Output format (json, summary)
- `--output, -o`: Save output to file

### Linear Integration

```bash
# Basic Linear analysis (uses configured team)
recap linear

# Specify team ID
recap linear --team-id TEAM_ID

# Filter by assignee and state
recap linear --assignee johndoe --state open

# Filter by author and labels
recap linear --author janedoe --label bug

# Custom timeframe and priority filtering
recap linear --timeframe 1m --priority 3

# Limit results
recap linear --limit 50
```

#### Linear Command Options

- `--team-id, -t`: Linear team ID
- `--timeframe, -f`: Time period (1d, 1w, 1m, 1y)
- `--since, -s`: Start date (YYYY-MM-DD)
- `--until, -u`: End date (YYYY-MM-DD)
- `--assignee, -a`: Filter by assignee
- `--author`: Filter by issue creator
- `--state`: Filter by state (open, closed, all)
- `--label, -l`: Filter by label
- `--priority, -p`: Filter by priority (0-4)
- `--format, -f`: Output format (json, summary)
- `--output, -o`: Save output to file
- `--limit, -n`: Maximum issues to fetch (1-100)

## 🤖 MCP Integration (Model Context Protocol)

Recap AI supports MCP (Model Context Protocol) to expose its functionality to other AI agents and tools. This allows agents like Cursor, Claude Desktop, and other MCP-compatible clients to access development activity data directly.

### MCP Server Management

#### Start the MCP Server

```bash
# Start MCP server (runs on stdio transport)
recap mcp start

# Start with verbose logging
recap mcp start --verbose
```

#### Check Server Status

```bash
# View configuration and integration status
recap mcp status
```

#### Test Server Functionality

```bash
# Validate server setup and configuration
recap mcp test
```

### Available MCP Tools

The MCP server exposes three powerful tools for AI agents:

#### 1. `get_activity_summary`

**AI-powered development activity summaries combining GitHub and Linear data**

```typescript
// Parameters
{
  repository?: string,     // GitHub repo (owner/repo format)
  timeframe?: "1d"|"1w"|"1m"|"1y",  // Time period
  author?: string,         // Filter by specific user
  since?: string,          // Start date (YYYY-MM-DD)
  until?: string           // End date (YYYY-MM-DD)
}

// Returns comprehensive AI summary with metadata
```

#### 2. `get_activity_data`

**Raw development activity data for custom analysis**

```typescript
// Parameters
{
  repository?: string,     // GitHub repo (owner/repo format)
  timeframe?: "1d"|"1w"|"1m"|"1y",  // Time period
  author?: string,         // Filter by specific user
  since?: string,          // Start date (YYYY-MM-DD)
  until?: string,          // End date (YYYY-MM-DD)
  format?: "enhanced"|"basic"       // Data collection mode
}

// Returns structured GitHub + Linear data
```

#### 3. `get_configuration`

**Safe configuration status and integration availability**

```typescript
// Parameters
{
  key?: string,            // Specific config key to retrieve
  includeDefaults?: boolean // Include default values
}

// Returns configuration status (tokens hidden for security)
```

### Client Configuration Examples

#### Cursor Configuration

Add to your `.cursor/config.json`:

```json
{
  "mcp": {
    "servers": {
      "recap-ai": {
        "command": "recap",
        "args": ["mcp", "start"]
      }
    }
  }
}
```

#### Claude Desktop Configuration

Add to your Claude Desktop MCP config:

```json
{
  "servers": {
    "recap-ai": {
      "command": "recap-mcp-server"
    }
  }
}
```

#### Generic MCP Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Connect to recap-ai MCP server
const transport = new StdioClientTransport({
  command: 'recap',
  args: ['mcp', 'start'],
});

const client = new Client(
  { name: 'my-client', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

await client.connect(transport);

// Use tools
const summary = await client.callTool('get_activity_summary', {
  repository: 'owner/repo',
  timeframe: '1w',
});
```

### MCP Usage Examples

#### Generate AI Summaries for Standups

```typescript
// Get comprehensive activity summary
const summary = await client.callTool('get_activity_summary', {
  timeframe: '1w',
  author: 'your-username',
});

// Returns AI-generated summary combining:
// - GitHub commits, PRs, issues
// - Linear issues and progress
// - Contextual work updates
```

#### Collect Raw Data for Analysis

```typescript
// Get structured activity data
const data = await client.callTool('get_activity_data', {
  repository: 'company/product',
  timeframe: '1m',
  format: 'enhanced',
});

// Returns detailed GitHub + Linear data for custom analysis
```

#### Check Integration Status

```typescript
// Check what's configured
const config = await client.callTool('get_configuration', {});

// Returns safe configuration status showing:
// - Which integrations are configured (GitHub, Linear, OpenAI)
// - Default settings (without exposing tokens)
// - Available capabilities
```

### Security Features

- **Token Protection**: API tokens are never exposed via MCP tools
- **Safe Configuration**: Only non-sensitive config values can be retrieved
- **Input Validation**: All tool parameters are validated against schemas
- **Error Handling**: Comprehensive error handling with clear messages

### Troubleshooting MCP Integration

#### Server Won't Start

```bash
# Check configuration
recap mcp status

# Validate setup
recap mcp test

# Check for missing tokens
recap config get github.token
recap config get openai.token
```

#### Tools Not Working

```bash
# Verify server functionality
recap mcp test

# Check if at least one data source is configured
recap mcp status

# Test CLI functionality first
recap summarize --timeframe 1w
```

#### Client Connection Issues

- Ensure the MCP server process is running
- Verify client configuration points to correct command/args
- Check that recap-ai is installed and accessible in PATH

## 🔧 Advanced Features

### Enhanced GitHub Integration

Recap AI provides intelligent data collection and analysis:

- **Smart Data Association**: Automatic commit-PR linking and relationship mapping
- **Cross-Repository Activity**: Comprehensive user activity tracking across repositories
- **Optimized Performance**: Intelligent batching and rate limiting for API efficiency
- **Rich Context**: Enhanced metadata collection for superior AI summarization

### Configuration File Structure

The configuration is stored in `.recap-ai.config.json`:

```json
{
  "github": {
    "token": "your_github_token",
    "defaults": {
      "timeframe": "1w",
      "person": {
        "identifier": "your-username"
      },
      "prState": "all"
    }
  },
  "linear": {
    "token": "your_linear_token",
    "defaults": {
      "teamId": "your_team_id",
      "timeframe": "1w",
      "person": {
        "identifier": "your-email@example.com"
      },
      "limit": 100
    }
  },
  "openai": {
    "token": "your_openai_token"
  }
}
```

### Output Formats

#### Summary Format

Human-readable output with organized sections and key metrics.

#### JSON Format

Complete structured data for programmatic processing and integration.

#### Enhanced/Detailed Format

Comprehensive formatting with source references and enriched context for AI summaries.

## 🧪 Development

```bash
# Run in development mode
bun run dev

# Run tests
bun test

# Lint code
bun run lint

# Clean build artifacts
bun run clean

# Build for production
bun run build
```

## 📖 API Reference

### Core Commands

- `recap summarize` - Generate AI-powered activity summaries
- `recap github` - Fetch and analyze GitHub data
- `recap linear` - Fetch and analyze Linear data
- `recap config` - Manage configuration settings
- `recap mcp` - Manage MCP server for AI agent integration

### Service Architecture

- **Service Factory**: Dynamic service creation and GitHub API integration
- **Enhanced GitHub Service**: Intelligent data collection with commit-PR associations
- **AI Service**: OpenAI integration for intelligent summarization
- **Configuration Manager**: Centralized settings and defaults management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:

- Create an issue on GitHub
- Check the documentation and examples above
- Ensure your API tokens are properly configured

---

**Built with TypeScript, Bun, and oclif** • Powered by AI for intelligent development insights
