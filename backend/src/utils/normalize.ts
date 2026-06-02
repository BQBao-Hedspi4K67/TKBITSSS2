const diacriticMap = /[\u0300-\u036f]/g;

export function stripAccents(input: string) {
  return input.normalize('NFD').replace(diacriticMap, '');
}

export function normalizeHeader(input: string) {
  return stripAccents(input)
    .toLowerCase()
    .replace(/[_\-\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeKey(input: string) {
  return normalizeHeader(input).replace(/\s+/g, '');
}

export function compactSpaces(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

export function parseInteger(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.trunc(input);
  }

  if (typeof input === 'string') {
    const cleaned = input.replace(/[^0-9-]/g, '');
    if (!cleaned) {
      return null;
    }

    const parsed = Number.parseInt(cleaned, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function parseTimePart(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 4) {
    const hours = Number.parseInt(digits.slice(0, 2), 10);
    const minutes = Number.parseInt(digits.slice(2), 10);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  return raw.includes(':') ? raw : raw;
}

export function parseCompactTimeRange(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/\s+/g, '').replace(/[–—]/g, '-');
  const match = normalized.match(/^(\d{3,4})-(\d{3,4})$/);
  if (!match) {
    return null;
  }

  const [start, end] = [match[1], match[2]].map((part) => {
    if (part.length === 3) {
      return `0${part[0]}:${part.slice(1)}`;
    }

    return `${part.slice(0, 2)}:${part.slice(2)}`;
  });

  return { start, end, raw };
}

export function timeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}
