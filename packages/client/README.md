# OpenReview Node.js Client

A JavaScript client for the OpenReview API. This client provides methods for communicating with the OpenReview server, including authentication, CRUD (create, read, update, delete) operations on notes, profiles, groups, invitations, edges, and messages, and profiles.

## Running Tests Locally

To run the tests locally, you'll need to set up the following prerequisites:

### Prerequisites

1. Node.js (versions 20.x or 22.x)
2. Redis (v7.x)
3. MongoDB (v8.0) with replica set
4. Elasticsearch (v7.6.0)
5. Python (for openreview-py)

### Setup Instructions

1. **Start MongoDB with replica set**
   ```bash
   mongod --replSet rs0 --dbpath <your_db_path>
    ```

   **Start the MongoDB shell and initiate the replica set**
   ```bash
   mongo --eval 'rs.initiate()'
   ```
2. **Start Redis**
3. **Start Elasticsearch**
4. **Clone openreview-py**
   ```bash
   git clone https://github.com/openreview/openreview-py.git
   cd openreview-py
   pip install -e .
   cd ..
   ```
5. **Clone openreview-api**
   ```bash
    git clone https://github.com/openreview/openreview-api.git
    cd openreview-api
    mkdir -p logs files/attachments files/pdfs files/temp
    npm ci
    npm run cleanStartJS &
    cd ..
    ```
6. **Run the Tests**
    ```bash
    npm run test
    ```