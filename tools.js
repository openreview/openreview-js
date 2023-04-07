'use strict';

class Tools {
  constructor(client) {
    this.client = client;
  }

  /**
   * Splits an array into chunks of a given size.
   *
   * @private
   * @param {Array} arr - Array to split.
   * @param {number} size - Size of the chunks.
   * @returns {Array} Array of chunks.
   */
  splitArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  /**
   * Returns V1 API URL from V2 API URL.
   * 
   * @param {string} url - V2 API URL.
   * @returns {string} V1 API URL.
   */
  convertUrlToV1(url) {
    if (url.startsWith('https://api2')) {
      return url.replace('https://api2', 'https://api');
    }

    if (url.startsWith('https://devapi2')) {
      return url.replace('https://devapi2', 'https://devapi');
    }

    if (url.startsWith('http://localhost:3001')) {
      return url.replace('http://localhost:3001', 'http://localhost:3000');
    }

    return url;
  }

  /**
   * Returns the venue for a submission based on its decision
   *
   * @param {string} venueId - venue's short name (i.e., ICLR 2022)
   * @param {string} decisionOption - paper decision (i.e., Accept, Reject)
   * @returns {string} - The venue name
   */
  decisionToVenue(venueId, decisionOption) {
    let venue = venueId;
    if (decisionOption.includes('Accept')) {
      let decision = decisionOption.replace('Accept', '');
      decision = decision.replace(/[(\W]+/g, '');
      if (decision) {
        venue += ' ' + decision.trim();
      }
    } else {
      venue = `Submitted to ${venue}`;
    }
    return venue;
  }

  /**
   * Accepts an OpenReview profile object and retrieves the user's preferred name or the first listed name.
   * 
   * @param {object} profile - The OpenReview profile object.
   * @param {boolean} [lastNameOnly=false] - A boolean indicating whether to return only the last name or the full name.
   * @returns {string} - The user's preferred name or the first listed name.
   */
  getPreferredName(profile, lastNameOnly=false) {
    const names = profile.content.names;
    const preferredNames = names.filter(name => name.preferred);
    const preferredName = preferredNames.length > 0 ? preferredNames[0] : names[0];
    let nameParts = [];
    if (preferredName.first) {
      nameParts.push(preferredName.first);
    }
    if (preferredName.middle) {
      nameParts.push(preferredName.middle);
    }
    if (preferredName.last) {
      nameParts.push(preferredName.last);
    }
    return lastNameOnly ? preferredName.last : nameParts.join(' ');
  }

  /**
   * Gets all the results for a given get function like getNotes, getGroups, etc.
   * This is a helper function that is used to get all the results for a given query.
   * It's already implemented in the client in functions like getAllNotes, getAllGroups, etc.
   * 
   * @async
   * @param {function} func - The function to call to get the results. It should be a function that returns a promise.
   * @param {object} params - The parameters to pass to the function.
   * @returns {Promise<object>} - The results of the function call.
   */
  async getAll(func, params) {
    params.offset = 0;

    if (params.limit && (params.limit <= this.client.RESPONSE_SIZE)) {
      return func(params);
    }

    // Get total number of results
    const res = await func({ ...params, limit: 1 });
    const count = res.count;
    let docType;
    for (let key in res) {
      if (key !== 'count') {
        docType = key;
        break;
      }
    }

    async function* gen() {
      let index = 0;
      let res = await func(params);
      while (index < count) {
        if (res[docType].length > 0) {
          yield res[docType].shift();
          index++;
        } else {
          params.offset += this.client.RESPONSE_SIZE;
          res = await func(params);
        }
      }
    }

    const g = gen.bind(this)();

    const result = {
      [docType]: [],
      count
    }
    while (true) {
      const { value } = await g.next();
      if (value) {
        result[docType].push(value);
      } else {
        break;
      }
    }
    return result;
  }

}

module.exports = Tools;
