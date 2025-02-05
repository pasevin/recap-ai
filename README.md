# Recap AI

A modern CLI tool for aggregating and summarizing data from multiple services (GitHub, Linear) using AI to generate insightful activity reports.

## Features

- Fetch and analyze data from multiple services:
  - GitHub Integration:
    - Commits, PRs, reviews, and detailed metrics
    - Comprehensive filtering options
    - Rich metadata analysis
  - Linear Integration:
    - Issue tracking and cycle management
    - Active and planned work tracking
    - Priority and state analysis
- AI-powered summarization:
  - Smart activity summaries using GPT-4
  - Contextual work updates
  - Progress tracking and planning insights
- Flexible output formats:
  - Detailed JSON for programmatic use
  - Human-readable summaries
  - AI-generated standup reports
- Advanced filtering capabilities:
  - Time-based filtering (relative and absolute dates)
  - State-based filtering
  - Author/assignee filtering
- Extensible plugin architecture

## Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- GitHub API token
- Linear API token
- OpenAI API token (for AI features)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/recap-ai.git
cd recap-ai

# Install dependencies
bun install

# Build the project
bun run build

# Link the CLI globally (optional)
bun link
```

## Configuration

Set up your configuration using one of these methods:

```bash
# Interactive setup wizard (recommended)
recap config --setup

# Configure services individually
recap config --github
recap config --linear
recap config --openai

# Manual configuration
recap config set github.token YOUR_TOKEN
recap config set linear.token YOUR_TOKEN
recap config set openai.token YOUR_TOKEN

# View current settings
recap config get github.token
recap config get linear.token
recap config get openai.token
```

### Service Configuration Options

#### GitHub Settings

- `token`: GitHub API token
- `defaults`:
  - `timeframe`: Default time period (e.g., "2w" for 2 weeks)
  - `branch`: Default branch to analyze
  - `author`: Default GitHub username to filter by
  - `prState`: Default PR state ("open", "closed", "all")

#### Linear Settings

- `token`: Linear API token
- `teamId`: Your Linear team ID
- `defaults`:
  - `person.identifier`: Default user identifier (email)
  - `timeframe`: Default time period
  - `state`: Default issue state
  - `limit`: Maximum number of issues to fetch (1-1000)

#### OpenAI Settings

- `token`: OpenAI API key (required for AI features)

## Usage

### GitHub Integration

```bash
# Basic usage (uses configured defaults)
recap github --repo owner/repo

# Specify timeframe
recap github --repo owner/repo --timeframe 2w  # Last 2 weeks
recap github --repo owner/repo --timeframe 1m  # Last month

# Custom date range
recap github --repo owner/repo --since 2024-01-01 --until 2024-01-31

# Filter by author and PR state
recap github --repo owner/repo --author johndoe --pr-state open

# Different output formats
recap github --repo owner/repo --format json
recap github --repo owner/repo --format summary

# Save output to file
recap github --repo owner/repo --output report.json
```

Available options:

- `--repo, -r`: Repository in format owner/repo (required)
- `--timeframe, -t`: Timeframe (e.g., 1d, 1w, 1m, 1y)
- `--since, -s`: Start date (YYYY-MM-DD)
- `--until, -u`: End date (YYYY-MM-DD)
- `--branch, -b`: Branch name to analyze
- `--author, -a`: Filter by author (use "none" to disable filtering)
- `--pr-state`: Filter PRs by state (open, closed, all)
- `--format, -f`: Output format (json, summary)
- `--output, -o`: Output file path

#### GitHub Metrics

The GitHub integration provides:

- Basic Statistics

  - Total commits and PRs
  - Open/Closed/Merged PR counts
  - Contribution statistics

- Review Status

  - Approved PRs
  - Changes requested
  - Commented
  - Pending reviews
  - Dismissed reviews

- Time Metrics

  - Average time to merge
  - Average time to close
  - PR velocity (PRs merged per day)

- Code Changes

  - Total additions/deletions
  - Changed files
  - Average PR size

- Contributors

  - Most active contributors
  - Contribution counts

- Labels
  - Top used labels
  - Label usage counts

### Linear Integration

```bash
# Basic usage (uses configured defaults)
recap linear

# Specify team ID
recap linear --team-id TEAM_ID

# Specify timeframe
recap linear --timeframe 2w  # Last 2 weeks
recap linear --timeframe 1m  # Last month

# Custom date range
recap linear --since 2024-01-01 --until 2024-01-31

# Filter by assignee and state
recap linear --assignee johndoe --state open

# Filter by author and label
recap linear --author janedoe --label bug

# Different output formats with timeframe
recap linear --author janedoe --timeframe 1m --format json

# Limit number of issues
recap linear --limit 50
```

Available options:

- `--team-id, -t`: Linear team ID
- `--timeframe, -f`: Timeframe (e.g., 1d, 1w, 1m, 1y)
- `--since, -s`: Start date (YYYY-MM-DD)
- `--until, -u`: End date (YYYY-MM-DD)
- `--assignee, -a`: Filter by assignee
- `--author`: Filter by issue creator
- `--state`: Filter issues by state (open, closed, all)
- `--label, -l`: Filter by label
- `--priority, -p`: Filter by priority (0-4)
- `--format, -f`: Output format (json, summary)
- `--output, -o`: Output file path
- `--limit, -n`: Maximum number of issues to fetch (1-100, default: 100)

### AI-Powered Summaries

```bash
# Generate summary with default timeframe
recap summarize

# Custom date range
recap summarize --since 2024-01-01 --until 2024-01-31

# Filter by author
recap summarize --author "John Doe"

# Output in JSON format
recap summarize --format json
```

Available options:

- `--since, -s`: Start date (YYYY-MM-DD)
- `--until, -u`: End date (YYYY-MM-DD)
- `--author, -a`: Filter by author
- `--format, -f`: Output format (text, json)

## Development

```bash
# Run in development mode
bun run dev

# Run tests
bun test

# Lint code
bun run lint
```

## License

MIT
