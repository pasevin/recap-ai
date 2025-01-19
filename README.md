# Recap AI

A modern CLI tool for aggregating and summarizing data from multiple services (GitHub, Linear, Slack) using AI.

## Features

- Fetch and analyze data from multiple services:
  - GitHub: Commits, PRs, reviews, and detailed metrics
  - Linear (Coming soon)
  - Slack (Coming soon)
- AI-powered summarization of aggregated data (Coming soon)
- Flexible output formats (JSON, Summary)
- Configurable data filters and date ranges
- Extensible plugin architecture

## Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- GitHub/Slack/Linear API tokens

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

1. Set up your configuration:

```bash
recap config setup
```

This will guide you through:

- Setting up API tokens
- Configuring GitHub defaults (timeframe, branch, etc.)

You can also configure settings individually:

```bash
# Set specific values
recap config set github.token YOUR_TOKEN
recap config set github.defaults.branch main

# Get current values
recap config get github.token

# Configure GitHub defaults interactively
recap config github
```

## Usage

### GitHub Integration

Fetch and analyze GitHub repository data:

```bash
# Basic usage (uses configured defaults)
recap github -r owner/repo

# Specify timeframe
recap github -r owner/repo -t 2w  # Last 2 weeks
recap github -r owner/repo -t 1m  # Last month

# Custom date range
recap github -r owner/repo --since 2024-01-01 --until 2024-01-31

# Filter by author and PR state
recap github -r owner/repo --author johndoe --pr-state open

# Different output formats
recap github -r owner/repo --format json
recap github -r owner/repo --format summary

# Save output to file
recap github -r owner/repo -o report.json
```

#### Available Metrics

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
