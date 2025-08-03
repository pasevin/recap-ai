import { RecapAITool } from '../types.js';
import { getActivitySummaryTool } from './get_activity_summary.js';
import { getActivityDataTool } from './get_activity_data.js';
import { getConfigurationTool } from './get_configuration.js';

export const TOOLS: RecapAITool[] = [
  getActivitySummaryTool,
  getActivityDataTool,
  getConfigurationTool,
];

export { getActivitySummaryTool, getActivityDataTool, getConfigurationTool };
