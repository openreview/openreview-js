import OpenReviewError from './errors.js';

/**
 * Handles the response returned by the OpenReview API with automatic retry on rate limiting (429).
 *
 * @param {boolean} throwErrors - Whether to throw errors or return them in the response.
 * @param {object} retryOptions - Options for retry behavior on rate limiting.
 * @param {number} [retryOptions.maxRetries=3] - Maximum number of retry attempts after a 429.
 * @param {number} [retryOptions.defaultRetryAfterMs=1000] - Fallback wait time if Retry-After header is missing.
 * @param {number} [retryOptions.maxRetryAfterMs=60000] - Cap on how long to wait per retry.
 * @returns {Function} Async function that accepts (fetchFn, onErrorData, dataName).
 */
const handleResponse = (throwErrors, retryOptions = {}) => async (fetchFn, onErrorData, dataName) => {
  const {
    maxRetries = 3,
    defaultRetryAfterMs = 1000,
    maxRetryAfterMs = 60000,
  } = retryOptions;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response;
    let data;
    try {
      response = await fetchFn();
      data = await response.json();
    } catch (error) {
      throw new OpenReviewError({
        name: error.name || 'Error',
        message: error.message,
        status: error.status || 500,
        cause: error
      });
    }

    if (response.status === 429 && attempt < maxRetries) {
      const retryAfterHeader = response.headers.get('Retry-After');
      let waitMs = defaultRetryAfterMs;
      if (retryAfterHeader) {
        const parsed = Number(retryAfterHeader);
        if (!Number.isNaN(parsed) && parsed > 0) {
          waitMs = parsed * 1000;
        }
      }
      waitMs = Math.min(waitMs, maxRetryAfterMs);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    if (throwErrors) {
      if (response.status !== 200) {
        if (data.errors) {
          throw new AggregateError(data.errors.map(error => new OpenReviewError(error)), data.errors?.[0]?.message ?? 'Error');
        } else {
          throw new OpenReviewError(data);
        }
      } else if (dataName) {
        return { [dataName]: data };
      } else {
        return data;
      }
    } else {
      if (response.status !== 200) {
        return { ...onErrorData, error: data };
      } else if (dataName) {
        return { [dataName]: data, error: null };
      } else {
        return { ...data, error: null };
      }
    }
  }
};

/**
 * Checks if a value is null or undefined.
 *
 * @param {any} value - Value to check.
 * @returns {boolean} True if the value is null or undefined, false otherwise.
 */
const isNil = value => {
  return value === null || value === undefined;
};

/**
 * Removes null and undefined values from an object.
 *
 * @param {object} params - Object to sanitize.
 * @returns {object} Sanitized object.
 */
const removeNilValues = params => {
  const sanitizedParams = {};
  for (const [ key, value ] of Object.entries(params)) {
    if (!isNil(value)) {
      sanitizedParams[key] = value;
    }
  }
  return sanitizedParams;
};

/**
 * Generates a query string from an object.
 *
 * @private
 * @param {object} params - Object to convert to a query string.
 * @returns {string} Query string.
 */
const generateQueryString = (params = {}) => {
  const sanitizedParams = removeNilValues(params);
  return new URLSearchParams(sanitizedParams).toString();
};

export {
  handleResponse,
  removeNilValues,
  generateQueryString
};
