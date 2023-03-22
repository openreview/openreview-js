'use strict';

class Tools {
  constructor(client) {
    this.client = client;
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

}

module.exports = Tools;
