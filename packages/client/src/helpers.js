import OpenReviewError from './errors.js';

/**
 * Handles the response returned by the OpenReview API.
 *
 * @param {Promise} fetchPromise - Promise returned by the fetch function.
 * @param {object} onErrorData - Data to return in case of error.
 * @param {string} dataName - Name of the data to return.
 * @returns {Promise} Promise that resolves to the response data.
 * @async
 */
const handleResponse = throwErrors => async (fetchPromise, onErrorData, dataName) => {
  let response;
  let data;
  try {
    response = await fetchPromise;
    data = await response.json();
  } catch (error) {
    throw new OpenReviewError({
      name: error.name || 'Error',
      message: error.message,
      status: error.status || 500,
      cause: error
    });
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
