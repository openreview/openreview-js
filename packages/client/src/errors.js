export default class OpenReviewError extends Error {
  constructor({ cause, message, name, status, details, options }) {
    super(message, { cause });
    this.name = name || 'Error';
    this.status = status || 400;

    if (details && Object.keys(details).length) {
      this.details = details;
    }

    if (cause) {
      this.message = !options?.skipCauseMessage ? `${message}: ${cause.message}` : message;
    }

    if (options?.hideStack) {
      this.stack = null;
    }
  }

  getFullStack() {
    if (this.cause?.getFullStack) {
      return `${this.stack}\ncaused by: ${this.cause.getFullStack()}`;
    }
    if (this.cause?.stack) {
      return `${this.stack}\ncaused by: ${this.cause.stack}`;
    }
    return this.stack;
  }

  toJson() {
    const stack = this.getFullStack();
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      ...(stack ? { stack } : {}),
      ...(this.details ? { details: this.details } : {})
    };
  }
}
