/**
 * PII Redaction Utility
 *
 * Redacts personally identifiable information from logs and debug data
 * before sharing externally. This allows production debugging while
 * protecting sensitive user data.
 */

/**
 * Sensitive field patterns to redact.
 * These patterns match field names that may contain PII or security-sensitive data.
 */
const SENSITIVE_FIELD_PATTERNS = [
  // Authentication & Security
  /token/i,
  /jwt/i,
  /auth/i,
  /session/i,
  /apikey/i,
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /credential/i,

  // Personal Information
  /email/i,
  /e[_-]?mail/i,
  /phone/i,
  /address/i,
  /ssn/i,
  /social[_-]?security/i,

  // User Identifiable Data
  /userid/i,
  /user[_-]?id/i,
  /username/i, // Keep recipe author names, but redact user account usernames in full profiles
  /^user$/i, // Only match exact "user" key (like userData.user object)
  /profile/i, // User profile objects often contain PII
];

/**
 * Maximum length for string values before truncation.
 */
const MAX_STRING_LENGTH = 200;

/**
 * Maximum array length before truncation.
 */
const MAX_ARRAY_LENGTH = 10;

/**
 * Replacement text for redacted values.
 */
const REDACTED = "[REDACTED]";

/**
 * Check if a field name matches sensitive patterns.
 */
function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Redact sensitive string values (tokens, emails, etc.)
 * Preserves first/last few characters for debugging.
 */
function redactString(value: string, fieldName: string): string {
  // If field is sensitive, redact with preview
  if (isSensitiveField(fieldName)) {
    if (value.length <= 8) {
      return REDACTED;
    }
    // Show first 4 and last 4 characters for debugging
    const preview = `${value.slice(0, 4)}...${value.slice(-4)}`;
    return `${REDACTED} (${preview})`;
  }

  // Truncate long strings for readability
  if (value.length > MAX_STRING_LENGTH) {
    return `${value.slice(0, MAX_STRING_LENGTH)}... [truncated ${value.length - MAX_STRING_LENGTH} chars]`;
  }

  return value;
}

/**
 * Redact sensitive data from objects, arrays, and primitives.
 * Recursively processes nested structures.
 */
export function redactSensitiveData(
  data: any,
  fieldName: string = "root",
  depth: number = 0
): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return "[MAX_DEPTH_EXCEEDED]";
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data === "string") {
    return redactString(data, fieldName);
  }

  if (typeof data === "number" || typeof data === "boolean") {
    // Don't redact numbers/booleans unless the field is sensitive
    return isSensitiveField(fieldName) ? REDACTED : data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    const redactedArray = data
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item, index) =>
        redactSensitiveData(item, `${fieldName}[${index}]`, depth + 1)
      );

    if (data.length > MAX_ARRAY_LENGTH) {
      redactedArray.push(
        `... [${data.length - MAX_ARRAY_LENGTH} more items truncated]`
      );
    }

    return redactedArray;
  }

  // Handle objects
  if (typeof data === "object") {
    const redactedObj: any = {};

    for (const [key, value] of Object.entries(data)) {
      // Special case: preserve recipe author names (username in recipe context)
      // but redact full user profile objects
      if (
        key === "username" &&
        fieldName.includes("recipe") &&
        typeof value === "string"
      ) {
        // Keep recipe author names for attribution
        redactedObj[key] = value;
      } else if (key === "user" && typeof value === "object") {
        // Redact entire user profile objects
        redactedObj[key] = REDACTED;
      } else {
        // Recursively redact all other fields
        redactedObj[key] = redactSensitiveData(value, key, depth + 1);
      }
    }

    return redactedObj;
  }

  // Unknown type, redact for safety
  return REDACTED;
}

/**
 * Redact PII from log entries (plain text).
 * Handles common log patterns like "token=xyz", "email=user@example.com", etc.
 */
export function redactLogEntry(logEntry: string): string {
  let redacted = logEntry;

  // Redact common patterns in logs
  const logPatterns = [
    // token=xyz, jwt=xyz, apiKey=xyz
    {
      pattern:
        /(\b(?:token|jwt|apikey|api[_-]?key)\s*[=:]\s*)["']?([^"'\s,}]+)["']?/gi,
      replacement: "$1" + REDACTED,
    },
    // email=user@example.com
    {
      pattern: /(\b(?:email|e[_-]?mail)\s*[=:]\s*)["']?([^"'\s,}]+)["']?/gi,
      replacement: "$1" + REDACTED,
    },
    // password=xyz, secret=xyz
    {
      pattern:
        /(\b(?:password|secret|credential)\s*[=:]\s*)["']?([^"'\s,}]+)["']?/gi,
      replacement: "$1" + REDACTED,
    },
    // Email addresses anywhere in logs
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      replacement: REDACTED + "@example.com",
    },
  ];

  for (const { pattern, replacement } of logPatterns) {
    redacted = redacted.replace(pattern, replacement);
  }

  return redacted;
}

/**
 * Redact PII from multiple log entries.
 */
export function redactLogs(logs: string[]): string[] {
  return logs.map(redactLogEntry);
}

/**
 * Generate a warning banner for debug data.
 */
export function getDebugDataWarning(): string {
  return `
========================================
⚠️  DEBUG DATA - SENSITIVE INFO REDACTED
========================================
This debug data has been processed to remove:
- Authentication tokens and session IDs
- Email addresses and user credentials
- Personal user profile information
- API keys and secrets

Some data has been truncated for readability.
Recipe author names preserved for context.

DO NOT SHARE PUBLICLY - FOR DEBUGGING ONLY
========================================

`;
}
