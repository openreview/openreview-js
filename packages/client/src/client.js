'use strict';

import fs from 'fs';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import { Readable } from 'stream';
import { FormDataEncoder } from 'form-data-encoder';
import { pipeline } from 'stream/promises';
import Tools from './tools.js';
import { handleResponse, removeNilValues, generateQueryString } from './helpers.js';

export default class OpenReviewClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl || 'https://api2.openreview.net';
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'OpenReview-Node-Client'
    };
    this.tools = new Tools(this);

    this.throwErrors = options.throwErrors || false;

    this.registerUrl = `${this.baseUrl}/register`;
    this.loginUrl = `${this.baseUrl}/login`;
    this.notesUrl = `${this.baseUrl}/notes`;
    this.noteEditsUrl = `${this.baseUrl}/notes/edits`;
    this.profilesUrl = `${this.baseUrl}/profiles`;
    this.profilesSearchUrl = `${this.baseUrl}/profiles/search`;
    this.profilesModerateUrl = `${this.baseUrl}/profile/moderate`;
    this.pdfUrl = `${this.baseUrl}/pdf`;
    this.attachmentUrl = `${this.baseUrl}/attachment`;
    this.editAttachmentUrl = `${this.baseUrl}/notes/edits/attachment`;
    this.profilesMergeUrl = `${this.baseUrl}/profiles/merge`;
    this.groupsUrl = `${this.baseUrl}/groups`;
    this.groupEditsUrl = `${this.baseUrl}/groups/edits`;
    this.invitationsUrl = `${this.baseUrl}/invitations`;
    this.invitationEditsUrl = `${this.baseUrl}/invitations/edits`;
    this.tagsUrl = `${this.baseUrl}/tags`;
    this.edgesUrl = `${this.baseUrl}/edges`;
    this.bulkEdgesUrl = `${this.baseUrl}/edges/bulk`;
    this.edgesCountUrl = `${this.baseUrl}/edges/count`;
    this.messagesUrl = `${this.baseUrl}/messages`;
    this.tildeusernameUrl = `${this.baseUrl}/tildeusername`;
    this.processLogsUrl = `${this.baseUrl}/logs/process`;
    this.duplicateDomainsUrl = `${this.baseUrl}/settings/duplicateDomains`;
    this.expertiseUrl = `${this.baseUrl}/expertise`;
    this.expertiseStatusUrl = `${this.baseUrl}/expertise/status`;
    this.expertiseResultsUrl = `${this.baseUrl}/expertise/results`;

    this.RESPONSE_SIZE = 1000;
  }

  /**
   * Handles the token returned by the OpenReview API.
   *
   * @private
   * @param {object} response - Response object returned by the OpenReview API.
   * @param {string} response.token - Authentication token.
   * @returns {void}
   */
  _handleToken(response) {
    if (response.token) {
      this.token = response.token;
      this.headers.Authorization = `Bearer ${this.token}`;
    }
  }

  /**
   * Handles the response returned by the OpenReview API.
   *
   * @private
   * @param {Promise} fetchPromise - Promise returned by the fetch function.
   * @param {object} onErrorData - Data to return in case of error.
   * @param {string} dataName - Name of the data to return.
   * @returns {Promise} Promise that resolves to the response data.
   * @async
   */
  _handleResponse(fetchPromise, onErrorData, dataName) {
    return handleResponse(this.throwErrors)(fetchPromise, onErrorData, dataName);
  }

  /**
   * Formats a profile when a token is provided instead of a username and password.
   *
   * @private
   * @param {object} profile - Profile object.
   * @returns {object} Formatted profile object.
   */
  _formatUserProfile(profile) {
    if (!profile) {
      return {};
    }

    const prefName = (profile.content?.names || []).find(name => name.preferred);
    const name = prefName || profile.content?.names?.[0];
    const usernames = (profile.content?.names || []).map(nameObj => nameObj.username);
    if (!usernames.includes(profile.id)) {
      usernames.push(profile.id);
    }

    return {
      id: profile.id,
      first: name.first,
      middle: name.middle,
      last: name.last,
      emails: profile.content.emails,
      preferredEmail: profile.content.preferredEmail,
      usernames: usernames,
      preferredId: prefName ? prefName.username : profile.id,
      state: profile.state,
    };
  }

  /**
   * Logs in a user.
   *
   * @async
   * @param {string} username - Username or email of the user.
   * @param {string} password - Password of the user.
   * @returns {Promise<object>} Dictionary containing user information and the authentication token.
   */
  async connect({ username, password, token }) {
    if (token) {
      this._handleToken({ token });
      const data = await this.getProfiles({});
      this.user = this._formatUserProfile(data.profiles[0]);
      return { user: this.user, token: this.token, error: null };
    } else {
      const data = await this._handleResponse(fetch(this.loginUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ id: username, password })
      }), { user: {}, token: '' });
      this.user = data.user;
      this._handleToken(data);
      return data;
    }
  }

  /**
   * Resets the password of a user.
   *
   * @async
   * @param {string} token - Token used to reset the password.
   * @param {string} password - New password.
   * @returns {Promise<object>} Dictionary containing user the authentication token.
   */
  async resetPassword(token, password) {
    const url = `${this.baseUrl}/reset/${token}`;
    const data = await this._handleResponse(fetch(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ password })
    }), { user: {}, token: '' });
    this._handleToken(data);
    return data;
  }

  /**
   * Registers a new user.
   *
   * @async
   * @param {string} email - Email that will be used as ID to log in after the user is registered.
   * @param {string} first - First name of the user.
   * @param {string} last - Last name of the user.
   * @param {string} middle - Middle name of the user.
   * @param {string} password - Password used to log into OpenReview.
   * @returns {Promise<object>} Dictionary containing the new user information including his ID, username, email(s), readers, writers, etc.
   */
  async registerUser({ email, first, last, middle, password }) {
    const registerPayload = {
      email,
      name: { first, last, middle },
      password
    };

    const data = await this._handleResponse(fetch(this.registerUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(registerPayload)
    }), { user: {} }, 'user');

    return data;
  }

  /**
   * Activates a newly registered user.
   *
   * @async
   * @param {string} token - Activation token. If running in localhost, use email as token.
   * @param {object} content - Content of the profile to activate.
   * @returns {Promise<object>} Dictionary containing user information and the authentication token.
   *
   * @example
   * const res = await activateUser('new@user.com', {
   *   names: [
   *     {
   *       first: 'New',
   *       last: 'User',
   *       username: '~New_User1'
   *     }
   *   ],
   *   emails: ['new@user.com'],
   *   preferredEmail: 'new@user.com'
   * });
   */
  async activateUser(token, content) {
    const url = `${this.baseUrl}/activate/${token}`;

    const data = await this._handleResponse(fetch(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ content })
    }), { user: {}, token: '' });

    this._handleToken(data);
    return data;
  }

  /**
   * Gets the user profile of the currently logged in user.
   *
   * @async
   * @param {string} token - Authentication token.
   * @returns {Promise<object>} Dictionary containing user information and the authentication token.
   */
  async getActivatable(token) {
    const url = `${this.baseurl}/activatable/${token}`;

    const data = await this._handleResponse(fetch(url, {
      method: 'GET',
      headers: this.headers
    }), { user: {}, token: '' });

    this._handleToken(data);
    return data;
  }

  /**
   * Searches profiles based on the given parameters.
   *
   * @async
   * @param {string[]} confirmedEmails - List of profile confirmed emails.
   * @param {string[]} emails - List of profile emails.
   * @param {string[]} ids - List of profile IDs.
   * @param {string} term - Search by email or id.
   * @param {string} first - First name.
   * @param {string} middle - Middle name.
   * @param {string} last - Last name.
   * @returns {Promise<object[]>} List of profiles.
   */
  async searchProfiles({ confirmedEmails, emails, ids, term, first, middle, last }) {
    if (term) {
      const data = await this._handleResponse(fetch(`${this.profilesSearchUrl}?term=${term}`, {
        method: 'GET',
        headers: this.headers
      }), { profiles: [], count: 0 });

      return data;
    }

    if (emails) {
      const fullResponse = { profiles: [], count: 0 };
      const batches = Tools.splitArray(emails, this.RESPONSE_SIZE);
      let data;
      for (let emailBatch of batches) {
        data = await this._handleResponse(fetch(this.profilesSearchUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ emails: emailBatch })
        }), { profiles: [], count: 0});

        if (data.error) {
          return data;
        }

        fullResponse.profiles.push(...data.profiles);
      }
      fullResponse.count = data.count;
      return fullResponse;
    }

    if (confirmedEmails) {
      const fullResponse = { profiles: [], count: 0 };
      const batches = Tools.splitArray(confirmedEmails, this.RESPONSE_SIZE);
      let data;
      for (let emailBatch of batches) {
        data = await this._handleResponse(fetch(this.profilesSearchUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ emails: emailBatch })
        }), { profiles: [], count: 0 });

        if (data.error) {
          return data;
        }

        fullResponse.profiles.push(...data.profiles);
      }
      fullResponse.count = data.count;
      return fullResponse;
    }

    if (ids) {
      const fullResponse = { profiles: [], count: 0 };
      const batches = Tools.splitArray(ids, this.RESPONSE_SIZE);
      let data;
      for (let batch of batches) {
        data = await this._handleResponse(fetch(this.profilesSearchUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ ids: batch })
        }), { profiles: [], count: 0 });

        if (data.error) {
          return data;
        }

        fullResponse.profiles.push(...data.profiles);
      }
      fullResponse.count = data.count;
      return fullResponse;
    }

    if (first || middle || last) {
      const params = new URLSearchParams({ first, middle, last });
      const data = await this._handleResponse(fetch(`${this.profilesUrl}?${params}`, {
        method: 'GET',
        headers: this.headers
      }), { profiles: [], count: 0 });

      return data;
    }

    return { profiles: [], count: 0 };
  }

  /**
   * Gets a profiles.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - ID of the profile.
   * @param {string} [params.ids] - IDs of the profiles.
   * @param {string} [params.email] - Email of the profile.
   * @param {string} [params.emails] - Emails of the profiles.
   * @param {string} [params.confirmedEmail] - Confirmed email of the profile.
   * @param {string} [params.confirmedEmails] - Confirmed emails of the profiles.
   * @param {string} [params.first] - First name of the profile.
   * @param {string} [params.middle] - Middle name of the profile.
   * @param {string} [params.last] - Last name of the profile.
   * @param {string} [params.select] - Fields to select.
   * @param {string} [params.state] - State of the profile.
   * @param {string} [params.sort] - Sort order of the profiles to return.
   * @param {string} [params.limit] - Number of profiles to return.
   * @param {string} [params.offset] - Number of profiles to skip.
   * @returns {Promise<object>} Dictionary containing the profiles and the total count.
   */
  async getProfiles(params) {
    const queryString = generateQueryString(params);

    const data = await this._handleResponse(fetch(`${this.profilesUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers,
    }), { profiles: [], count: 0 });

    return data;
  }

  /**
   * Gets a file from a Note or a Note Edit
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.noteId] - ID of the Note.
   * @param {string} [params.editId] - ID of the Note Edit.
   * @param {string} [params.fieldName] - Name of the field that contains the file.
   * @param {string} destination - Path to the destination file.
   * @returns {Promise<string>} Path to the destination file.
   *
   * @example
   * const fileBuffer = await client.getAttachment({
   *  noteId: 'OpenReview.net/2023/Conference/-/Blind_Submission',
   *  fieldName: 'pdf'
   * }, 'destination.pdf');
   */
  async getAttachment({ noteId, editId, fieldName }, destination) {
    let params;
    let url;
    if (editId) {
      params = generateQueryString({ id: editId, name: fieldName });
      url = `${this.editAttachmentUrl}?${params}`;
    } else {
      params = generateQueryString({ id: noteId, name: fieldName });
      url = `${this.attachmentUrl}?${params}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers
    });

    // const buffer = await response.buffer();
    // return buffer;

    await pipeline(response.body, fs.createWriteStream(destination));
    return destination;
  }

  /**
   * Uploads a file
   *
   * @param {string} filePath - Path to the file
   * @param {string} invitation - Invitation of the note edit that required the attachment
   * @param {string} name - Name of the note field to save the attachment url to
   * @return {string} A relative URL for the uploaded file
   */
  async putAttachment(filePath, invitation, name) {
    const formData = new FormData();
    formData.set('invitationId', invitation);
    formData.set('name', name);
    formData.set('file', await fileFromPath(filePath));

    const encoder = new FormDataEncoder(formData);

    const data = await this._handleResponse(fetch(this.attachmentUrl, {
      method: 'PUT',
      headers: { ...this.headers, ...encoder.headers },
      body: Readable.from(encoder),
      duplex: 'half'
    }), { url: '' });

    return data;
  }

  /**
   * Updates a Profile
   *
   * @param {Profile} profile - Profile object
   * @return {Profile} The new updated Profile
   */
  async postProfile(profile) {
    const data = await this._handleResponse(fetch(this.profilesUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(profile),
    }), { profile: {} }, 'profile');

    return data;
  }

  /**
   * Merges two Profiles
   *
   * @async
   * @param {Profile} profileTo - Profile object to merge to
   * @param {Profile} profileFrom - Profile object to merge from (this profile will be deleted)
   * @returns {Profile} The new updated Profile
   */
  async mergeProfiles(profileTo, profileFrom) {
    const data = await this._handleResponse(fetch(this.profilesMergeUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ to: profileTo, from: profileFrom }),
    }), { profile: {} }, 'profile');

    return data;
  }

  /**
   * Moderates a Profile
   *
   * @async
   * @param {string} profileId - ID of the Profile
   * @param {string} decision - Decision to take on the Profile
   * @param {string} reason - Reason for the decision
   * @returns {object} The new updated Profile
   */
  async moderateProfile({ profileId, decision, reason }) {
    const data = await this._handleResponse(fetch(this.profilesModerateUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ id: profileId, decision, reason }),
    }), { profile: {} }, 'profile');

    return data;
  }

  /**
   * Gets list of Group objects based on the filters provided. The Groups that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - id of the Group
   * @param {string} [params.prefix] - Prefix that matches several Group ids
   * @param {string} [params.member] - Returns Groups that are transitive members of this value
   * @param {string} [params.members] - Returns Groups that contain this value as its member
   * @param {string} [params.signatory] - Groups that contain this signatory
   * @param {boolean} [params.web] - If true, only Groups that contain a web field value are returned
   * @param {number} [params.limit] - Maximum amount of Groups that this method will return. The limit parameter can range between 0 and 1000 inclusive. If a bigger number is provided, only 1000 Groups will be returned
   * @param {number} [params.offset] - Indicates the position to start retrieving Groups. For example, if there are 10 Groups and you want to obtain the last 3, then the offset would need to be 7.
   * @returns {Promise<{groups: Array<Object>, count: number}>} - Object containing an array of Groups and the count of all Groups.
   */
  async getGroups(params) {
    const queryString = generateQueryString(params);

    const data = await this._handleResponse(fetch(`${this.groupsUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers
    }), { groups: [], count: 0 });

    return data;
  }

  /**
   * Gets a list of Group objects based on the filters provided. The Groups that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - id of the Group
   * @param {string} [params.prefix] - Prefix that matches several Group ids
   * @param {string} [params.member] - Returns Groups that are transitive members of this value
   * @param {string} [params.members] - Returns Groups that contain this value as its member
   * @param {string} [params.signatory] - Groups that contain this signatory
   * @param {boolean} [params.web] - If true, only Groups that contain a web field value are returned
   * @returns {Promise<{groups: Array<Object>, count: number}>} - Object containing an array of Groups and the count of all Groups.
   */
  async getAllGroups(params) {
    return this.tools.getAll(this.getGroups.bind(this), params);
  }

  /**
   * Gets list of Invitation objects based on the filters provided.
   * The Invitations that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - id of the Invitation
   * @param {string} [params.ids] - Comma separated Invitation IDs. If provided, returns invitations whose "id" value is any of the passed Invitation IDs.
   * @param {string} [params.invitee] - Invitations that contain this invitee
   * @param {string} [params.replytoNote] - Invitations that contain this replytoNote
   * @param {string} [params.replyForum] - Invitations that contain this replyForum
   * @param {string} [params.signature] - Invitations that contain this signature
   * @param {string} [params.note] - Invitations that contain this note
   * @param {string} [params.prefix] - Invitation ids that match this prefix
   * @param {string} [params.tags] - Invitations that contain these tags
   * @param {number} [params.limit] - Maximum amount of Invitations that this method will return. The limit parameter can range between 0 and 1000 inclusive. If a bigger number is provided, only 1000 Invitations will be returned
   * @param {number} [params.offset] - Indicates the position to start retrieving Invitations. For example, if there are 10 Invitations and you want to obtain the last 3, then the offset would need to be 7.
   * @param {number} [params.minduedate] - Invitations that have at least this value as due date
   * @param {number} [params.duedate] - Invitations that contain this due date
   * @param {boolean} [params.pastdue] - Invitaions that are past due
   * @param {string} [params.replyto] - Invitations that contain this replyto
   * @param {object} [params.details] - TODO: What is a valid value for this field?
   * @param {boolean} [params.expired] - If true, retrieves the Invitations that have expired, otherwise, the ones that have not expired
   * @param {string} [params.type] - The type of the invitation to retrieve. If specified, only invitations of this type will be returned. Valid values are "ad-hoc" or "review".
   * @param {string} [params.invitation] - The invitation to retrieve. If specified, only the invitation with this ID will be returned.
   *
   * @returns {Promise<{invitations: Array<Object>, count: number}>} - Object containing an array of Invitations and the count of all Invitations.
   */
  async getInvitations(params) {
    const queryString = generateQueryString(params);

    const data = await this._handleResponse(fetch(`${this.invitationsUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers,
    }), { invitations: [], count: 0 });

    return data;
  }

  /**
   * Gets list of Invitation objects based on the filters provided.
   * The Invitations that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - id of the Invitation
   * @param {string} [params.ids] - Comma separated Invitation IDs. If provided, returns invitations whose "id" value is any of the passed Invitation IDs.
   * @param {string} [params.invitee] - Invitations that contain this invitee
   * @param {string} [params.replytoNote] - Invitations that contain this replytoNote
   * @param {string} [params.replyForum] - Invitations that contain this replyForum
   * @param {string} [params.signature] - Invitations that contain this signature
   * @param {string} [params.note] - Invitations that contain this note
   * @param {string} [params.prefix] - Invitation ids that match this prefix
   * @param {string} [params.tags] - Invitations that contain these tags
   * @param {number} [params.limit] - Maximum amount of Invitations that this method will return. The limit parameter can range between 0 and 1000 inclusive. If a bigger number is provided, only 1000 Invitations will be returned
   * @param {number} [params.offset] - Indicates the position to start retrieving Invitations. For example, if there are 10 Invitations and you want to obtain the last 3, then the offset would need to be 7.
   * @param {number} [params.minduedate] - Invitations that have at least this value as due date
   * @param {number} [params.duedate] - Invitations that contain this due date
   * @param {boolean} [params.pastdue] - Invitaions that are past due
   * @param {string} [params.replyto] - Invitations that contain this replyto
   * @param {string} [params.details] - TODO: What is a valid value for this field?
   * @param {boolean} [params.expired] - If true, retrieves the Invitations that have expired, otherwise, the ones that have not expired
   * @param {string} [params.type] - The type of the invitation to retrieve. If specified, only invitations of this type will be returned. Valid values are "ad-hoc" or "review".
   * @param {string} [params.invitation] - The invitation to retrieve. If specified, only the invitation with this ID will be returned.
   *
   * @returns {Promise<{invitations: Array<Object>, count: number}>} - Object containing an array of Invitations and the count of all Invitations.
   */
  async getAllInvitations(params) {
    return this.tools.getAll(this.getInvitations.bind(this), params);
  }

  /**
   * Gets a list of edits for an invitation. The edits that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - ID of the Invitation Edit.
   * @param {string} [params.invitationId] - Invitation ID of the Invitation that is being edited.
   * @param {string} [params.invitation] - ID of the Invitation used to create the Edits.
   * @param {string} [params.sort] - Sort order of the edits to return.
   * @returns {Promise<{edits: Array<Object>, count: number}>} - Object containing an array of Invitation Edits and the count of all Invitation Edits.
   */
  async getInvitationEdits(params) {
    const queryString = generateQueryString({
      id: params?.id,
      invitations: params?.invitation,
      'invitation.id': params?.invitationId,
      sort: params?.sort,
    });

    const data = await this._handleResponse(fetch(`${this.invitationEditsUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers
    }), { edits: [], count: 0 });

    return data;
  }

  /**
   * Gets list of Note objects based on the filters provided. The Notes that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - A Note ID. If provided, returns Notes whose ID matches the given ID.
   * @param {string} [params.paperhash] - A "paperhash" for a note. If provided, returns Notes whose paperhash matches this argument. (A paperhash is a human-interpretable string built from the Note's title and list of authors to uniquely identify the Note)
   * @param {string} [params.forum] - A Note ID. If provided, returns Notes whose forum matches the given ID.
   * @param {string} [params.original] - A Note ID. If provided, returns Notes whose original matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Notes whose "invitation" field is this Invitation ID.
   * @param {string} [params.replyto] - A Note ID. If provided, returns Notes whose replyto field matches the given ID.
   * @param {string} [params.tauthor] - A Group ID. If provided, returns Notes whose tauthor field ("true author") matches the given ID, or is a transitive member of the Group represented by the given ID.
   * @param {string} [params.signature] - A Group ID. If provided, returns Notes whose signatures field contains the given Group ID.
   * @param {string} [params.writer] - A Group ID. If provided, returns Notes whose writers field contains the given Group ID.
   * @param {boolean} [params.trash] - If true, includes Notes that have been deleted (i.e. the ddate field is less than the current date)
   * @param {number} [params.number] - If present, includes Notes whose number field equals the given integer.
   * @param {object} [params.content] - If present, includes Notes whose each key is present in the content field and it is equals the given value.
   * @param {number} [params.limit] - Maximum amount of Notes that this method will return. The limit parameter can range between 0 and 1000 inclusive. If a bigger number is provided, only 1000 Notes will be returned
   * @param {number} [params.offset] - Indicates the position to start retrieving Notes. For example, if there are 10 Notes and you want to obtain the last 3, then the offset would need to be 7.
   * @param {number} [params.mintcdate] - Represents an Epoch time timestamp, in milliseconds. If provided, returns Notes whose "true creation date" (tcdate) is at least equal to the value of mintcdate.
   * @param {string} [params.details] - TODO: What is a valid value for this field?
   * @param {string} [params.sort] - Sorts the output by field depending on the string passed. Possible values: number, cdate, ddate, tcdate, tmdate, replyCount (Invitation id needed in the invitation field).
   *
   * @returns {Promise<{notes: Array<Object>, count: number}>} - Object containing an array of Notes and the count of all Notes.
   */
  async getNotes(params) {
    if (params?.content) {
      for (const [k, v] of Object.entries(params.content)) {
        params[`content.${k}`] = v;
      }
      delete params.content;
    }
    const queryString = generateQueryString(params);

    const data = await this._handleResponse(fetch(`${this.notesUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers,
    }), { notes: [], count: 0 });

    return data;
  }

  /**
   * Gets list of Note objects based on the filters provided. The Notes that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - A Note ID. If provided, returns Notes whose ID matches the given ID.
   * @param {string} [params.paperhash] - A "paperhash" for a note. If provided, returns Notes whose paperhash matches this argument. (A paperhash is a human-interpretable string built from the Note's title and list of authors to uniquely identify the Note)
   * @param {string} [params.forum] - A Note ID. If provided, returns Notes whose forum matches the given ID.
   * @param {string} [params.original] - A Note ID. If provided, returns Notes whose original matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Notes whose "invitation" field is this Invitation ID.
   * @param {string} [params.replyto] - A Note ID. If provided, returns Notes whose replyto field matches the given ID.
   * @param {string} [params.tauthor] - A Group ID. If provided, returns Notes whose tauthor field ("true author") matches the given ID, or is a transitive member of the Group represented by the given ID.
   * @param {string} [params.signature] - A Group ID. If provided, returns Notes whose signatures field contains the given Group ID.
   * @param {string} [params.writer] - A Group ID. If provided, returns Notes whose writers field contains the given Group ID.
   * @param {boolean} [params.trash] - If true, includes Notes that have been deleted (i.e. the ddate field is less than the current date)
   * @param {number} [params.number] - If present, includes Notes whose number field equals the given integer.
   * @param {object} [params.content] - If present, includes Notes whose each key is present in the content field and it is equals the given value.
   * @param {number} [params.mintcdate] - Represents an Epoch time timestamp, in milliseconds. If provided, returns Notes whose "true creation date" (tcdate) is at least equal to the value of mintcdate.
   * @param {string} [params.details] - TODO: What is a valid value for this field?
   * @param {string} [params.sort] - Sorts the output by field depending on the string passed. Possible values: number, cdate, ddate, tcdate, tmdate, replyCount (Invitation id needed in the invitation field).
   *
   * @returns {Promise<{notes: Array<Object>, count: number}>} - Object containing an array of Notes and the count of all Notes.
   */
  async getAllNotes(params) {
    return this.tools.getAll(this.getNotes.bind(this), params);
  }

  /**
   * Gets list of Note objects based on the filters provided. The Notes that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - A Note ID. If provided, returns Notes whose ID matches the given ID.
   * @param {string} [params.paperhash] - A "paperhash" for a note. If provided, returns Notes whose paperhash matches this argument. (A paperhash is a human-interpretable string built from the Note's title and list of authors to uniquely identify the Note)
   * @param {string} [params.forum] - A Note ID. If provided, returns Notes whose forum matches the given ID.
   * @param {string} [params.original] - A Note ID. If provided, returns Notes whose original matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Notes whose "invitation" field is this Invitation ID.
   * @param {string} [params.replyto] - A Note ID. If provided, returns Notes whose replyto field matches the given ID.
   * @param {string} [params.tauthor] - A Group ID. If provided, returns Notes whose tauthor field ("true author") matches the given ID, or is a transitive member of the Group represented by the given ID.
   * @param {string} [params.signature] - A Group ID. If provided, returns Notes whose signatures field contains the given Group ID.
   * @param {string} [params.writer] - A Group ID. If provided, returns Notes whose writers field contains the given Group ID.
   * @param {boolean} [params.trash] - If true, includes Notes that have been deleted (i.e. the ddate field is less than the current date)
   * @param {number} [params.number] - If present, includes Notes whose number field equals the given integer.
   * @param {object} [params.content] - If present, includes Notes whose each key is present in the content field and it is equals the given value.
   * @param {number} [params.limit] - Maximum amount of Notes that this method will return. The limit parameter can range between 0 and 1000 inclusive. If a bigger number is provided, only 1000 Notes will be returned
   * @param {number} [params.offset] - Indicates the position to start retrieving Notes. For example, if there are 10 Notes and you want to obtain the last 3, then the offset would need to be 7.
   * @param {number} [params.mintcdate] - Represents an Epoch time timestamp, in milliseconds. If provided, returns Notes whose "true creation date" (tcdate) is at least equal to the value of mintcdate.
   * @param {string} [params.details] - TODO: What is a valid value for this field?
   * @param {string} [params.sort] - Sorts the output by field depending on the string passed. Possible values: number, cdate, ddate, tcdate, tmdate, replyCount (Invitation id needed in the invitation field).
   *
   * @returns {Promise<{notes: Array<Object>, count: number}>} - Object containing an array of Notes and the count of all Notes.
   */
  async getV1Notes(params) {
    if (params?.content) {
      for (const [k, v] of Object.entries(params.content)) {
        params[`content.${k}`] = v;
      }
      delete params.content;
    }
    const queryString = generateQueryString(params);

    const v1Url = this.tools.convertUrlToV1(this.notesUrl);

    const data = await this._handleResponse(fetch(`${v1Url}?${queryString}`, {
      method: 'GET',
      headers: this.headers,
    }), { notes: [], count: 0 });

    return data;
  }

  /**
   * Gets list of Note objects based on the filters provided. The Notes that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - A Note ID. If provided, returns Notes whose ID matches the given ID.
   * @param {string} [params.paperhash] - A "paperhash" for a note. If provided, returns Notes whose paperhash matches this argument. (A paperhash is a human-interpretable string built from the Note's title and list of authors to uniquely identify the Note)
   * @param {string} [params.forum] - A Note ID. If provided, returns Notes whose forum matches the given ID.
   * @param {string} [params.original] - A Note ID. If provided, returns Notes whose original matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Notes whose "invitation" field is this Invitation ID.
   * @param {string} [params.replyto] - A Note ID. If provided, returns Notes whose replyto field matches the given ID.
   * @param {string} [params.tauthor] - A Group ID. If provided, returns Notes whose tauthor field ("true author") matches the given ID, or is a transitive member of the Group represented by the given ID.
   * @param {string} [params.signature] - A Group ID. If provided, returns Notes whose signatures field contains the given Group ID.
   * @param {string} [params.writer] - A Group ID. If provided, returns Notes whose writers field contains the given Group ID.
   * @param {boolean} [params.trash] - If true, includes Notes that have been deleted (i.e. the ddate field is less than the current date)
   * @param {number} [params.number] - If present, includes Notes whose number field equals the given integer.
   * @param {object} [params.content] - If present, includes Notes whose each key is present in the content field and it is equals the given value.
   * @param {number} [params.mintcdate] - Represents an Epoch time timestamp, in milliseconds. If provided, returns Notes whose "true creation date" (tcdate) is at least equal to the value of mintcdate.
   * @param {string} [params.details] - TODO: What is a valid value for this field?
   * @param {string} [params.sort] - Sorts the output by field depending on the string passed. Possible values: number, cdate, ddate, tcdate, tmdate, replyCount (Invitation id needed in the invitation field).
   *
   * @returns {Promise<{notes: Array<Object>, count: number}>} - Object containing an array of Notes and the count of all Notes.
   */
  async getAllV1Notes(params) {
    return this.tools.getAll(this.getV1Notes.bind(this), params);
  }

  /**
   * Gets a list of edits for a note. The edits that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {Object} params - An object containing the filters to apply.
   * @param {string} [params.noteId] - The ID of the note to get edits for.
   * @param {string} [params.invitation] - The name of the invitation to get edits for.
   * @param {string} [params.sort] - The sort order for the edits.
   *
   * @returns {Promise<{edits: Array<Object>, count: number}>} - Object containing an array of Note Edits and the count of all Note Edits.
   */
  async getNoteEdits(params) {
    const queryString = generateQueryString({
      'note.id': params.noteId,
      invitation: params.invitation,
      sort: params.sort
    });

    const data = await this._handleResponse(fetch(`${this.noteEditsUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers
    }), { edits: [], count: 0 });

    return data;
  }

  /**
   * Gets a list of Tag objects based on the filters provided. The Tags that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - A Tag ID. If provided, returns Tags whose ID matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Tags whose "invitation" field is this Invitation ID.
   * @param {string} [params.forum] - A Note ID. If provided, returns Tags whose forum matches the given ID.
   * @param {string} [params.signature] - Signature
   * @param {string} [params.tag] - Tag
   * @param {number} [params.limit] - Limit
   * @param {number} [params.offset] - Offset
   * @returns {Promise<{tags: Array<Object>, count: number}>} - Object containing an array of tags and the count of all tags.
   */
  async getTags(params) {
    const queryString = generateQueryString(params);

    const data = await this._handleResponse(fetch(`${this.tagsUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers,
    }), { tags: [], count: 0 });

    return data;
  }

  /**
   * Gets a list of Tag objects based on the filters provided. The Tags that will be returned match all the criteria passed in the parameters.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - A Tag ID. If provided, returns Tags whose ID matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Tags whose "invitation" field is this Invitation ID.
   * @param {string} [params.forum] - A Note ID. If provided, returns Tags whose forum matches the given ID.
   * @param {string} [params.signature] - Signature
   * @param {string} [params.tag] - Tag
   * @returns {Promise<{tags: Array<Object>, count: number}>} - Object containing an array of tags and the count of all tags.
   */
  async getAllTags(params) {
    return this.tools.getAll(this.getTags.bind(this), params);
  }

  /**
   * Returns a list of Edge objects based on the filters provided.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - An Edge ID. If provided, returns Edge whose ID matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Edges whose "invitation" field is this Invitation ID.
   * @param {string} [params.head] - Profile ID of the Profile that is connected to the Note ID in tail.
   * @param {string} [params.tail] - Note ID of the Note that is connected to the Profile ID in head.
   * @param {string} [params.label] - Label ID of the match.
   * @param {string} [params.groupBy] - Group by head, tail, id, label, weight.
   * @param {string} [params.select] - Select the fields to return. The parameter groupBy must be used.
   * @param {number} [params.limit] - Maximum number of edges or groups (when using groupBy) to return.
   * @param {number} [params.offset] - Offset into the list of edges to return. It does not apply when using groupBy.
   * @returns {Promise<{edges: Array<Object>, count: number}|{ groupedEdges: Array<Object> }>} - Object containing an array of edges and the count of all edges.
   */
  async getEdges(params) {
    const queryString = generateQueryString(params);

    const data = await this._handleResponse(fetch(`${this.edgesUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers
    }), params.groupBy ? { groupedEdges: [] } : { edges: [], count: 0 });

    return data;
  }

  /**
   * Returns a list of Edge objects based on the filters provided.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - An Edge ID. If provided, returns Edge whose ID matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Edges whose "invitation" field is this Invitation ID.
   * @param {string} [params.head] - Profile ID of the Profile that is connected to the Note ID in tail.
   * @param {string} [params.tail] - Note ID of the Note that is connected to the Profile ID in head.
   * @param {string} [params.label] - Label ID of the match.
   * @param {string} [params.groupBy] - Group by head, tail, id, label, weight.
   * @param {string} [params.select] - Select the fields to return. The parameter groupBy must be used.
   * @returns {Promise<{edges: Array<Object>, count: number}>} - Object containing an array of edges and the count of all edges.
   */
  async getAllEdges(params) {
    return this.tools.getAll(this.getEdges.bind(this), params);
  }

  /**
   * Returns the number of edges based on the filters provided.
   *
   * @async
   * @param {object} params - An object containing the filters to apply.
   * @param {string} [params.id] - An Edge ID. If provided, returns Edge whose ID matches the given ID.
   * @param {string} [params.invitation] - An Invitation ID. If provided, returns Edges whose "invitation" field is this Invitation ID.
   * @param {string} [params.head] - Profile ID of the Profile that is connected to the Note ID in tail.
   * @param {string} [params.tail] - Note ID of the Note that is connected to the Profile ID in head.
   * @param {string} [params.label] - Label ID of the match.
   * @returns {Promise<{count: number}>} - The number of edges matching the provided filters.
   */
  async getEdgesCount(params) {
    const queryString = generateQueryString(params);

    const data = await this._handleResponse(fetch(`${this.edgesCountUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers
    }), { count: 0 });

    return data;
  }

  /**
   * Posts the edge. Upon success, returns the posted Edge object.
   *
   * @async
   * @param {object} edge - The edge object to post.
   * @returns {Promise<object>} Promise object representing the posted Edge object.
   */
  async postEdge(edge) {
    const data = await this._handleResponse(fetch(this.edgesUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(edge),
    }), { edge: {} }, 'edge');

    return data;
  }

  /**
   * Posts the list of Edges. Returns a list Edge objects updated with their ids.
   *
   * @async
   * @param {array} edges - An array of Edge objects to post.
   * @returns {Promise<array>} Promise object representing an array of updated Edge objects with their ids.
   */
  async postEdges(edges) {
    const data = await this._handleResponse(fetch(this.bulkEdgesUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(edges),
    }), { edges: [] }, 'edges');

    return data;
  }

  /**
   * Deletes edges by a combination of invitation id and one or more of the optional filters.
   *
   * @async
   * @param {string} [params.invitation] An invitation ID.
   * @param {string} [params.label] A matching label ID.
   * @param {string} [params.head] ID of the edge head (head type defined by the edge invitation).
   * @param {string} [params.tail] ID of the edge tail (tail type defined by the edge invitation).
   * @param {boolean} [params.waitToFinish=true] True if execution should pause until deletion of edges is finished.
   * @param {boolean} [params.softDelete=false] True if edges should be soft-deleted. Soft deleted Edges can be restored.
   * @returns {Promise<object>} Promise object representing the response from the API.
   */
  async deleteEdges(params) {
    const deleteQuery = removeNilValues(params);

    deleteQuery.waitToFinish ??= true;
    deleteQuery.softDelete ??= false;

    const data = await this._handleResponse(fetch(this.edgesUrl, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify(deleteQuery),
    }), { status: 'error' });

    return data;
  }

  /**
   * Deletes the Profile Reference specified by `referenceId`.
   *
   * @async
   * @param {string} referenceId ID of the Profile Reference to be deleted.
   * @returns {Promise<object>} Promise object representing the response from the API.
   */
  async deleteProfileReference(referenceId) {
    const data = await this._handleResponse(fetch(`${this.profilesUrl}/reference`, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify({ id: referenceId }),
    }), { status: 'error' });

    return data;
  }

  /**
   * Deletes the group.
   *
   * @async
   * @param {string} groupId ID of Group to be deleted.
   * @returns {Promise<object>} Promise object representing the response from the API.
   */
  async deleteGroup(groupId) {
    const data = await this._handleResponse(fetch(this.groupsUrl, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify({ id: groupId }),
    }), { status: 'error' });

    return data;
  }

  /**
   * Posts a message to the recipients and consequently sends them emails
   *
   * @async
   * @param {Object} params - Parameters to post a message
   * @param {string} [params.subject] - Subject of the e-mail
   * @param {Array<string>} [params.groups] - Recipients of the e-mail. Valid inputs would be tilde username or emails registered in OpenReview
   * @param {string} [params.message] - Message in the e-mail
   * @param {Array<string>} [params.ignoreGroups] - List of groups ids to be ignored from the recipient list
   * @param {Object} [params.sender] - Specify the from address and name of the email, the dictionary should have two keys: 'name' and 'email'
   * @param {string} [params.replyTo] - e-mail address used when recipients reply to this message
   * @param {string} [params.parentGroup] - parent group recipients of e-mail belong to
   * @param {string} [params.useJob] - If true, the message will be sent in the background and the response will contain a jobId
   *
   * @returns {Promise<object>} - Contains the message that was sent to each Group
   */
  async postMessage(params) {
    const body = removeNilValues(params);

    const data = await this._handleResponse(fetch(`${this.messagesUrl}/requests`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    }), params?.useJob ? { status: 'error', jobId: '' } : { groups: [] });

    return data;
  }

  /**
   * Adds members to a group
   *
   * @async
   * @param {string} groupId - Group ID to which the members will be added
   * @param {string[]} members - Members that will be added to the group.
   * @returns {Promise<Group>} Group with the members added
   */
  async addMembersToGroup(groupId, members) {
    const { groups, error } = await this.getGroups({ id: groupId });
    if (error) {
      return { group: {}, error };
    }
    const group = groups[0];
    const uniqueMembers = Array.from(new Set(members));

    if (group.invitations) {
      const body = {
        invitation: group.invitations[0],
        signatures: group.signatures,
        group: {
          id: group.id,
          members: {
            append: uniqueMembers
          }
        },
        readers: group.signatures,
        writers: group.signatures
      };
      const { error } = await this.postGroupEdit(body);
      if (error) {
        return { group: {}, error };
      }
      return {
        group: (await this.getGroups({ id: group.id })).groups[0],
        error: null
      };
    } else {
      const data = await this._handleResponse(fetch(`${this.groupsUrl}/members`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({
          id: group.id,
          members: uniqueMembers
        })
      }), { group: {} }, 'group');

      return data;
    }
  }

  /**
   * Removes members from a group
   *
   * @async
   * @param {string} groupId - Group ID from which the members will be removed
   * @param {string[]} members - Members that will be removed.
   * @returns {Promise<Group>} - Group without the members that were removed
   */
  async removeMembersFromGroup(groupId, members) {
    const { groups, error } = await this.getGroups({ id: groupId });
    if (error) {
      return { group: {}, error };
    }
    const group = groups[0];
    const uniqueMembers = Array.from(new Set(members));

    if (group.invitations) {
      const body = {
        invitation: group.invitations[0],
        signatures: group.signatures,
        group: {
          id: group.id,
          members: {
            remove: uniqueMembers
          }
        },
        readers: group.signatures,
        writers: group.signatures
      };
      const { error } = await this.postGroupEdit(body);
      if (error) {
        return { group: {}, error };
      }
      return {
        group: (await this.getGroups({ id: group.id })).groups[0],
        error: null
      };
    } else {
      const data = await this._handleResponse(fetch(`${this.groupsUrl}/members`, {
        method: 'DELETE',
        headers: this.headers,
        body: JSON.stringify({
            id: group.id,
            members: uniqueMembers
        })
      }), { group: {} }, 'group');

      return data;
    }
  }

  /**
   * Searches notes based on term, content, group and source as the criteria. Unlike `openreview.Client.get_notes`, this method uses Elasticsearch to retrieve the Notes.
   *
   * @async
   * @param {string} term - Term used to look for the Notes
   * @param {string} [content=all] - Specifies whether to look in all the content, authors, or keywords. Valid inputs: 'all', 'authors', 'keywords'
   * @param {string} [group=all] - Specifies under which Group to look. E.g. 'all', 'ICLR', 'UAI', etc.
   * @param {string} [source=all] - Whether to look in papers, replies or all.
   * @param {number} [limit] - Maximum amount of Notes that this method will return. The limit parameter can range between 0 and 1000 inclusive. If a bigger number is provided, only 1000 Notes will be returned.
   * @param {number} [offset] - Indicates the position to start retrieving Notes. For example, if there are 10 Notes and you want to obtain the last 3, then the offset would need to be 7.
   * @returns {Promise<{notes: Array<Object>, count: number}>} - Object containing an array of Notes and the count of all Notes.
   */
  async searchNotes(params) {
    if (params?.term) {
      params.content ??= 'all';
      params.group ??= 'all';
      params.source ??= 'all';
    }

    const queryString = generateQueryString(params);

    const data = await this._handleResponse(fetch(`${this.notesUrl}/search?${queryString}`, {
      method: 'GET',
      headers: this.headers
    }), { notes: [], count: 0 });

    return data;
  }

  /**
   * Gets next possible tilde user name corresponding to the specified first, middle and last name
   *
   * @async
   * @param {string} first - First name of the user
   * @param {string} last - Last name of the user
   * @param {string} [middle] - Middle name of the user
   * @returns {Promise<object>} next possible tilde user name corresponding to the specified first, middle and last name
   */
  async getTildeUsername(first, last, middle = null) {
    const queryString = generateQueryString({ first, last, middle });
    const data = await this._handleResponse(fetch(`${this.tildeusernameUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers,
    }), { username: '' });

    return data;
  }

  /**
  * Retrieves all the messages sent to a list of usernames or emails and/or a particular e-mail subject
  *
  * @async
  * @param {string[]} to - Tilde user names or emails
  * @param {string} subject - Subject of the e-mail
  * @param {string} status - Comma-separated list of status values corresponding to the message: delivered, bounce, dropped, etc
  * @param {number} offset - The number of messages to skip before starting to collect the result set
  * @param {number} limit - The maximum number of messages to return
  *
  * @returns {Promise<{messages: Array<Object>, count: number}>} - Messages that match the passed parameters
  */
  async getMessages(params) {
    const queryString = generateQueryString(params);
    const data = await this._handleResponse(fetch(`${this.messagesUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers
    }), { messages: [], count: 0 });

    return data;
  }

  /**
   * Retrieves the logs of the process function executed by an Invitation.
   *
   * @async
   * @param {string} [id] - Log ID
   * @param {string} [invitation] - Invitation ID that executed the process function that produced the logs
   * @param {string} [status] - Status of the logs
   * @returns {Promise<{logs: Array<Object>, count: number}>} - Logs of the process
   */
  async getProcessLogs(id, invitation, status) {
    const queryString = generateQueryString({ id, invitation, status });
    const data = await this._handleResponse(fetch(`${this.processLogsUrl}?${queryString}`, {
      method: 'GET',
      headers: this.headers
    }), { logs: [], count: 0 });

    return data;
  }

  /**
   * Maps domains that belong to the same institution to the same domain.
   *
   * @async
   * @returns {Promise<object>} - Object containing the domains that were mapped
   * @example
   * {
   *  "duplicates": {
   *   "gmail.com": "gmail.com",
   *   "googlemail.com": "gmail.com",
   *   "hotmail.com": "hotmail.com",
   *   "live.com": "hotmail.com",
   *   ...
   *  }
   * }
   */
  async getDuplicateDomains() {
    const data = await this._handleResponse(fetch(this.duplicateDomainsUrl, {
      method: 'GET',
      headers: this.headers
    }), { duplicates: {} });

    return data;
  }

  /**
   * Edits an existing Invitation.
   *
   * @async
   * @param {object} invitaionEdit - Invitation Edit object
   * @param {Array<string>} [invitaionEdit.invitations] - Invitation ID to validate the Edit
   * @param {Array<string>} [invitaionEdit.readers] - List of User IDs to grant read access
   * @param {Array<string>} [invitaionEdit.writers] - List of User IDs to grant write access
   * @param {Array<string>} [invitaionEdit.signatures] - List with one item with the User ID to sign the Invitation
   * @param {object} [invitaionEdit.content] - Content to be added to the Edit
   * @param {boolean} [invitaionEdit.replacement] - If true, the Invitation is replaced by the one defined in the Edit
   * @param {object} [invitaionEdit.invitation] - New Invitation object to be used in the inference
   * @returns {Promise<object>} - Response JSON object
   */
  async postInvitationEdit(invitaionEdit) {
    const body = removeNilValues(invitaionEdit);

    const data = await this._handleResponse(fetch(this.invitationEditsUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    }), { edit: {} }, 'edit');

    return data;
  }

  /**
   * Edits an existing Note.
   *
   * @async
   * @param {object} noteEdit - Note Edit object
   * @param {string} [noteEdit.invitation] - Invitation ID for the Note Edit
   * @param {Array<string>} [noteEdit.signatures] - List of one item with the User ID to sign the Note Edit
   * @param {object} [noteEdit.note] - Note to be edited
   * @param {Array<string>} [noteEdit.readers] - List of User IDs to grant read access
   * @param {Array<string>} [noteEdit.writers] - List of User IDs to grant write access
   * @returns {Promise<object>} - Response JSON object
   */
  async postNoteEdit(noteEdit) {
    const body = removeNilValues(noteEdit);
    const data = await this._handleResponse(fetch(this.noteEditsUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    }), { edit: {} }, 'edit');

    return data;
  }

  /**
   * Edits an existing Group.
   *
   * @async
   * @param {object} groupEdit - Group Edit object
   * @param {string} [groupEdit.invitation] - Invitation ID for the Group Edit
   * @param {Array<string>} [groupEdit.signatures] - List of one item with the User ID to sign the Group Edit
   * @param {object} [groupEdit.group] - Group to be edited
   * @param {Array<string>} [groupEdit.readers] - List of User IDs to grant read access
   * @param {Array<string>} [groupEdit.writers] - List of User IDs to grant write access
   * @returns {Promise<object>} - Response JSON object
   */
  async postGroupEdit(groupEdit) {
    const body = removeNilValues(groupEdit);
    const data = await this._handleResponse(fetch(this.groupEditsUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    }), { edit: {} }, 'edit');

    return data;
  }

  /**
   * Requests expertise for a particular paper or group.
   *
   * @async
   * @param {string} name - The name of the expertise request.
   * @param {string} groupId - The ID of the group to which the expertise belongs.
   * @param {string} venueId - The ID of the venue for the expertise request.
   * @param {string|null} alternateMatchGroup - (Optional) The ID of an alternate group for the expertise request.
   * @param {string|null} expertiseSelectionId - (Optional) The ID of the expertise selection.
   * @param {string|null} model - (Optional) The name of the model to use for the expertise request.
   * @returns {Promise<object>} A Promise that resolves to an object containing the expertise request.
   */
  async requestExpertise(name, groupId, venueId, alternateMatchGroup = null, expertiseSelectionId=null, model=null) {
    // Build entityA from groupId
    const entityA = {
      type: 'Group',
      memberOf: groupId
    };
    if (expertiseSelectionId) {
      entityA.expertise = { invitation: expertiseSelectionId };
    }

    // Build entityB from alternateMatchGroup
    let entityB;
    if (alternateMatchGroup) {
      entityB = {
        type: 'Group',
        memberOf: alternateMatchGroup
      };
      if (expertiseSelectionId) {
        entityB.expertise = { invitation: expertiseSelectionId };
      }
    } else {
      entityB = {
        type: 'Note',
        withVenueid: venueId
      };
    }

    const body = {
      name,
      entityA,
      entityB,
      model: { name: model }
    };

    const data = await this._handleResponse(fetch(this.expertiseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    }), { jobId: '' }, 'jobId');

    return data;
  }

  /**
   * Sends a request to get expertise information for a single paper.
   *
   * @async
   * @param {string} name - The name of the request.
   * @param {string} groupId - The ID of the group.
   * @param {string} paperId - The ID of the paper.
   * @param {string|null} model - The name of the model (optional).
   *
   * @return {Promise<object>} - The JSON response from the API.
   */
  async requestSinglePaperExpertise(name, groupId, paperId, model = null) {
    const entityA = {
      type: 'Group',
      memberOf: groupId
    };

    const entityB = {
      type: 'Note',
      id: paperId
    };

    const expertiseRequest = {
      name,
      entityA,
      entityB,
      model: { name: model }
    };

    const data = await this._handleResponse(fetch(this.expertiseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(expertiseRequest)
    }), { job: {} }, 'job');

    return data;
  }

  /**
   * Gets the status of an expertise job with the given ID.
   *
   * @param {string} jobId - The ID of the expertise job.
   *
   * @return {Promise<object>} - The JSON response from the API.
   */
  async getExpertiseStatus(jobId) {
    const data = await this._handleResponse(fetch(this.expertiseStatusUrl, {
      method: 'GET',
      headers: this.headers,
      params: { jobId }
    }), { status: '' });

    return data;
  }

  /**
   * Gets the results of an expertise job with the given ID.
   *
   * @param {string} jobId - The ID of the expertise job.
   * @param {boolean} waitForComplete - Whether or not to wait for the job to complete (optional, default false).
   *
   * @return {Promise<object>} - The JSON response from the API.
   *
   * @throws {OpenReviewException} - If there was an error computing scores or the function times out.
   */
  async getExpertiseResults(jobId, waitForComplete = false) {
    const callMax = 500;

    if (waitForComplete) {
      let callCount = 0;
      let statusResponse = await this.getExpertiseStatus(jobId, this.baseUrl);
      let status = statusResponse.status;
      while (status !== 'Completed' && status !== 'Error' && callCount < callMax) {
        await new Promise((resolve) => {
          setTimeout(resolve, 60000);
        });
        statusResponse = await this.getExpertiseStatus(jobId, this.baseUrl);
        status = statusResponse.status;
        callCount++;
      }

      if (status === 'Completed') {
        return this.getExpertiseResults(jobId, this.baseUrl);
      }
      if (status === 'Error') {
        throw new Error('There was an error computing scores, description: ' + statusResponse.description);
      }
      if (callCount === callMax) {
        throw new Error('Timeout computing scores, description: ' + statusResponse.description);
      }
      throw new Error('Unknown error, description: ' + statusResponse.description);
    } else {
      const data = await this._handleResponse(fetch(this.expertiseResultsUrl, {
        method: 'GET',
        headers: this.headers,
        params: { jobId }
      }), { results: [] });

      return data;
    }
  }

}
