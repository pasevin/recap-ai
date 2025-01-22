# Recap AI

A modern CLI tool for aggregating and summarizing data from multiple services (GitHub, Linear) using AI.

## Features

- Fetch and analyze data from multiple services:
  - GitHub: Commits, PRs, reviews, and detailed metrics
  - Linear (Coming soon)
- AI-powered summarization of aggregated data (Coming soon)
- Flexible output formats (JSON, Summary)
- Configurable data filters and date ranges
- Extensible plugin architecture

## Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- GitHub/Linear API tokens

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

# Manual configuration
recap config set github.token YOUR_TOKEN
recap config set linear.token YOUR_TOKEN

# View current settings
recap config get github.token
recap config get github.defaults
recap config get linear.defaults
```

Each service can be configured with defaults:

### GitHub Defaults

- `timeframe`: Default time period (e.g., "2w" for 2 weeks)
- `branch`: Default branch to analyze
- `author`: Default GitHub username to filter by
- `prState`: Default PR state ("open", "closed", "all")

### Linear Defaults

- `teamId`: Your Linear team ID
- `timeframe`: Default time period
- `state`: Default issue state ("open", "closed", "all")
- `limit`: Maximum number of issues to fetch (1-1000)

## Usage

### GitHub Integration

Fetch and analyze GitHub repository data:

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
```

#### GitHub Metrics

The GitHub integration provides comprehensive metrics:

- Basic Statistics

  - Total commits and PRs
  - Open/Closed/Merged PR counts

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
  - Top 10 most used labels
  - Label usage counts

### Linear Integration

Fetch and analyze Linear issues:

```bash
# Basic usage (uses configured defaults)
recap linear --team TEAM_ID

# Specify timeframe
recap linear --team TEAM_ID --timeframe 2w  # Last 2 weeks
recap linear --team TEAM_ID --timeframe 1m  # Last month

# Custom date range
recap linear --team TEAM_ID --since 2024-01-01 --until 2024-01-31

# Filter by assignee and state
recap linear --team TEAM_ID --assignee johndoe --state open

# Different output formats
recap linear --team TEAM_ID --format json
recap linear --team TEAM_ID --format summary

# Limit number of issues
recap linear --team TEAM_ID --limit 500
```

#### Linear Metrics

The Linear integration provides:

- Issue Statistics

  - Total issues
  - Open/Closed issue counts
  - Issues by state

- Time Metrics

  - Average time to close
  - Issue velocity (issues closed per day)

- Contributors

  - Most active assignees
  - Issues by assignee

- Labels & Projects
  - Issues by label
  - Issues by project

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
