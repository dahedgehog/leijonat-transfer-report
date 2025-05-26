const { generateHtmlReport } = require('./visualize-transfers');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Serve the transfers report at the root route
app.get('/', (req, res) => {
  // Generate the HTML content dynamically with fresh data
  const htmlContent = generateHtmlReport();
  
  // Send the generated HTML directly as the response
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port} (started at ${new Date().toISOString()})`);
  
  // Log information about running with file watching
  if (process.env.npm_lifecycle_event === 'dev') {
    console.log('Running in development mode with file watching enabled');
    console.log('The server will automatically restart when JavaScript files change');
  }
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});