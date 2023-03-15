const assert = require('assert');
const { OpenReviewClient } = require('../index');

describe('OpenReview Client', function () {
  this.beforeAll(async function () {
    this.superUser = 'test@openreview.net';
    this.superUserPassword = '1234';
    this.superClient = new OpenReviewClient({ baseUrl: 'http://localhost:3001' });
    await this.superClient.resetPassword(this.superUser, this.superUserPassword);
  });

  it('it should be able to connect to the OpenReview', async function () {
    const data = await this.superClient.connect(this.superUser, this.superUserPassword);
    assert.equal(!!data.token, true);
  });

  it('it should register a new user', async function () {
    const data = await this.superClient.registerUser({
      email: 'new_user@email.com',
      first: 'New',
      last: 'User',
      password: '1234'
    });
    assert.equal(data.id.startsWith('~New_User'), true);
    assert.equal(data.state, 'Inactive');
  });

  it('should search profiles', async function () {
    const data = await this.superClient.registerUser({
      email: 'searchable_user@email.com',
      first: 'Searchable',
      last: 'User',
      password: '1234'
    });
    assert.equal(data.id.startsWith('~Searchable_User'), true);
    assert.equal(data.state, 'Inactive');

    const termProfiles = await this.superClient.searchProfiles({ term: 'Searchable' });
    assert.equal(termProfiles.length > 0, true);

    const emailProfiles = await this.superClient.searchProfiles({
      emails: [ 'searchable_user@email.com' ]
    });
    assert.equal(emailProfiles.length === 1, true);

    const tildeProfiles = await this.superClient.searchProfiles({
      ids: [ '~Searchable_User1' ]
    });
    assert.equal(tildeProfiles.length === 1, true);
  });

  
});
