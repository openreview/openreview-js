const assert = require('assert');
const { OpenReviewClient, Tools } = require('../index');

describe('OpenReview Client', function () {
  this.beforeAll(async function () {
    this.superUser = 'OpenReview.net';
    this.strongPassword = 'Or$3cur3P@ssw0rd';
    this.superClient = new OpenReviewClient('http://localhost:3001');
    await this.superClient.resetPassword(this.superUser, this.strongPassword);

    const data = await this.superClient.connect({
      username: this.superUser,
      password: this.strongPassword
    });
    assert.equal(!!data.token, true);
    assert.equal(!!data.user, true);
    assert.equal(data.error, null);
  });

  it('should register a new user', async function () {
    const { user, error } = await this.superClient.registerUser({
      email: 'new_user@email.com',
      first: 'New',
      last: 'User',
      password: this.strongPassword
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
      password: this.strongPassword
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

    const recipient2 = 'recipient2@email.com';
    res = await this.superClient.postMessage({
      subject: 'test 2',
      groups: [ recipient2 ],
      message: 'test message 2'
    });
    assert.equal(res.error, null);
    assert.equal(res.groups.length, 1);
    assert.equal(res.groups[0].id, recipient2);

    res = await this.superClient.getMessages({
      subject: 'test 2'
    });
    assert.equal(res.error, null);
    assert.equal(res.messages.length, 1);
    assert.equal(res.count, 1);
  });

  it('should compute the venue from venueid and decision', async function () {
    let res = this.superClient.tools.decisionToVenue('ICLR.cc/2023/Conference', 'Accept');
    assert.equal(res, 'ICLR.cc/2023/Conference');

    res = this.superClient.tools.decisionToVenue('ICLR.cc/2023/Conference', 'Reject');
    assert.equal(res, 'Submitted to ICLR.cc/2023/Conference');
  });

  it('should get preferred name from a profile', async function () {
    let fakeProfile = {
      content: {
        names: [
          {
            fullname: 'First Middle Last',
            username: '~First_Middle_Last1',
            preferred: false
          },
          {
            fullname: 'AnotherFirst AnotherMiddle AnotherLast',
            username: '~AnotherFirst_AnotherMiddle_AnotherLast1',
            preferred: true
          }
        ]
      }
    };

    let res = Tools.getPreferredName(fakeProfile);
    assert.equal(res, 'AnotherFirst AnotherMiddle AnotherLast');

  });

  it('should GET a profile with no params', async function () {
    let res = await this.superClient.getProfiles();
    assert.equal(res.error, null);
    assert.equal(res.profiles[0].id, '~Super_User1');
  });

  it('should connect using a token', async function () {
    let res = await this.superClient.connect({ token: this.superClient.token });
    assert.equal(res.error, null);
    assert.equal(res.token, this.superClient.token);
    assert.equal(res.user.id, '~Super_User1');
  });

  it('should moderate a Profile', async function () {
    const { user, error } = await this.superClient.registerUser({
      email: 'moderated_profile@email.com',
      first: 'Moderate',
      last: 'User',
      password: this.strongPassword
    });
    assert.equal(user.id.startsWith('~Moderate_User'), true);
    assert.equal(user.state, 'Inactive');
    assert.equal(error, null);

    const { error: blockError } = await this.superClient.moderateProfile({
      profileId: user.id,
      decision: 'block'
    });
    assert.equal(blockError, null);

    let { profiles, error: profileError } = await this.superClient.getProfiles({
      id: user.id,
      withBlocked: true
    });
    assert.equal(profileError, null);
    assert.equal(profiles[0].state, 'Blocked');

    const { error: UnblockError } = await this.superClient.moderateProfile({
      profileId: user.id,
      decision: 'unblock'
    });
    assert.equal(UnblockError, null);

    ({ profiles, error: profileError } = await this.superClient.getProfiles({
      id: user.id,
      withBlocked: true
    }));
    assert.equal(profileError, null);
    assert.equal(profiles[0].state, 'Inactive');
  });

  it('should throw errors when setting throwErrors to true', async function () {
    this.superClient.throwErrors = true;
    let res;

    try {
      res = await this.superClient.getGroups({
        id: `${this.superUser}/Test_Group`
      });
    } catch (error) {
      assert.equal(error.name, 'NotFoundError');
      assert.equal(error.message, `Group Not Found: ${this.superUser}/Test_Group`);
      assert.equal(error.status, 404);
    }

    try {
      res = await this.superClient.getNotes({
        id: 'non_existent_note_id'
      });
    } catch (error) {
      assert.equal(error.name, 'NotFoundError');
      assert.equal(error.message, 'The Note non_existent_note_id was not found');
      assert.equal(error.status, 404);
    }

    res = await this.superClient.postInvitationEdit({
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

    try {
      res = await this.superClient.postNoteEdit({
        writers: [ this.superUser ],
        readers: [ 'everyone' ],
        signatures: [ this.superUser ],
        invitation: `${this.superUser}/-/Edit`,
        note: {
          signatures: [ this.superUser ],
          readers: [ 'everyone' ],
          invalidField: 'invalid',
          writers: [ this.superUser ],
          content: {
            title: {
              value: 'this is a title',
              invalidField: 'invalid'
            }
          }
        }
      });
    } catch (error) {
      assert.equal(error.name, 'MultiError');
      assert.equal(error.message, 'First of 2: The property invalidField must NOT be present');
      assert.equal(error.status, 400);
      assert.equal(error.errors[0].name, 'AdditionalPropertiesError');
      assert.equal(error.errors[0].message, 'The property invalidField must NOT be present');
      assert.equal(error.errors[0].status, 400);
      assert.equal(error.errors[0].details.path, 'note');
      assert.equal(error.errors[1].name, 'AdditionalPropertiesError');
      assert.equal(error.errors[1].message, 'The property invalidField must NOT be present');
      assert.equal(error.errors[1].status, 400);
      assert.equal(error.errors[1].details.path, 'note/content/title');
    }

    this.throwErrors = false;
  });

  it('should test prettyId', async function () {
    let res = Tools.prettyId('ICLR.cc/2023/Conference');
    assert.equal(res, 'ICLR 2023 Conference');

    res = Tools.prettyId('ICLR.cc/2023/Conference/-/Blind_Submission');
    assert.equal(res, 'ICLR 2023 Conference Blind Submission');

    res = Tools.prettyId('ICLR.cc/2023/Conference/-/Revision');
    assert.equal(res, 'ICLR 2023 Conference Revision');

    res = Tools.prettyId('ICLR.cc/2023/Conference/-/Meta_Review', true);
    assert.equal(res, 'Meta Review');

    res = Tools.prettyId('');
    assert.equal(res, '');
  });

  it('should calculate conflicts between profiles', async function () {
    let { user, error } = await this.superClient.registerUser({
      email: 'conflict_user_one@fb.com',
      first: 'Conflict',
      last: 'User One',
      password: this.strongPassword
    });
    assert.equal(user.id.startsWith('~Conflict_User_One'), true);
    assert.equal(user.state, 'Inactive');
    assert.equal(error, null);
    const profileId1 = user.id;

    ({ user, error } = await this.superClient.registerUser({
      email: 'conflict_user_two@facebook.com',
      first: 'Conflict',
      last: 'User Two',
      password: this.strongPassword
    }));
    assert.equal(user.id.startsWith('~Conflict_User_Two'), true);
    assert.equal(user.state, 'Inactive');
    assert.equal(error, null);
    const profileId2 = user.id;

    const { profiles: [ profile1 ] } = await this.superClient.getProfiles({ id: profileId1 });
    const { profiles: [ profile2 ] } = await this.superClient.getProfiles({ id: profileId2 });

    const conflicts = await this.superClient.tools.getConflicts([ profile1 ], profile2);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0], 'facebook.com');
  });

  it('should convert DBLP xml to Note Edit', async function () {
    const dblpXmls = [
      '<inproceedings key="conf/acl/KimBL16" mdate="2018-09-12">\n<author>Seokhwan Kim</author>\n<author>Rafael E. Banchs</author>\n<author>Haizhou Li 0001</author>\n<title>Exploring Convolutional and Recurrent Neural Networks in Sequential Labelling for Dialogue Topic Tracking.</title>\n<year>2016</year>\n<booktitle>ACL (1)</booktitle>\n<ee>http://aclweb.org/anthology/P/P16/P16-1091.pdf</ee>\n<crossref>conf/acl/2016-1</crossref>\n<url>db/conf/acl/acl2016-1.html#KimBL16</url>\n</inproceedings>',
      '<proceedings key="conf/acl/1987" mdate="2017-05-10">\n<editor>Candy L. Sidner</editor>\n<title>25th Annual Meeting of the Association for Computational Linguistics, Stanford University, Stanford, California, USA, July 6-9, 1987.</title>\n<booktitle>ACL</booktitle>\n<publisher>ACL</publisher>\n<year>1987</year>\n<ee>http://aclweb.org/anthology/P/P87/</ee>\n<url>db/conf/acl/acl1987.html</url>\n</proceedings>\n\n',
      '<inproceedings key="conf/acl/Rajasekaran95" mdate="2016-12-19">\n<author>Sanguthevar Rajasekaran</author>\n<title>TAL Recognition in O(M(n<sup>2</sup>)) Time.</title>\n<pages>166-173</pages>\n<year>1995</year>\n<crossref>conf/acl/1995</crossref>\n<booktitle>ACL</booktitle>\n<url>db/conf/acl/acl95.html#Rajasekaran95</url>\n<ee>http://aclweb.org/anthology/P/P95/P95-1023.pdf</ee>\n</inproceedings>',
      '<inproceedings key="conf/aaai/TanYWHTS16" mdate="2018-11-20">\n<author>Mingkui Tan</author>\n<author>Yan Yan 0006</author>\n<author>Li Wang 0033</author>\n<author>Anton van den Hengel</author>\n<author>Ivor W. Tsang</author>\n<author>Qinfeng (Javen) Shi</author>\n<title>Learning Sparse Confidence-Weighted Classifier on Very High Dimensional Data.</title>\n<pages>2080-2086</pages>\n<year>2016</year>\n<booktitle>AAAI</booktitle>\n<ee>http://www.aaai.org/ocs/index.php/AAAI/AAAI16/paper/view/12329</ee>\n<crossref>conf/aaai/2016</crossref>\n<url>db/conf/aaai/aaai2016.html#TanYWHTS16</url>\n</inproceedings>',
    ];

    const resolved = [
      {
        cdate: 1451606400000,
        content: {
          venue: { value: 'ACL (1) 2016' },
          venueid: { value: 'dblp.org/conf/ACL/2016' },
          _bibtex: { value: '@inproceedings{DBLP:conf/acl/KimBL16,\n  author={Seokhwan Kim and Rafael E. Banchs and Haizhou Li},\n  title={Exploring Convolutional and Recurrent Neural Networks in Sequential Labelling for Dialogue Topic Tracking},\n  year={2016},\n  cdate={1451606400000},\n  url={http://aclweb.org/anthology/P/P16/P16-1091.pdf},\n  booktitle={ACL (1)},\n  crossref={conf/acl/2016-1}\n}\n' },
          authors: { value: [ 'Seokhwan Kim', 'Rafael E. Banchs', 'Haizhou Li' ] },
          authorids: { value: [
            'https://dblp.org/search/pid/api?q=author:Seokhwan_Kim:',
            'https://dblp.org/search/pid/api?q=author:Rafael_E._Banchs:',
            'https://dblp.org/search/pid/api?q=author:Haizhou_Li_0001:'
          ] },
          'pdf': { value: 'http://aclweb.org/anthology/P/P16/P16-1091.pdf' },
          'title': { value: 'Exploring Convolutional and Recurrent Neural Networks in Sequential Labelling for Dialogue Topic Tracking' }
        }
      },
      {
        cdate: 536457600000,
        content: {
          venue: { value: 'ACL 1987' },
          venueid: { value: 'dblp.org/conf/ACL/1987' },
          _bibtex: { value: '@proceedings{DBLP:conf/acl/1987,\n  author={},\n  title={25th Annual Meeting of the Association for Computational Linguistics, Stanford University, Stanford, California, USA, July 6-9, 1987},\n  year={1987},\n  cdate={536457600000},\n  url={http://aclweb.org/anthology/P/P87/},\n  booktitle={ACL},\n  publisher={ACL}\n}\n' },
          authors: { value: [] },
          authorids: { value: [] },
          html: { value: 'http://aclweb.org/anthology/P/P87/' },
          title: { value: '25th Annual Meeting of the Association for Computational Linguistics, Stanford University, Stanford, California, USA, July 6-9, 1987' }
        }
      },
      {
        cdate: 788918400000,
        content: {
          venue: { value: 'ACL 1995' },
          venueid: { value: 'dblp.org/conf/ACL/1995' },
          _bibtex: { value: '@inproceedings{DBLP:conf/acl/Rajasekaran95,\n  author={Sanguthevar Rajasekaran},\n  title={TAL Recognition in O(M(n)) Time},\n  year={1995},\n  cdate={788918400000},\n  pages={166-173},\n  url={http://aclweb.org/anthology/P/P95/P95-1023.pdf},\n  booktitle={ACL},\n  crossref={conf/acl/1995}\n}\n' },
          authors: { value: [ 'Sanguthevar Rajasekaran' ] },
          authorids: { value: [ 'https://dblp.org/search/pid/api?q=author:Sanguthevar_Rajasekaran:' ] },
          pdf: { value: 'http://aclweb.org/anthology/P/P95/P95-1023.pdf' },
          title: { value: 'TAL Recognition in O(M(n)) Time' }
        }
      },
      {
        cdate: 1451606400000,
        content: {
          venue: { value: 'AAAI 2016' },
          venueid: { value: 'dblp.org/conf/AAAI/2016' },
          _bibtex: { value: '@inproceedings{DBLP:conf/aaai/TanYWHTS16,\n  author={Mingkui Tan and Yan Yan and Li Wang and Anton van den Hengel and Ivor W. Tsang and Qinfeng Javen Shi},\n  title={Learning Sparse Confidence-Weighted Classifier on Very High Dimensional Data},\n  year={2016},\n  cdate={1451606400000},\n  pages={2080-2086},\n  url={http://www.aaai.org/ocs/index.php/AAAI/AAAI16/paper/view/12329},\n  booktitle={AAAI},\n  crossref={conf/aaai/2016}\n}\n' },
          authors: { value: [ 'Mingkui Tan', 'Yan Yan', 'Li Wang', 'Anton van den Hengel', 'Ivor W. Tsang', 'Qinfeng Javen Shi' ] },
          authorids: { value: [
            'https://dblp.org/search/pid/api?q=author:Mingkui_Tan:',
            'https://dblp.org/search/pid/api?q=author:Yan_Yan_0006:',
            'https://dblp.org/search/pid/api?q=author:Li_Wang_0033:',
            'https://dblp.org/search/pid/api?q=author:Anton_van_den_Hengel:',
            'https://dblp.org/search/pid/api?q=author:Ivor_W._Tsang:',
            'https://dblp.org/search/pid/api?q=author:Qinfeng_(Javen)_Shi:'
          ]},
          html: { value: 'http://www.aaai.org/ocs/index.php/AAAI/AAAI16/paper/view/12329' },
          title: { value: 'Learning Sparse Confidence-Weighted Classifier on Very High Dimensional Data' }
        }
      }
    ];

    for (let i = 0; i < dblpXmls.length; i++) {
      const note = Tools.convertDblpXmlToNote(dblpXmls[i]);
      const resolvedNote = resolved[i];
      if (resolvedNote.pdate) {
        assert.equal(note.pdate, resolvedNote.pdate);
      }
      if (resolvedNote.cdate) {
        assert.equal(note.cdate, resolvedNote.cdate);
      }
      for (const [ key, { value } ] of Object.entries(resolvedNote.content)) {
        if (Array.isArray(value)) {
          assert.equal(note.content[key].value.length, value.length);
          for (let i = 0; i < value.length; i++) {
            assert.equal(note.content[key].value[i], value[i]);
          }
        } else {
          assert.equal(note.content[key].value, value);
        }
      }
    }
  });

});

describe.only('Abstract Extraction', function (){
  // add timeout 5 seconds for this suite
  this.timeout(10000);
  it('should extract abstract using general rule',async function (){
    const abstractExpected = 'Unimanual interaction allows the user to operate the mobile device in a distracted, multitasking scenario and frees the other hand for tasks like carrying a bag, writing a relevant note etc. In such scenarios, the thumb of the hand holding the device is normally the only available finger for touch input [Boring et al. 2012]. However, mainly due to biomechanical limitations of the thumb, only a subregion of the touch screen is comfortable to access by the thumb [Karlson and Bederson 2007], causing awkward hand postures to reach the rest of the screen. This problem of limited screen accessibility by the thumb deteriorates with screens of increasingly bigger sizes, which, however, are getting more and more popular [Fingas 2012].';
    const {abstract} = await Tools.extractAbstract('https://doi.org/10.1145/2543651.2543680');
    assert.equal(abstract,abstractExpected);
  });

  it('should extract abstract using general rule (proceedings.mlr.press)',async function (){
    const abstractExpected = 'In order for a robot to be a generalist that can perform a wide range of jobs, it must be able to acquire a wide variety of skills quickly and efficiently in complex unstructured environments. High-capacity models such as deep neural networks can enable a robot to represent complex skills, but learning each skill from scratch then becomes infeasible. In this work, we present a meta-imitation learning method that enables a robot to learn how to learn more efficiently, allowing it to acquire new skills from just a single demonstration. Unlike prior methods for one-shot imitation, our method can scale to raw pixel inputs and requires data from significantly fewer prior tasks for effective learning of new skills. Our experiments on both simulated and real robot platforms demonstrate the ability to learn new tasks, end-to-end, from a single visual demonstration.';
    const pdfExpected = 'http://proceedings.mlr.press/v78/finn17a/finn17a.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('http://proceedings.mlr.press/v78/finn17a.html');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract using arxiv rule',async function (){
    const abstractExpected = 'While medical images such as computed tomography (CT) are stored in DICOM format in hospital PACS, it is still quite routine in many countries to print a film as a transferable medium for the purposes of self-storage and secondary consultation. Also, with the ubiquitousness of mobile phone cameras, it is quite common to take pictures of the CT films, which unfortunately suffer from geometric deformation and illumination variation. In this work, we study the problem of recovering a CT film, which marks the first attempt in the literature, to the best of our knowledge. We start with building a large-scale head CT film database CTFilm20K, consisting of approximately 20,000 pictures, using the widely used computer graphics software Blender. We also record all accompanying information related to the geometric deformation (such as 3D coordinate, depth, normal, and UV maps) and illumination variation (such as albedo map). Then we propose a deep framework to disentangle geometric deformation and illumination variation using the multiple maps extracted from the CT films to collaboratively guide the recovery process. Extensive experiments on simulated and real images demonstrate the superiority of our approach over the previous approaches. We plan to open source the simulated images and deep models for promoting the research on CT film recovery (https://anonymous.4open.science/r/e6b1f6e3-9b36-423f-a225-55b7d0b55523/).';
    const pdfExpected = 'http://arxiv.org/pdf/2012.09491v1';
    const {abstract,pdf} = await Tools.extractAbstract('https://arxiv.org/abs/2012.09491');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract using general rule (ojs.aaai.org)',async function (){
    const abstractExpected = 'We study how political polarization is reflected in the social media posts used by media outlets to promote their content online. In particular, we track the Twitter posts of several media outlets over the course of more than three years (566K tweets), and the engagement with these tweets from other users (104M retweets), modeling the relationship between the tweet text and the political diversity of the audience. We build a tool that integrates our model and helps journalists craft tweets that are engaging to a politically diverse audience, guided by the model predictions. To test the real-world impact of the tool, we partner with the PBS documentary series Frontline and run a series of advertising experiments on Twitter. We find that in seven out of the ten experiments, the tweets selected by our model were indeed engaging to a more politically diverse audience, reducing the gap in engagement between left- and right-leaning users by 20.3%, on average, and illustrating the effectiveness of our approach.';
    const pdfExpected = 'https://ojs.aaai.org/index.php/ICWSM/article/download/19342/19114';
    const {abstract, pdf} = await Tools.extractAbstract('https://ojs.aaai.org/index.php/ICWSM/article/view/19342');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should extract abstract and pdf using aaai rule (aaai.org)',async function (){
    const abstractExpected = 'We propose a system for the derivation of algorithms which allows us to use "factual knowledge" for the development of concurrent programs. From preliminary program versions the system can derive new versions which have higher performances and can be evaluated by communicating agents in a parallel architecture. The knowledge about the facts or properties of the programs is also used for the improvement of the system itself.';
    const pdfExpected = 'https://cdn.aaai.org/AAAI/1986/AAAI86-005.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('http://www.aaai.org/Library/AAAI/1986/aaai86-005.php');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should extract pdf using aaai rule (aaai.org)',async function (){
    const abstractExpected = null; // no abstract available on the webpage
    const pdfExpected = 'https://cdn.aaai.org/ojs/10167/10167-13-13695-1-2-20201228.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('http://www.aaai.org/ocs/index.php/AAAI/AAAI16/paper/view/12177');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using general rule (openaccess.thecvf.com)',async function (){
    const abstractExpected = 'Despite the great success of GANs in images translation with different conditioned inputs such as semantic segmentation and edge map, generating high-fidelity images with reference styles from exemplars remains a grand challenge in conditional image-to-image translation. This paper presents a general image translation framework that incorporates optimal transport for feature alignment between conditional inputs and style exemplars in translation. The introduction of optimal transport mitigates the constraint of many-to-one feature matching significantly while building up semantic correspondences between conditional inputs and exemplars. We design a novel unbalanced optimal transport to address the transport between features with deviational distributions which exists widely between conditional inputs and exemplars. In addition, we design a semantic-aware normalization scheme that injects style and semantic features of exemplars into the image translation process successfully. Extensive experiments over multiple image translation tasks show that our proposed technique achieves superior image translation qualitatively and quantitatively as compared with the state-of-the-art.';
    const pdfExpected = 'https://openaccess.thecvf.com/content/CVPR2021/papers/Zhan_Unbalanced_Feature_Transport_for_Exemplar-Based_Image_Translation_CVPR_2021_paper.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('https://openaccess.thecvf.com/content/CVPR2021/html/Zhan_Unbalanced_Feature_Transport_for_Exemplar-Based_Image_Translation_CVPR_2021_paper.html');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using aclanthology rule (aclanthology.org)',async function (){
    const abstractExpected = 'Training a Named Entity Recognition (NER) model often involves fixing a taxonomy of entity types. However, requirements evolve and we might need the NER model to recognize additional entity types. A simple approach is to re-annotate entire dataset with both existing and additional entity types and then train the model on the re-annotated dataset. However, this is an extremely laborious task. To remedy this, we propose a novel approach called Partial Label Model (PLM) that uses only partially annotated datasets. We experiment with 6 diverse datasets and show that PLM consistently performs better than most other approaches (0.5 - 2.5 F1), including in novel settings for taxonomy expansion not considered in prior work. The gap between PLM and all other approaches is especially large in settings where there is limited data available for the additional entity types (as much as 11 F1), thus suggesting a more cost effective approaches to taxonomy expansion.';
    const pdfExpected = 'https://aclanthology.org/2023.emnlp-main.426.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('https://aclanthology.org/2023.emnlp-main.426');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using neuripsCC rule (proceedings.neurips.cc)',async function (){
    const abstractExpected = 'Semi-supervised learning (SSL) improves model generalization by leveraging massive unlabeled data to augment limited labeled samples. However, currently, popular SSL evaluation protocols are often constrained to computer vision (CV) tasks. In addition, previous work typically trains deep neural networks from scratch, which is time-consuming and environmentally unfriendly. To address the above issues, we construct a Unified SSL Benchmark (USB) for classification by selecting 15 diverse, challenging, and comprehensive tasks from CV, natural language processing (NLP), and audio processing (Audio), on which we systematically evaluate the dominant SSL methods, and also open-source a modular and extensible codebase for fair evaluation of these SSL methods. We further provide the pre-trained versions of the state-of-the-art neural models for CV tasks to make the cost affordable for further tuning. USB enables the evaluation of a single SSL algorithm on more tasks from multiple domains but with less cost. Specifically, on a single NVIDIA V100, only 39 GPU days are required to evaluate FixMatch on 15 tasks in USB while 335 GPU days (279 GPU days on 4 CV datasets except for ImageNet) are needed on 5 CV tasks with TorchSSL.';
    const pdfExpected = 'https://proceedings.neurips.cc/paper_files/paper/2022/file/190dd6a5735822f05646dc27decff19b-Paper-Datasets_and_Benchmarks.pdf';

    // redirect to neurips.cc
    const {abstract, pdf} = await Tools.extractAbstract('http://papers.nips.cc/paper_files/paper/2022/hash/190dd6a5735822f05646dc27decff19b-Abstract-Datasets_and_Benchmarks.html');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using aclanthology rule (www.aclweb.org)',async function (){
    const abstractExpected = 'This paper presents the ArabicProcessors team’s deep learning system designed for the NADI 2020 Subtask 1 (country-level dialect identification) and Subtask 2 (province-level dialect identification). We used Arabic-Bert in combination with data augmentation and ensembling methods. Unlabeled data provided by task organizers (10 Million tweets) was split into multiple subparts, to which we applied semi-supervised learning method, and finally ran a specific ensembling process on the resulting models. This system ranked 3rd in Subtask 1 with 23.26% F1-score and 2nd in Subtask 2 with 5.75% F1-score.';
    const pdfExpected = 'https://aclanthology.org/2020.wanlp-1.28.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('https://www.aclweb.org/anthology/2020.wanlp-1.28/');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using dlAcmOrgRule rule (dl.acm.org)',async function (){
    // eslint-disable-next-line quotes
    const abstractExpected = `n today's information era, every day more and more information is generated and people, on the one hand, have advantages due the increasing support in decision processes and, on the other hand, are experiencing difficulties in the selection of the right data to use. That is, users may leverage on more data but at the same time they may not be able to fully value such data since they lack the necessary knowledge about their provenance and quality. The data quality research area provides quality assessment and improvement methods that can be a valuable support for users that have to deal with the complexity of Web content. In fact, such methods help users to identify the suitability of information for their purposes. Most of the methods and techniques proposed, however, address issues for structured data and/or for defined contexts. Clearly, they cannot be easily used on the Web, where data come from heterogeneous sources and the context of use is most of the times unknown. In this keynote, the need for new assessment techniques is highlighted together with the importance of tracking data provenance as well as the reputation and trustworthiness of the sources. In fact, it is well known that the increase of data volume often corresponds to an increase of value, but to maximize such value the data sources to be used have to carefully analyzed, selected and integrated depending on the specific context of use. The talk discusses the data quality dimensions necessary to analyze different Web data sources and provides a set of illustrative examples that show how to maximize the quality of gathered information.`;
    //const pdfExpected = 'https://dl.acm.org/doi/pdf/10.1145/2740908.2778845'; // pdf link is only available for subscribers
    // eslint-disable-next-line no-unused-vars
    const {abstract, pdf} = await Tools.extractAbstract('http://dl.acm.org/citation.cfm?id=2778845');
    assert.equal(abstract,abstractExpected);
    //assert.equal(pdf,pdfExpected);
  });

  it('should return empty using openreview rule (openreview.net)',async function (){
    const abstractExpected = undefined;
    const pdfExpected = undefined;
    const {abstract, pdf} = await Tools.extractAbstract('https://openreview.net/forum?id=Rty5g9imm7H');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using openreview rule (openreview.net)',async function (){
    const abstractExpected = 'Deep Neural Networks (DNNs) have demonstrated remarkable success in computer vision applications. However, achieving sophisticated learning objectives often demands massive amounts of data, leading to challenges related to network management such as memory storage, computational cost, training time, and searching optimal models. Dataset distillation presents a potential solution by creating smaller training sets, but existing methods suffer from high computational costs and lengthy training times. Dataset distillation with distribution matching (DM) offers a viable approach to training synthetic sets with reduced cost and processing time, albeit at the expense of accuracy degradation. In this paper, we propose an improved distribution matching version that can enhance testing accuracy with low computational cost and an acceptable training time. Particularly, we propose to combine representative original image selection with multiple synthetic sample generations for the training with distribution matching. In addition, to increase the matching diversity, perturbation, pre-training with mini-batch, and training model with real data during the synthesis process are applied. Experimental results demonstrate that our method significantly improves distribution matching, achieving nearly equal testing accuracy with reduced learning time compared to the recent state-of-the-art approach of gradient matching.';
    const pdfExpected = 'https://ieeexplore.ieee.org/iel7/10258128/10258147/10258130.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('https://ieeexplore.ieee.org/document/10258130');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using iscaSpeechOrgRule rule (isca-archive.org)',async function (){
    const abstractExpected = 'In this paper, we describe a system for recording of mood di aries in the context of an ambient assisted living and intelli gent coaching environment, which ensures privacy by design. The system performs affect recognition in speech features with out recording speech content in any form. We demonstrate re sults of affect recognition models tested on data collected in care-home settings during the SAAM project (Supporting Ac tive Ageing through Multimodal Coaching) using our custom designed audio collection hardware. The proposed system was trained using Bulgarian speech augmented with training data obtained from comparable mood diaries recorded in Scottish English. A degree of transfer learning of Scottish English speech to Bulgarian speech was demonstrated.';
    const pdfExpected = 'https://www.isca-archive.org/interspeech_2022/haider22_interspeech.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('https://www.isca-speech.org/archive/interspeech_2022/haider22_interspeech.html'); // redirect to isca-archive.org
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using lrecConfOrgRule rule (lrec-conf.org)',async function (){
    const abstractExpected = 'In order to help improve the quality, coverage and performance of automated translation solutions in the context of current and future Connecting Europe Facility (CEF) digital services, the European Language Resource Coordination (ELRC) consortium was set up through a service contract operating under the European Commission’s CEF SMART 2014/1074 programme to initiate a number of actions to support the collection of Language Resources (LRs) within the public sector. The first action consisted in raising awareness in the public sector through the organisation of dedicated events: 2 conferences and 29 country-specific workshops to meet with national or regional/municipal governmental organisations, language competence centres, relevant European institutions and other potential holders of LRs from the public service administrations. In order to gather resources shared by the contributors, the ELRC-SHARE Repository was built up together with services to support the sharing of LRs, such as the ELRC Helpdesk and Intellectual property Rights (IPR) clearance support. All collected LRs should pass a validation process whose guidelines were developed within the project. The collected LRs cover all official EU languages, plus Icelandic and Norwegian.';
    const pdfExpected = 'http://www.lrec-conf.org/proceedings/lrec2018/pdf/1119.pdf';
    const {abstract, pdf} = await Tools.extractAbstract('http://www.lrec-conf.org/proceedings/lrec2018/summaries/1119.html');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract using scienceDirect rule',async function (){
    const abstractExpected = 'With the increasing use of research paper search engines, such as CiteSeer, for both literature search and hiring decisions, the accuracy of such systems is of paramount importance. This article employs conditional random fields (CRFs) for the task of extracting various common fields from the headers and citation of research papers. CRFs provide a principled way for incorporating various local features, external lexicon features and globle layout features. The basic theory of CRFs is becoming well-understood, but best-practices for applying them to real-world data requires additional exploration. We make an empirical exploration of several factors, including variations on Gaussian, Laplace and hyperbolic-L1 priors for improved regularization, and several classes of features. Based on CRFs, we further present a novel approach for constraint co-reference information extraction; i.e., improving extraction performance given that we know some citations refer to the same publication. On a standard benchmark dataset, we achieve new state-of-the-art performance, reducing error in average F1 by 36%, and word error rate by 78% in comparison with the previous best SVM results. Accuracy compares even more favorably against HMMs. On four co-reference IE datasets, our system significantly improves extraction performance, with an error rate reduction of 6–14%.';
    const {abstract} = await Tools.extractAbstract('https://www.sciencedirect.com/science/article/pii/S0306457305001172');
    assert.equal(abstract,abstractExpected);
  });
});
