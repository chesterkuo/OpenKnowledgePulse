export class KPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "KPError";
  }
}

export class ValidationError extends KPError {
  constructor(
    message: string,
    public readonly issues: Array<{ path: string; message: string }> = [],
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class SanitizationError extends KPError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, "SANITIZATION_ERROR");
    this.name = "SanitizationError";
  }
}

export class AuthenticationError extends KPError {
  constructor(message = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends KPError {
  constructor(public readonly retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`, "RATE_LIMIT_ERROR");
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends KPError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}
