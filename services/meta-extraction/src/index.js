import express from 'express';
import bodyParser from 'body-parser';
import { extractAbstract } from '@openreview/meta-extraction';

// Create an Express application
const app = express();

// Middleware setup
app.use(bodyParser.json());

// Define routes
app.get('/metadata', async (req, res) => {
  if (!req.query.url) {
    return res.status(400).json({
      name: 'ValidationError',
      message: 'URL is required',
      status: 400
    });
  }
  const { abstract, pdf, error } = await extractAbstract(req.query.url, !!req.query.skipTidy);
  if (error) {
    return res.status(400).json({
      name: 'ExtractionError',
      message: error,
      status: 400
    });
  } else {
    return res.status(200).json({ abstract, pdf });
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
