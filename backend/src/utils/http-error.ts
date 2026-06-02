export class HttpError extends Error {
  statusCode: number;
  details?: unknown;
  code?: string;

  constructor(statusCode: number, message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = options?.code;
    this.details = options?.details;
  }
}
