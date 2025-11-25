const MAX_NAME_LENGTH = 32;
const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/g;
const PROHIBITED_CHARACTER_REGEX = /[<>]/;

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

export function sanitizeDisplayName(raw: string): string {
  if (typeof raw !== 'string') {
    return '';
  }

  return normalizeWhitespace(raw.replace(CONTROL_CHAR_REGEX, ' '));
}

function assertSafeName(raw: string, type: 'Player' | 'Room'): string {
  const sanitized = sanitizeDisplayName(raw);

  if (!sanitized) {
    throw new Error(`${type} name is required`);
  }

  if (sanitized.length > MAX_NAME_LENGTH) {
    throw new Error(`${type} name is too long`);
  }

  if (PROHIBITED_CHARACTER_REGEX.test(sanitized)) {
    throw new Error(`${type} name contains invalid characters`);
  }

  return sanitized;
}

export function ensureSafePlayerName(raw: string): string {
  return assertSafeName(raw, 'Player');
}

export function ensureSafeRoomName(raw: string): string {
  return assertSafeName(raw, 'Room');
}

export function normalizeRoomId(raw: string): string {
  if (typeof raw !== 'string') {
    return '';
  }

  return raw.trim().toUpperCase();
}
