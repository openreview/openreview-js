class OpenReviewError extends Error {
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

class MultiOpenReviewError extends OpenReviewError {
  constructor({ errors, cause, name, message, status, details, options }) {
    super({ cause, message, name: name ?? 'MultiError', status, details, options });
    this.errorsLimit = 10;
    this.errors = [];
    if (errors) {
      this.addErrors(errors);
    }

    this.generalMessage = message;
    this.message = 'No errors';

    this.updateErrorMessage();
  }

  toJson() {
    const stack = this.getFullStack();
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      errors: this.errors,
      stack,
      ...(this.details ? { details: this.details } : {})
    };
  }

  updateErrorMessage() {
    if (this.generalMessage) {
      this.message = `First of ${this.errors.length}: ${this.generalMessage}`;
    } else if (this.errors.length) {
      const firstError = this.errors[0];
      this.message = `First of ${this.errors.length}: ${firstError.message}`;
    }
  }

  parseErrors(errors) {
    const parsedErrors = [];
    for (const error of errors) {
      if (error instanceof OpenReviewError) {
        parsedErrors.push(error.toJson());
      } else {
        parsedErrors.push(new OpenReviewError({
          name: error.name || 'Error',
          message: error.message,
          status: error.status || 500,
          details: error.details,
          options: {
            hideStack: true
          }
        }).toJson());
      }
    }
    return parsedErrors;
  }

  addErrors(errors) {
    if (this.errors >= this.errorsLimit) return;
    if (this.errors.length + errors.length > this.errorsLimit) {
      const allowedNewErrors = this.errorsLimit - this.errors.length;
      errors = errors.slice(0, allowedNewErrors);
    }
    this.errors = this.errors.concat(this.parseErrors(errors));
    this.updateErrorMessage();
  }
}

module.exports = {
  OpenReviewError,
  MultiOpenReviewError
};
