import { test, expect, describe } from 'bun:test';
import { getCardLayoutClasses } from '@/lib/ui/card-utils';
import { formatAlertMessage } from '@/lib/ui/alert-utils';

describe('Card utils', () => {
  test('default card classes include weathered surface and dashed border', () => {
    const classes = getCardLayoutClasses();
    expect(classes).toContain('weathered-surface');
    expect(classes).toContain('border-dashed');
  });

  test('panel variant applies terminal-panel', () => {
    const classes = getCardLayoutClasses({ variant: 'panel' });
    expect(classes).toContain('terminal-panel');
  });

  test('window variant applies terminal-window', () => {
    const classes = getCardLayoutClasses({ variant: 'window' });
    expect(classes).toContain('terminal-window');
  });

  test('bordered option applies terminal-border', () => {
    const classes = getCardLayoutClasses({ bordered: true });
    expect(classes).toContain('terminal-border');
  });
});

describe('Alert utils', () => {
  test('loading state overrides variant message', () => {
    const msg = formatAlertMessage('destructive', { loading: true });
    expect(msg.title).toBe('Processing...');
  });

  test('variant messages map correctly', () => {
    expect(formatAlertMessage('destructive').title).toBe('Error');
    expect(formatAlertMessage('warning').title).toBe('Warning');
    expect(formatAlertMessage('success').title).toBe('Success');
    expect(formatAlertMessage('default').title).toBe('Information');
  });

  test('state precedence order: loading > disabled > focused > active > variant', () => {
    const disabled = formatAlertMessage('success', { disabled: true });
    expect(disabled.title).toBe('Disabled Alert');

    const focused = formatAlertMessage('success', { focused: true });
    expect(focused.title).toBe('Focused State');

    const active = formatAlertMessage('success', { active: true });
    expect(active.title).toBe('Active Alert');
  });
});
