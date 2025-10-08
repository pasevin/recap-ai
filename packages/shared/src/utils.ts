// Shared utility functions for Recap AI
import { resolvePerspectiveName } from './types';

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isValidTimeframe(timeframe: string): boolean {
  const validTimeframes = ['1d', '1w', '1m', '1y'];
  return validTimeframes.includes(timeframe);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function formatPerspectiveDisplayName(
  rawIdentifier?: string,
  fallbackName?: string
): string | undefined {
  const displayName = resolvePerspectiveName(rawIdentifier, {
    fallbackName,
  });
  return displayName?.trim() || undefined;
}

export function formatThirdPersonSentence(
  sentence: string,
  subjectName: string
): string {
  if (!sentence.trim() || !subjectName.trim()) {
    return sentence;
  }

  const normalizedSentence = sentence.trim();
  const normalizedSubject = subjectName.trim();

  // Replace leading first-person pronouns while keeping capitalization intact
  const pronounPatterns = [/^I\b/i, /^I'm\b/i, /^I've\b/i, /^I'd\b/i];
  for (const pattern of pronounPatterns) {
    if (pattern.test(normalizedSentence)) {
      return normalizedSentence.replace(pattern, (match) => {
        const lower = match.toLowerCase();
        switch (lower) {
          case 'i':
            return normalizedSubject;
          case "i'm":
            return `${normalizedSubject} is`;
          case "i've":
            return `${normalizedSubject} has`;
          case "i'd":
            return `${normalizedSubject} would`;
          default:
            return normalizedSubject;
        }
      });
    }
  }

  return normalizedSentence.replace(/(\bmy\b|\bmine\b|\bme\b)/gi, (match) => {
    switch (match.toLowerCase()) {
      case 'my':
        return `${normalizedSubject}'s`;
      case 'mine':
        return `${normalizedSubject}'s`;
      case 'me':
        return normalizedSubject;
      default:
        return match;
    }
  });
}
