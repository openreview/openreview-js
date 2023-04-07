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
   * Takes an Invitation or Group ID and returns a pretty version of it.
   * 
   * @param {string} id - Invitation or Group ID.
   * @param {boolean} onlyLast - If true, only the last part of the ID will be returned.
   * @returns {string} Pretty version of the ID.
   */
  prettyId(id, onlyLast) {
    if (!id) {
      return '';
    } else if (id.indexOf('~') === 0 && id.length > 1) {
      return id.substring(1).replace(/_|\d+/g, ' ').trim();
    } else if (id === 'everyone' || id === '(anonymous)' || id === '(guest)' || id === '~') {
      return id;
    }

    const lowercaseExceptions = [
      'conference',
      'workshop',
      'submission',
      'recommendation',
      'paper',
      'review',
      'reviewer',
      'reviewers',
      'official',
      'public',
      'meta',
      'comment',
      'question',
      'acceptance',
      'pcs',
      'affinity',
      'bid',
      'tpms',
    ];

    if (id.includes('${')) {
      const match = id.match('{.*}')[0];
      const newMatch = match.replace(/\//g, '.');
      // remove value when it appears at the end of the token
      id = id.replace(match, newMatch).replace('.value}', '}');
    }

    let tokens = id.split('/');
    if (onlyLast) {
      const sliceIndex = tokens.findIndex(token => {
        return token.match(/^[pP]aper\d+$/);
      });
      tokens = tokens.slice(sliceIndex);
    }

    const transformedId = tokens.map(token => {
      // API v2 tokens can include strings like ${note.number}
      if (token.includes('${')) {
        token = token.replace(/\$\{(\S+)\}/g, (match, p1) => {
            return ' {' + p1.split('.').pop() + '}';
          })
          .replace(/_/g, ' ');
        return token;
      }

      token = token
        .replace(/^\./g, '') // journal names start with '.'
        .replace(/\..+/g, '') // remove text after dots, ex: uai.org
        .replace(/^-$/g, '') // remove dashes
        .replace(/_/g, ' '); // replace undescores with spaces

      // if the letters in the token are all lowercase, replace it with empty string
      const lettersOnly = token.replace(/\d|\W/g, '')
      if (lettersOnly && lettersOnly === lettersOnly.toLowerCase() && lowercaseExceptions.indexOf(token) < 0) {
        token = ''
      }

      return token;
    })
    .filter(formattedToken => {
      // filter out any empty tokens
      return formattedToken;
    })
    .join(' ');

    return transformedId || id;
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

  /**
   * Gets profiles by ID or email. If withPublications is true, it also gets the publications for each profile.
   * If asDict is true, it returns a dictionary with the profiles indexed by ID or email.
   *
   * @async
   * @param {string[]} idsOrEmails - An array of profile IDs or emails.
   * @param {boolean} [withPublications=false] - A boolean indicating whether to get the publications for each profile.
   * @param {boolean} [asDict=false] - A boolean indicating whether to return a dictionary with the profiles indexed by ID or email.
   * @returns {Promise<object>} - A dictionary with the profiles indexed by ID or email.
   * @returns {Promise<object[]>} - An array of profiles.
   */
  async getProfiles(idsOrEmails, withPublications = false, asDict = false) {
    const ids = [];
    const emails = [];

    for (const member of idsOrEmails) {
      if (member.startsWith('~')) {
        ids.push(member);
      } else {
        emails.push(member);
      }
    }

    const profileById = {};
    const profileByIdOrEmail = {};

    const processProfile = (profile) => {
      profileById[profile.id] = profile;

      for (const name of profile.content.names ?? []) {
        if (name.username) {
          profileByIdOrEmail[name.username] = profile;
        }
      }

      for (const confirmedEmail of profile.content.emailsConfirmed ?? []) {
        profileByIdOrEmail[confirmedEmail] = profile;
      }
    };

    // Get profiles by ID and add them to the profiles list
    for (const batch of this.splitArray(ids, this.client.RESPONSE_SIZE)) {
      const { profiles } = await this.client.searchProfiles({ ids: batch });
      for (const profile of profiles) {
        processProfile(profile);
      }
    }

    // Get profiles by email and add them to the profiles list
    for (const batch of this.splitArray(emails, this.client.RESPONSE_SIZE)) {
      const { profiles } = await this.client.searchProfiles({ confirmedEmails: batch });
      for (const profile of profiles) {
        processProfile(profile);
      }
    }

    for (const email of emails) {
      if (!profileByIdOrEmail[email]) {
        const profile = {
          id: email,
          content: {
            emails: [email],
            preferredEmail: email,
            emailsConfirmed: [email],
            names: [],
          },
        };
        profileById[profile.id] = profile;
        profileByIdOrEmail[email] = profile;
      }
    }

    if (withPublications) {
      // Get publications for all the profiles
      const profiles = Object.values(profileById);

      for (const batch of this.splitArray(profiles, 10)) {
        await Promise.all(batch.map(async (profile) => {
          const [ { notes: notesV1 }, { notes: notesV2 } ] = await Promise.all([
            this.client.getAllV1Notes({ content: { authorids: profile.id } }),
            this.client.getAllNotes({ content: { authorids: profile.id } })
          ]);
          profileById[profile.id].content.publications = [ ...notesV1, ...notesV2 ];
        }));
      }
    }

    if (asDict) {
      const profilesAsDict = {}
      for (const id of ids) {
        profilesAsDict[id] = profileByIdOrEmail[id]
      }

      for (const email of emails) {
        profilesAsDict[email] = profileByIdOrEmail[email]
      }

      return profilesAsDict
    }

    return Object.values(profileById);
  }

}

module.exports = Tools;
