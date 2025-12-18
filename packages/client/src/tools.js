'use strict';

import { join, dirname } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';
import { generateQueryString } from './helpers.js';
import OpenReviewError from './errors.js';

export default class Tools {
  constructor(client) {
    this.client = client;
    this.commonDomains = [
      'gmail.com',
      'qq.com',
      '126.com',
      '163.com',
      'outlook.com',
      'hotmail.com',
      'yahoo.com',
      'foxmail.com',
      'aol.com',
      'msn.com',
      'ymail.com',
      'googlemail.com',
      'live.com'
    ];
    this.subdomainsCache = {};
    this.tlds = null;
  }

  /**
   * Returns the type of a variable
   *
   * @static
   * @param {any} variable - The variable to get the type of
   * @returns {string} The type of the variable
   */
  static variableType(variable) {
    if (variable === null) return 'null';
    if (Array.isArray(variable)) {
      return 'array';
    }
    return typeof variable;
  }

  /**
   * Loads the TLDs from a file
   * 
   * @private
   * @returns {boolean} True if successful, false otherwise
   */
  async #loadTLDsFromFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = join(__dirname, '../data/tlds.dat');
    const file = (await fs.readFile(filePath)).toString();
    this.tlds = new Set(file.split('\n').filter((line) => !line.startsWith('//') && line !== ''));
    return true;
  }

  /**
   * Loads the TLDs from a URL
   * 
   * @private
   * @returns {boolean} True if successful, false otherwise
   */
  async #loadTLDsFromURL() {
    try {
      const response = await fetch('https://publicsuffix.org/list/public_suffix_list.dat');
      if (response.ok) {
        this.tlds = new Set((await response.text()).split('\n').filter((line) => !line.startsWith('//') && line !== ''));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if domain is a TLD
   *
   * @private
   * @param {string} domain - domain to check
   * @returns {boolean} true if domain is a TLD, false otherwise
   */
  #isTLD(domain) {
    return this.tlds.has(domain);
  }

  /**
   * Given an email address, returns a list with the domains and subdomains.
   *
   * @private
   * @async
   * @param {string} domain - e-mail address or domain of the e-mail address
   *
   * @return {string[]} List of domains and subdomains
   *
   * @example
   *
   * #getSubdomains('iesl.cs.umass.edu')
   *    returns ['iesl.cs.umass.edu', 'cs.umass.edu', 'umass.edu']
   */
  #getSubdomains(domain) {
    if (this.subdomainsCache[domain]) {
      return this.subdomainsCache[domain];
    }
    // Separate domains like cs.umass.edu to ['cs', 'umass', 'edu']
    const domainComponents = domain.split('.').filter((domainPart) => domainPart && !domainPart.includes(' '));
    // Create all possible subdomains from the domain components.
    // For example, ['cs', 'umass', 'edu'] -> ['cs.umass.edu', 'umass.edu', 'edu']
    const domains = domainComponents.map((_, index) => domainComponents.slice(index).join('.'));
    const validDomains = new Set();
    for (const domain of domains) {
      if (!this.#isTLD(domain)) {
        validDomains.add(this.duplicateDomains[domain] || domain);
      }
    }
    const subdomains = Array.from(validDomains);
    this.subdomainsCache[domain] = subdomains;
    return subdomains;
  }

  #infoFunctionBuilder(policyFunction) {
    return (profile, nYears) => {
      const result = policyFunction(profile, nYears);
      const domains = new Set();
      for (const domain of result.domains) {
        const subdomains = this.#getSubdomains(domain);
        for (const subdomain of subdomains) {
          domains.add(subdomain);
        }
      }

      // Filter common domains
      for (const commonDomain of this.commonDomains) {
        domains.delete(commonDomain);
      }

      result.domains = Array.from(domains);
      return result;
    };
  }

  /**
   * Splits an array into chunks of a given size.
   *
   * @static
   * @param {Array} arr - Array to split.
   * @param {number} size - Size of the chunks.
   * @returns {Array} Array of chunks.
   */
  static splitArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

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
   * @static
   * @param {string} id - Invitation or Group ID.
   * @param {boolean} onlyLast - If true, only the last part of the ID will be returned.
   * @returns {string} Pretty version of the ID.
   */
  static prettyId(id, onlyLast) {
    if (!id) {
      return '';
    } else if (id.indexOf('~') === 0 && id.length > 1) {
      return id.substring(1).replace(/_|\d+/g, ' ').trim();
    } else if (id === 'everyone' || id === '(anonymous)' || id === '(guest)' || id === '~') {
      return id;
    }

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
      const lettersOnly = token.replace(/\d|\W/g, '');
      if (lettersOnly && lettersOnly === lettersOnly.toLowerCase()) {
        token = '';
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
   * @static
   * @param {object} profile - The OpenReview profile object.
   * @param {boolean} [lastNameOnly=false] - A boolean indicating whether to return only the last name or the full name.
   * @returns {string} - The user's preferred name or the first listed name.
   */
  static getPreferredName(profile) {
    const names = profile.content.names;
    const preferredNames = names.filter(name => name.preferred);
    const preferredName = preferredNames.length > 0 ? preferredNames[0] : names[0];
    return preferredName.fullname;
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
    delete params.offset;

    if (params.limit && (params.limit <= this.client.RESPONSE_SIZE)) {
      return func(params);
    }

    if (!params.sort) {
      params.sort = 'id:asc';
    }
    params.limit = this.client.RESPONSE_SIZE;

    // Get docType from the first call
    const firstRes = await func({ ...params, limit: 1 });
    let docType;
    for (let key in firstRes) {
      if (key !== 'count') {
        docType = key;
        break;
      }
    }

    const result = {
      [docType]: [],
      count: 0
    };

    // Enhancement: If params.details is undefined, use stream=true to get all docs at once
    if (params.details === undefined) {
      delete params.limit;
      const streamRes = await func({ ...params, stream: true });
      const docs = streamRes[docType] || [];
      result[docType] = docs;
      result.count = docs.length;
      return result;
    }

    let after = undefined;
    while (true) {
      const res = await func({ ...params, after });
      const docs = res[docType] || [];
      if (docs.length === 0) break;
      result[docType].push(...docs);
      after = docs[docs.length - 1]?.id;
      if (!after) break;
    }

    result.count = result[docType].length;
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
    for (const batch of Tools.splitArray(ids, this.client.RESPONSE_SIZE)) {
      const { profiles } = await this.client.searchProfiles({ ids: batch });
      for (const profile of profiles) {
        processProfile(profile);
      }
    }

    // Get profiles by email and add them to the profiles list
    for (const batch of Tools.splitArray(emails, this.client.RESPONSE_SIZE)) {
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

      for (const batch of Tools.splitArray(profiles, 10)) {
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
      const profilesAsDict = {};
      for (const id of ids) {
        profilesAsDict[id] = profileByIdOrEmail[id];
      }

      for (const email of emails) {
        profilesAsDict[email] = profileByIdOrEmail[email];
      }

      return profilesAsDict;
    }

    return Object.values(profileById);
  }

  /**
   * Gets the conflicts of a profile with a list of author profiles.
   *
   * @async
   * @param {object[]} authorProfiles - An array of author profiles.
   * @param {object} userProfile - The profile of the user.
   * @param {string|function} [policy='default'] - The conflict policy. It can be a string with the name of the policy or a function.
   * @param {number} [nYears] - The number of years to consider for the conflict policy.
   * @returns {Promise<array>} - An array with the conflicts.
   */
  async getConflicts(authorProfiles, userProfile, policy, nYears) {
    policy ??= 'default';

    // Get duplicates only once
    if (!this.duplicateDomains) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const filePath = join(__dirname, '../data/duplicate-domains.json');
      this.duplicateDomains = JSON.parse(await fs.readFile(filePath));
    }

    // Get common domains only once
    if (!this.tlds) {
      await this.#loadTLDsFromURL() || await this.#loadTLDsFromFile();
    }

    let infoFunction;
    if (typeof policy === 'function') {
      infoFunction = this.#infoFunctionBuilder(policy);
    } else if (policy === 'NeurIPS') {
      infoFunction = this.#infoFunctionBuilder(this.getNeuripsProfileInfo);
    } else if (policy === 'Comprehensive') {
      infoFunction = this.#infoFunctionBuilder(this.getComprehensiveProfileInfo);
    } else {
      infoFunction = this.#infoFunctionBuilder(this.getProfileInfo);
    }

    const authorIds = new Set();
    const authorDomains = new Set();
    const authorEmails = new Set();
    const authorRelations = new Set();
    const authorPublications = new Set();
    const concurrency = 10;

    const authorsInfo = [];
    let tempAuthorsInfo = [];
    for (const profile of authorProfiles) {
      tempAuthorsInfo.push(infoFunction(profile, nYears));
      if (tempAuthorsInfo.length === concurrency) {
        authorsInfo.push(...await Promise.all(tempAuthorsInfo));
        tempAuthorsInfo = [];
      }
    }
    if (tempAuthorsInfo.length > 0) {
      authorsInfo.push(...await Promise.all(tempAuthorsInfo));
    }

    for (const authorInfo of authorsInfo) {
      authorIds.add(authorInfo.id);
      for (const authorDomain of authorInfo.domains) {
        authorDomains.add(authorDomain);
      }
      for (const authorEmail of authorInfo.emails) {
        authorEmails.add(authorEmail);
      }
      for (const authorRelation of authorInfo.relations) {
        authorRelations.add(authorRelation);
      }
      for (const authorPublication of authorInfo.publications) {
        authorPublications.add(authorPublication);
      }
    }

    const userInfo = await infoFunction(userProfile, nYears);

    const conflicts = new Set();

    if (authorIds.has(userInfo.id)) {
      conflicts.add(userInfo.id);
    }
    
    for (const domain of userInfo.domains) {
      if (authorDomains.has(domain)) {
        conflicts.add(domain);
      }
    }

    for (const email of userInfo.emails) {
      if (authorEmails.has(email)) {
        conflicts.add(email);
      }
    }    

    for (const relation of userInfo.relations) {
      if (authorIds.has(relation)) {
        conflicts.add(relation);
      }
    }

    if (authorRelations.has(userInfo.id)) {
      conflicts.add(userInfo.id);
    }

    for (const publication of userInfo.publications) {
      if (authorPublications.has(publication)) {
        conflicts.add(publication);
      }
    }

    return Array.from(conflicts);
  }

  /**
   * Find publications after the cut off year.
   *
   * @static
   * @param {object[]} publications - List of publication notes
   * @param {number} cutOffYear - The year to consider for the profile.
   * @returns {Set<string>} A set of publication note IDs.
   */
  static filterPublicationsByYear(publications, cutOffYear) {
    function extractYear(publicationId, timestamp) {
      try {
        if (!timestamp) return null;
        const date = new Date(timestamp);
        const year = date.getFullYear();
        return Number.isNaN(year) ? null : year;
      } catch (e) {
        console.error('Error extracting the date for publication:', publicationId);
        return null;
      }
    }

    const filteredPublications = new Set();
    const currentYear = new Date().getFullYear();
    for (const publication of publications || []) {
      let year = null;

      // 1. Check pdate first
      if (publication.pdate) {
        year = extractYear(publication.id, publication.pdate);
      }

      // 2. Check content.year
      if (!year && publication.content?.year !== undefined) {
        let unformattedYear;

        const yearField = publication.content.year;
        if (typeof yearField === 'object' && yearField?.value !== undefined) {
          unformattedYear = yearField.value; // API 2
        } else if (typeof yearField === 'string' || typeof yearField === 'number') {
          unformattedYear = yearField; // API 1
        }

        const convertedYear = parseInt(unformattedYear, 10);
        if (!Number.isNaN(convertedYear) && convertedYear <= currentYear) {
          year = convertedYear;
        }
      }

      // 3. Fallback to cdate / tcdate
      if (!year) {
        year = extractYear(publication.id, publication.cdate ?? publication.tcdate);
      }

      if (year && year > cutOffYear) {
        filteredPublications.add(publication.id);
      }
    }

    return filteredPublications;
  }

  /**
   * Get the profile information for a given profile that includes the domains, emails, relations and publications.
   *
   * @param {object} profile - The profile object.
   * @param {number} nYears - The number of years to consider for the profile.
   * @returns {object} The profile information.
   * @throws {Error} If the profile has obfuscated emails.
   */
  getProfileInfo(profile, nYears) {
    let domains = new Set();
    let emails = new Set();
    let publications = new Set();

    // Emails section
    for (const email of (profile.content?.emails || [])) {
      const domain = email.split('@')[1];
      domains.add(domain);
    }

    let cutOffYear = -1;
    if (nYears) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - nYears);
      cutOffYear = cutoffDate.getFullYear();
    }

    // Institution section
    for (const history of (profile.content?.history || [])) {
      const end = parseInt(history.end || 0, 10);
      const domain = history?.institution?.domain || '';
      if ((!end || end > cutOffYear) && domain) {
        domains.add(domain);
      }
    }

    // Relations section
    const relations = new Set();
    for (const relObj of profile.content?.relations || []) {
      const relationEnd = parseInt(relObj.end || 0, 10);
      if (!relationEnd || relationEnd > cutOffYear) {
        const relationUsername = relObj.username || relObj.email;
        relations.add(relationUsername);
      }
    }

    // Publications section: get publications within last n years, default is all publications from previous years
    publications = Tools.filterPublicationsByYear(profile.content?.publications || [], cutOffYear)

    return {
      id: profile.id,
      domains,
      emails,
      relations,
      publications
    };
  }

  /**
   * Get the profile information for a given profile using NeurIPS restrictions that includes the domains, emails, relations and publications.
   *
   * @param {object} profile - The profile object.
   * @param {number} nYears - The number of years to consider for the profile.
   * @returns {object} The profile information.
   * @throws {Error} If the profile has obfuscated emails.
   */
  getNeuripsProfileInfo(profile, nYears) {
    const domains = new Set();
    const emails = new Set();
    const relations = new Set();
    let publications = new Set();

    let cutOffYear = -1;
    if (nYears) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - nYears);
      cutOffYear = cutoffDate.getFullYear();
    }

    // Institution section, get history within the last n years, excluding internships
    for (const history of (profile.content?.history || [])) {
      const position = history.position;
      if (!position || (typeof position === 'string' && !position.toLowerCase().includes('intern'))) {
        const end = parseInt(history.end || 0, 10);
        if (!end || end > cutOffYear) {
          const domain = history.institution?.domain || '';
          domains.add(domain);
        }
      }
    }

    // Relations section, get coauthor/coworker relations within the last n years + all the other relations
    for (const relObj of profile.content?.relations || []) {
      const relation = (relObj.relation || '').toLowerCase();
      const relationEnd = parseInt(relObj.end || 0, 10);
      const relationUsername = relObj.username || relObj.email;
      if (relation === 'coauthor' || relation === 'coworker') {
        if (!relationEnd || relationEnd > cutOffYear) {
          relations.add(relationUsername);
        }
      } else {
        relations.add(relationUsername);
      }
    }

    // Emails section
    // if institution section is empty, add email domains
    if (domains.size === 0) {
      for (const email of (profile.content?.emails || [])) {
        const domain = email.split('@')[1];
        domains.add(domain);
      }
    }

    // Publications section: get publications within last n years
    publications = Tools.filterPublicationsByYear(profile.content?.publications || [], cutOffYear)

    return {
      id: profile.id,
      domains,
      emails,
      relations,
      publications
    };
  }

  /**
   * Get the profile information for a given profile including the domains, emails, relations and publications.
   *
   * @param {object} profile - The profile object.
   * @param {number} nYears - The number of years to consider for the profile.
   * @returns {object} The profile information.
   * @throws {Error} If the profile has obfuscated emails.
   */
  getComprehensiveProfileInfo(profile, nYears) {
    const domains = new Set();
    const emails = new Set();
    const relations = new Set();
    let publications = new Set();

    let cutOffYear = -1;
    if (nYears) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - nYears);
      cutOffYear = cutoffDate.getFullYear();
    }

    // Institution section, get history within the last n years
    for (const history of (profile.content?.history || [])) {
      const position = history.position;
      if (!position || (typeof position === 'string')) {
        const end = parseInt(history.end || 0, 10);
        if (!end || end > cutOffYear) {
          const domain = history.institution?.domain || '';
          domains.add(domain);
        }
      }
    }

    // Relations section, get coauthor/coworker relations within the last n years + all the other relations
    for (const relObj of profile.content?.relations || []) {
      const relation = (relObj.relation || '').toLowerCase();
      const relationEnd = parseInt(relObj.end || 0, 10);
      const relationUsername = relObj.username || relObj.email;
      if (relation === 'coauthor' || relation === 'coworker') {
        if (!relationEnd || relationEnd > cutOffYear) {
          relations.add(relationUsername);
        }
      } else {
        relations.add(relationUsername);
      }
    }

    // Emails section
    // if institution section is empty, add email domains
    if (domains.size === 0) {
      for (const email of (profile.content?.emails || [])) {
        const domain = email.split('@')[1];
        domains.add(domain);
      }
    }

    // Publications section: get publications within last n years
    publications = Tools.filterPublicationsByYear(profile.content?.publications || [], cutOffYear)

    return {
      id: profile.id,
      domains,
      emails,
      relations,
      publications
    };
  }

  /**
   * Converts a dblp xml to a note object.
   *
   * @static
   * @param {string} dblpXml - The dblp xml.
   * @returns {object} The note object.
   *
   */
  static convertDblpXmlToNote(dblpXml) {
    const removeDigitsRegEx = /\s\d{4}$/;
    const removeTrailingPeriod = /\.$/;

    const xmlParser = new XMLParser({ ignoreAttributes: false });

    const entryTypes = [
      'article',
      'book',
      'booklet',
      'conference',
      'inbook',
      'incollection',
      'inproceedings',
      'manual',
      'mastersthesis',
      'misc',
      'phdthesis',
      'proceedings',
      'techreport',
      'unpublished'
    ];

    const getRawDataValue = rawData => {
      const rawDataType = this.variableType(rawData);
      if (rawDataType === 'object') {
        return rawData['#text'];
      } else {
        return rawData;
      }
    };

    const getAuthorData = authorData => {
      const author = getRawDataValue(authorData);
      return {
        author: author.replace(removeDigitsRegEx, '').replaceAll('(', '').replaceAll(')', ''),
        authorid: `https://dblp.org/search/pid/api?q=author:${author.split(' ').join('_')}:`
      };
    };

    const entryToData = entryElement => {
      const data = {};
      data.type = entryTypes.find(type => entryElement[type]) || 'misc';
      const rawData = entryElement[data.type];
      data.key = rawData['@_key'];
      data.publtype = rawData['@_publtype'];
      data.authors = [];
      data.authorids = [];
      // TODO: Check if we want to include rawData.editor too or keep empty authors
      if (Array.isArray(rawData.author)) {
        for (const authorData of rawData.author) {
          const { author, authorid } = getAuthorData(authorData);
          data.authors.push(author);
          data.authorids.push(authorid);
        }
      } else if (this.variableType(rawData.author) === 'string' || this.variableType(rawData.author) === 'object') {
        const { author, authorid } = getAuthorData(rawData.author);
        data.authors.push(author);
        data.authorids.push(authorid);
      }

      // TODO: What do we do with titles like: Learning Perceptually-Grounded Semantics in The L<sub>0</sub> Project?
      // Multiple Kernel <i>k</i>-Means Clustering with Matrix-Induced Regularization.
      data.title = getRawDataValue(rawData.title)?.trim()?.replace('\n', '')?.replace(removeTrailingPeriod, '');
      data.year = parseInt(getRawDataValue(rawData.year), 10);
      data.month = getRawDataValue(rawData.month);

      if (data.year) {
        const cdateString = data.month ? `${data.month} ${data.year}` : data.year;
        data.cdate = Date.parse(cdateString);
      }

      data.journal = getRawDataValue(rawData.journal);
      data.volume = getRawDataValue(rawData.volume);
      data.number = getRawDataValue(rawData.number);
      data.chapter = getRawDataValue(rawData.chapter);
      data.pages = getRawDataValue(rawData.pages);
      data.url = Array.isArray(rawData.ee) ? getRawDataValue(rawData.ee[0]) : getRawDataValue(rawData.ee);
      data.isbn = Array.isArray(rawData.isbn) ? getRawDataValue(rawData.isbn[0]) : getRawDataValue(rawData.isbn); // TODO: Check if we want to concatenate this with ands
      data.booktitle = getRawDataValue(rawData.booktitle);
      data.crossref = getRawDataValue(rawData.crossref);
      data.publisher = getRawDataValue(rawData.publisher);
      data.school = getRawDataValue(rawData.school);

      for (const key of Object.keys(data)) {
        if (data[key] === undefined || data[key] === null) {
          delete data[key];
        }
      }
      return data;
    };

    const dataToBibtex = data => {
      const bibtexIndent = '  ';
      const bibtexComponents = [ '@', data.type, '{', 'DBLP:', data.key, ',\n' ];

      const omittedFields = ['type', 'key', 'authorids'];

      for (let [ field, value ] of Object.entries(data)) {
        if (!value || omittedFields.includes(field)) {
          continue;
        }

        let valueString;
        if (Array.isArray(value)) {
          valueString = value.join(' and ');
          if (field.endsWith('s')) {
            field = field.substring(0, field.length - 1);
          }
        } else {
          valueString = String(value);
        }

        bibtexComponents.push(...[ bibtexIndent, field, '={', valueString, '},\n' ]);
      }

      bibtexComponents[bibtexComponents.length - 1] = bibtexComponents[bibtexComponents.length - 1].replace(',\n', '\n');
      bibtexComponents.push('}\n');
      return bibtexComponents.join('');
    };

    let dblpJson;
    try {
      dblpJson = xmlParser.parse(dblpXml);
    } catch (err) {
      throw new Error('Something went wrong parsing the dblp xml', { cause: err });
    }

    if (Object.keys(dblpJson).length === 0) {
      throw new Error('Something went wrong parsing the dblp xml');
    }

    const data = entryToData(dblpJson);

    const note = {
      externalId: `dblp:${data.key}`,
      cdate: data.cdate,
      pdate: new Date(Date.UTC(data.year, 11, 31,0,0,0,0)).getTime(),
      content: {
        title: { value: data.title },
        _bibtex: { value: dataToBibtex(data) },
        authors: { value: data.authors },
        authorids: { value: data.authorids }
      }
    };

    const venue = data.journal || data.booktitle;
    if (venue) {
      note.content.venue = { value: venue };
    }

    if (data.key) {
      const keyParts = data.key.split('/');
      const venueidParts = [ 'dblp.org' ];
      // get all but the last part of the key\n
      for (let i = 0; i < keyParts.length - 1; i++) {
        let keyPart = keyParts[i];
        if (i === keyParts.length - 2) {
          keyPart = keyPart.toUpperCase();
        }
        venueidParts.push(keyPart);
      }

      // we might not want this later
      if (data.year) {
        venueidParts.push(data.year);
        // new addition at Andrew's request
        if (venue) {
          note.content.venue.value += ` ${data.year}`;
        }
      }
      note.content.venueid = { value: venueidParts.join('/') };
    }

    if (data.url) {
      if (data.url.endsWith('.pdf')) {
        note.content.pdf = { value: data.url };
      } else {
        note.content.html = { value: data.url };
      }
    }

    return note;
  }

  /**
    * Converts raw orcid json to a note object.
    *
    * @static
    * @param {object} workNode - The raw orcid object.
    * @returns {object} The note object.
    *
  */
  static convertORCIDJsonToNote(workNode) {
    const title = workNode.title?.title?.value
    const cdate = workNode['created-date']?.value
    const rawYear = workNode['publication-date']?.year?.value
    const rawMonth = workNode['publication-date']?.month?.value
    const rawDay = workNode['publication-date']?.day?.value
    const externalId = `doi:${workNode['external-ids']?.['external-id']?.find((p) => p['external-id-type'] === 'doi')?.['external-id-value'].toLowerCase()}`
    const authorNames = workNode.contributors?.contributor.map((p) => p['credit-name']?.value.replaceAll(',', '').trim())
    const abstract = workNode['short-description']
    const citationNode = workNode['citation']
    const bibtex = citationNode?.['citation-type'] === 'bibtex' ? citationNode['citation-value'] : undefined
    const source = workNode.source?.['source-name']?.value
    const venue = workNode['journal-title']?.value ?? source
    const html = workNode.url?.value
    const pdf = workNode['external-ids']?.['external-id']?.find((p) => p['external-id-type'] === 'uri')?.['external-id-value']
    const authorIds = workNode.contributors?.contributor.map((p) => {
      let authorId = null
      if (p['contributor-orcid']) {
        authorId = p['contributor-orcid'].uri
      }
      if (!authorId) {
        return `https://orcid.org/orcid-search/search?searchQuery=${p['credit-name']?.value.replaceAll(',', '').trim()}`
      }
      return authorId
    })

    const year = rawYear ? parseInt(rawYear, 10) : null
    const month = rawMonth ? (parseInt(rawMonth, 10) - 1) : 0
    const day = rawDay ? parseInt(rawDay, 10) : 1

    const note = {
      externalId,
      cdate,
      pdate: new Date(year, month, day).getTime(),
      content: {
        title: { value: title },
        authors: { value: authorNames },
        authorids: { value: authorIds },
        ...(abstract && { abstract: { value: abstract } }),
        ...(bibtex && { _bibtex: { value: bibtex } }),
        ...(venue && { venue: { value: venue } }),
        ...(html && { html: { value: html } }),
        ...(pdf && { pdf: { value: pdf } }),

      }
    };
    return note
  }

  /**
    * Converts raw arxiv xml to a note object.
    *
    * @static
    * @param {object} workNode - The raw orcid object.
    * @returns {object} The note object.
    *
  */
  static convertArxivXmlToNote(arxivXml) {
    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
      tagValueProcessor: (tagName, tagValue, jPath, hasAttributes, isLeafNode) => {
        return tagValue.replace(/\s+/g, ' ').trim()
      }
    });

    let arxivObj = xmlParser.parse(arxivXml);
    arxivObj=arxivObj?.entry
    
    const title = arxivObj?.title
    const abstract = arxivObj?.summary
    const authorNames = arxivObj?.author?.map((p) => p.name)
    const authorIds = authorNames?.map(p => `https://arxiv.org/search/?query=${encodeURIComponent(p)}&searchtype=all`)
    const subjectArea = arxivObj?.category?.['@_term']
    const pdf = arxivObj?.link?.find((p) => p['@_title'] === 'pdf')?.['@_href']
    const pdate = new Date(arxivObj?.published).getTime()
    const mdate = new Date(arxivObj?.updated).getTime()
    const arxivIdWithLatestVersion = arxivObj?.id?.split('/abs/')[1]
    const externalId = `arxiv:${arxivIdWithLatestVersion}`

    const note = {
      content: {
        title: {
          value: title,
        },
        abstract: {
          value: abstract,
        },
        authors: {
          value: authorNames,
        },
        authorids: {
          value: authorIds,
        },
        // eslint-disable-next-line camelcase
        subject_areas: {
          value: [subjectArea],
        },
        pdf: {
          value: pdf,
        },
      },
      pdate,
      mdate,
      externalId,
    }
    return note
  }

  /**
   * Gets the PDF and abstract from the url that is being passed
   * This method calls a service that extracts the abstract and the PDF from the url
   * The service uses runs npm package @openreview/meta-extraction in the background
   *
   * @static
   * @param {string} url - The url from which the abstract and the PDF are to be extracted
   * @returns {object} The abstract and the PDF
   */
  static async extractAbstract(url) {
    const metaExtractionUrl = 'https://meta-extraction-wivlbyt6ga-uc.a.run.app/metadata';
    const queryString = generateQueryString({ url });
    let result;

    try {
      result = await fetch(`${metaExtractionUrl}?${queryString}`, {
        method: 'GET',
      });
    } catch (error) {
      throw new OpenReviewError({
        name: 'ExtractAbstractError',
        message: error,
      });
    }

    if (result.status === 200) {
      return result.json();
    }

    const contentType = result.headers.get('content-type');
    throw new OpenReviewError({
      name: 'ExtractAbstractError',
      message: (contentType && contentType.indexOf('application/json') !== -1) ? JSON.stringify(await result.json()) : await result.text(),
      status: result.status || 500
    });
  }
}
