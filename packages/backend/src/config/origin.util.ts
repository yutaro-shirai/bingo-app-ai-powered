const DEFAULT_ORIGINS = ['http://localhost:3000'];

export function getAllowedOrigins(): string[] {
  const { ALLOWED_ORIGINS } = process.env;

  if (!ALLOWED_ORIGINS) {
    return DEFAULT_ORIGINS;
  }

  const parsed = ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ORIGINS;
}
