//
// Placeholder file for future OpenReview API client
//
class OpenReviewClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://openreview.net';
  }
};

const openreview = new OpenReviewClient();
module.exports = { openreview, OpenReviewClient }
