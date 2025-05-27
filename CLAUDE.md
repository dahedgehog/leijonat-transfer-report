# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Running the Application

- **Start the server**: `npm start` or `node server.js`
- **Start the server with file watching**: `npm run dev` (auto-restart on code changes)
- **Fetch player transfers**: `node save-transfers.js`
- **Enrich transfer data**: `node enrich-transfers.js`
- **Analyze transfer data**: `node analyze-transfers.js`
- **Generate HTML report**: `node visualize-transfers.js`

### Data Pipeline

To process player transfers completely, run these commands in sequence:
```
node save-transfers.js
node enrich-transfers.js
node analyze-transfers.js
node visualize-transfers.js
npm start
```

## Architecture

This is a hockey player transfer tracking application with a data pipeline architecture:

1. **Data Collection** (`save-transfers.js`):
   - Scrapes player transfer data from the Finnish Ice Hockey Federation website
   - Parses HTML tables with JSDOM
   - Saves raw transfer data to `transfers-YEAR-MONTH.json`

2. **Data Enrichment** (`enrich-transfers.js`):
   - Enhances transfer data with additional player information
   - Maps official club names to short names/abbreviations
   - Fetches player birth years and player IDs from an external API
   - Uses batch processing to handle rate limiting
   - Saves enriched data to `enriched-transfers-YEAR.json`

3. **Data Analysis** (`analyze-transfers.js`):
   - Processes enriched transfer data to generate insights
   - Analyzes transfers by birth year, club activity, and date
   - Calculates net transfer statistics for clubs
   - Saves analysis results to `transfer-analysis-YEAR.json`

4. **Visualization** (`visualize-transfers.js`):
   - Generates an interactive HTML report with Chart.js
   - Creates time-series charts of transfer activity
   - Displays club transfer statistics and player details
   - Provides sortable tables for data exploration
   - Saves report to `transfers-report-YEAR.html`

5. **Web Server** (`server.js`):
   - Serves the generated HTML report via Express
   - Dynamically regenerates the report on each request
   - Makes the visualization accessible through a web browser

## Data Files

- `transfers-YEAR-MONTH.json`: Raw transfer data scraped from the website
- `enriched-transfers-YEAR.json`: Transfer data enriched with player birth years and player IDs
- `transfer-analysis-YEAR.json`: Analysis results and statistics
- `transfers-report-YEAR.html`: Generated HTML visualization

## API Integration

The application interacts with two external APIs:

1. **Finnish Ice Hockey Federation Transfers API** (`save-transfers.js`):
   - Source URL: `https://www.palvelusivusto.fi/ih/palvelusivusto/playertransfers/`
   - Provides raw transfer data in HTML format

2. **Player Information API** (`enrich-transfers.js`):
   - Endpoint: `https://www.leijonat.fi/modules/mod_searchplayersstats/helper/searchplayers.php`
   - Used to fetch player birth years and other metadata
   - Implements rate limiting to avoid overloading the API

## Development Notes

- The application uses Express.js for the web server component
- JSDOM is used for HTML parsing and data extraction
- Data transformations maintain the original structure while adding enriched fields
- The visualization is built with pure HTML/CSS/JS and Chart.js for interactive charts
- The application follows a modular design with each script handling a specific pipeline stage
- File watching is implemented with Nodemon for automatic server restarts during development
- The server clears module cache for the visualization module to ensure fresh data on each request