const assert = require('assert');
const { OpenReviewClient } = require('../index');

describe('OpenReview Client', function () {
  this.beforeAll(async function () {
    this.superUser = 'OpenReview.net';
    this.superUserPassword = '1234';
    this.superClient = new OpenReviewClient('http://localhost:3001');
    await this.superClient.resetPassword(this.superUser, this.superUserPassword);
  });

  it('should be able to connect to the OpenReview', async function () {
    const data = await this.superClient.connect(this.superUser, this.superUserPassword);
    assert.equal(!!data.token, true);
    assert.equal(!!data.user, true);
    assert.equal(data.error, null);
  });

  it('should register a new user', async function () {
    const { user, error } = await this.superClient.registerUser({
      email: 'new_user@email.com',
      first: 'New',
      last: 'User',
      password: '1234'
    });
    assert.equal(user.id.startsWith('~New_User'), true);
    assert.equal(user.state, 'Inactive');
    assert.equal(error, null);
  });

  it('should search profiles', async function () {
    const { user } = await this.superClient.registerUser({
      email: 'searchable_user@email.com',
      first: 'Searchable',
      last: 'User',
      password: '1234'
    });
    assert.equal(user.id.startsWith('~Searchable_User'), true);
    assert.equal(user.state, 'Inactive');

    const termData = await this.superClient.searchProfiles({ term: 'Searchable' });
    assert.equal(termData.profiles.length === 1, true);
    assert.equal(termData.count === 1, true);
    assert.equal(termData.error, null);

    const emailData = await this.superClient.searchProfiles({
      emails: [ 'searchable_user@email.com' ]
    });
    assert.equal(emailData.profiles.length === 1, true);
    assert.equal(emailData.count === 1, true);
    assert.equal(emailData.error, null);

    const tildeData = await this.superClient.searchProfiles({
      ids: [ '~Searchable_User1' ]
    });
    assert.equal(tildeData.profiles.length === 1, true);
    assert.equal(tildeData.count === 1, true);
    assert.equal(tildeData.error, null);
  });

  it('should POST and GET an Invitation', async function () {
    let res = await this.superClient.postInvitationEdit({
      writers: [ this.superUser ],
      readers: [ this.superUser ],
      signatures: [ this.superUser ],
      invitation: {
        id: `${this.superUser}/-/Edit`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        invitees: [ this.superUser ],
        readers: [ this.superUser ],
        edit: true
      }
    });
    assert.equal(res.error, null);
    assert.equal(res.edit.invitation.id, `${this.superUser}/-/Edit`);
    assert.equal(res.edit.invitation.writers[0], this.superUser);
    assert.equal(res.edit.invitation.readers[0], this.superUser);
    assert.equal(res.edit.invitation.invitees[0], this.superUser);
    assert.equal(res.edit.invitation.signatures[0], this.superUser);
    assert.equal(res.edit.invitation.edit, true);

    res = await this.superClient.getInvitations({
      id: `${this.superUser}/-/Edit`
    });
    assert.equal(res.error, null);
    assert.equal(res.invitations.length, 1);
    assert.equal(res.invitations[0].id, `${this.superUser}/-/Edit`);
    assert.equal(res.count, 1);
  });

  it('should POST and GET a Group', async function () {
    let res = await this.superClient.postInvitationEdit({
      writers: [ this.superUser ],
      readers: [ this.superUser ],
      signatures: [ this.superUser ],
      invitation: {
        id: `${this.superUser}/-/Edit`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        invitees: [ this.superUser ],
        readers: [ this.superUser ],
        edit: true
      }
    });
    assert.equal(res.error, null);

    res = await this.superClient.postGroupEdit({
      invitation: `${this.superUser}/-/Edit`,
      signatures: [ this.superUser ],
      writers: [ this.superUser ],
      readers: [ this.superUser ],
      group: {
        id: `${this.superUser}/Test_Group`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        readers: [ this.superUser ],
        members: [ this.superUser ],
        signatories: [ this.superUser ]
      }
    });
    assert.equal(res.error, null);

    res = await this.superClient.getGroups({
      id: `${this.superUser}/Test_Group`
    });
    assert.equal(res.error, null);
    assert.equal(res.groups.length, 1);
    assert.equal(res.groups[0].id, `${this.superUser}/Test_Group`);
    assert.equal(res.count, 1);

    const newMember = 'a_user@email.com';
    res = await this.superClient.addMembersToGroup(`${this.superUser}/Test_Group`, [ newMember ]);
    assert.equal(res.error, null);

    res = await this.superClient.getGroups({
      id: `${this.superUser}/Test_Group`
    });
    assert.equal(res.error, null);
    assert.equal(res.groups.length, 1);
    assert.equal(res.groups[0].id, `${this.superUser}/Test_Group`);
    assert.equal(res.count, 1);
    assert.equal(res.groups[0].members.length, 2);
    assert.equal(res.groups[0].members[1], newMember);

    res = await this.superClient.removeMembersFromGroup(`${this.superUser}/Test_Group`, [ newMember ]);

    res = await this.superClient.getGroups({
      id: `${this.superUser}/Test_Group`
    });
    assert.equal(res.error, null);
    assert.equal(res.groups.length, 1);
    assert.equal(res.groups[0].id, `${this.superUser}/Test_Group`);
    assert.equal(res.count, 1);
    assert.equal(res.groups[0].members.length, 1);

    res = await this.superClient.deleteGroup(`${this.superUser}/Test_Group`);
    assert.equal(res.error, null);

    res = await this.superClient.getGroups({
      id: `${this.superUser}/Test_Group`
    });
    assert.notEqual(res.error, null);
    assert.equal(res.error.message, `Group Not Found: ${this.superUser}/Test_Group`);
    assert.equal(res.groups.length, 0);
    assert.equal(res.count, 0);
  });

  it('should POST and GET a Note', async function () {
    let res = await this.superClient.postInvitationEdit({
      writers: [ this.superUser ],
      readers: [ this.superUser ],
      signatures: [ this.superUser ],
      invitation: {
        id: `${this.superUser}/-/Edit`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        invitees: [ this.superUser ],
        readers: [ this.superUser ],
        edit: true
      }
    });
    assert.equal(res.error, null);

    res = await this.superClient.postNoteEdit({
      writers: [ this.superUser ],
      readers: [ 'everyone' ],
      signatures: [ this.superUser ],
      invitation: `${this.superUser}/-/Edit`,
      note: {
        signatures: [ this.superUser ],
        readers: [ 'everyone' ],
        writers: [ this.superUser ],
        content: {
          title: {
            value: 'this is a title'
          }
        }
      }
    });
    assert.equal(res.error, null);
    assert.equal(!!res.edit.note.id, true);
    const noteId = res.edit.note.id;

    res = await this.superClient.getNotes({
      id: noteId
    });
    assert.equal(res.error, null);
    assert.equal(res.notes.length, 1);
    assert.equal(res.notes[0].id, noteId);
    assert.equal(res.count, 1);

    res = await this.superClient.searchNotes({
      term: 'this is a title'
    });
    assert.equal(res.error, null);
    assert.equal(res.notes.length, 1);
    assert.equal(res.notes[0].id, noteId);
  });

  it('should POST and GET a Edges', async function () {
    let res = await this.superClient.postInvitationEdit({
      writers: [ this.superUser ],
      readers: [ this.superUser ],
      signatures: [ this.superUser ],
      invitation: {
        id: `${this.superUser}/-/Edit`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        invitees: [ this.superUser ],
        readers: [ this.superUser ],
        edit: true
      }
    });
    assert.equal(res.error, null);

    res = await this.superClient.postInvitationEdit({
      writers: [ this.superUser ],
      readers: [ 'everyone' ],
      signatures: [ this.superUser ],
      invitations: `${this.superUser}/-/Edit`,
      invitation: {
        id: `${this.superUser}/-/Edges`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        invitees: [ '~' ],
        readers: [ 'everyone' ],
        edge: {
          readers: [ 'everyone' ],
          signatures: { param: { regex: '.+' } },
          writers: { param: { regex: '.*' } },
          head: { param: { type: 'profile' } },
          tail: { param: { type: 'profile' } },
          label: { param: { regex: '.*' } },
          weight: { param: { minimum: 0 } }
        }
      }
    });
    assert.equal(res.error, null);

    res = await this.superClient.postEdge({
      invitation: `${this.superUser}/-/Edges`,
      writers: [ this.superUser ],
      readers: [ 'everyone' ],
      signatures: [ this.superUser ],
      head: this.superUser,
      tail: this.superUser,
      label: 'test 1',
      weight: 1
    });
    assert.equal(res.error, null);

    res = await this.superClient.postEdges([
      {
        invitation: `${this.superUser}/-/Edges`,
        writers: [ this.superUser ],
        readers: [ 'everyone' ],
        signatures: [ this.superUser ],
        head: this.superUser,
        tail: this.superUser,
        label: 'test 2',
        weight: 1
      },
      {
        invitation: `${this.superUser}/-/Edges`,
        writers: [ this.superUser ],
        readers: [ 'everyone' ],
        signatures: [ this.superUser ],
        head: this.superUser,
        tail: this.superUser,
        label: 'test 3',
        weight: 1
      }
    ]);
    assert.equal(res.error, null);

    res = await this.superClient.getEdges({
      head: this.superUser
    });
    assert.equal(res.error, null);
    assert.equal(res.edges.length, 3);
    assert.equal(res.count, 3);

    res = await this.superClient.getEdges({
      invitation: `${this.superUser}/-/Edges`,
      groupBy: 'id'
    });
    assert.equal(res.error, null);
    assert.equal(res.groupedEdges.length, 3);

    res = await this.superClient.getEdgesCount({
      head: this.superUser
    });
    assert.equal(res.error, null);
    assert.equal(res.count, 3);

    res = await this.superClient.deleteEdges({
      invitation: `${this.superUser}/-/Edges`
    });
    assert.equal(res.error, null);
    assert.equal(res.status, 'ok');

    res = await this.superClient.getEdgesCount({
      invitation: `${this.superUser}/-/Edges`
    });
    assert.equal(res.error, null);
    assert.equal(res.count, 0);
  });

  it('should PUT and GET an attachment', async function () {
    let res = await this.superClient.postInvitationEdit({
      writers: [ this.superUser ],
      readers: [ this.superUser ],
      signatures: [ this.superUser ],
      invitation: {
        id: `${this.superUser}/-/Edit`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        invitees: [ this.superUser ],
        readers: [ this.superUser ],
        edit: true
      }
    });
    assert.equal(res.error, null);

    res = await this.superClient.postInvitationEdit({
      writers: [ this.superUser ],
      readers: [ 'everyone' ],
      signatures: [ this.superUser ],
      invitations: `${this.superUser}/-/Edit`,
      invitation: {
        id: `${this.superUser}/-/Submission`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        invitees: [ '~' ],
        readers: [ 'everyone' ],
        edit: {
          readers: [ 'everyone' ],
          signatures: { param: { regex: '.+' } },
          writers: { param: { regex: '.*' } },
          note: {
            readers: [ 'everyone' ],
            signatures: { param: { regex: '.+' } },
            writers: { param: { regex: '.*' } },
            content: {
              title: {
                value: {
                  param: {
                    type: 'string',
                    regex: '.+'
                  }
                }
              },
              pdf: {
                value: {
                  param: {
                    optional: true,
                    type: 'file',
                    maxSize: 0.1,
                    extensions: [ 'pdf' ]
                  }
                }
              }
            }
          }
        }
      }
    });
    assert.equal(res.error, null);

    res = await this.superClient.putAttachment('./test/dummy.pdf', `${this.superUser}/-/Submission`, 'pdf');
    assert.equal(res.error, null);
    const url = res.url;

    res = await this.superClient.postNoteEdit({
      writers: [ this.superUser ],
      readers: [ 'everyone' ],
      signatures: [ this.superUser ],
      invitation: `${this.superUser}/-/Edit`,
      note: {
        signatures: [ this.superUser ],
        readers: [ 'everyone' ],
        writers: [ this.superUser ],
        content: {
          title: {
            value: 'this is a title'
          },
          pdf: {
            value: url
          }
        }
      }
    });
    assert.equal(res.error, null);
    assert.equal(!!res.edit.note.id, true);
    const noteId = res.edit.note.id;

    res = await this.superClient.getNotes({
      id: noteId
    });
    assert.equal(res.error, null);
    assert.equal(res.notes.length, 1);
    assert.equal(res.notes[0].id, noteId);
    assert.equal(res.count, 1);

    res = await this.superClient.getAttachment({ noteId, fieldName: 'pdf' }, './test/destination.pdf');
    assert.equal(res.error, null);
  });

  it('should GET next tilde username', async function () {
    let res = await this.superClient.getTildeUsername('OpenReview', 'User');
    assert.equal(res.error, null);
    assert.equal(res.username, '~OpenReview_User1');
  });

  it('should POST and GET a message', async function () {
    let res = await this.superClient.postInvitationEdit({
      writers: [ this.superUser ],
      readers: [ this.superUser ],
      signatures: [ this.superUser ],
      invitation: {
        id: `${this.superUser}/-/Edit`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        invitees: [ this.superUser ],
        readers: [ this.superUser ],
        edit: true
      }
    });
    assert.equal(res.error, null);

    const recipient = 'recipient@email.com';
    res = await this.superClient.postGroupEdit({
      invitation: `${this.superUser}/-/Edit`,
      signatures: [ this.superUser ],
      writers: [ this.superUser ],
      readers: [ this.superUser ],
      group: {
        id: `${this.superUser}/Message_Group`,
        signatures: [ this.superUser ],
        writers: [ this.superUser ],
        readers: [ this.superUser ],
        members: [ recipient ],
        signatories: [ this.superUser ]
      }
    });
    assert.equal(res.error, null);

    res = await this.superClient.postMessage({
      subject: 'test',
      groups: [ `${this.superUser}/Message_Group` ],
      message: 'test message'
    });
    assert.equal(res.error, null);
    assert.equal(res.groups.length, 1);
    assert.equal(res.groups[0].id, `${this.superUser}/Message_Group`);

    res = await this.superClient.getMessages({
      subject: 'test'
    });
    assert.equal(res.error, null);
    assert.equal(res.messages.length, 1);
    assert.equal(res.count, 1);
  });
});
