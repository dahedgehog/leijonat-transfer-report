const fs = require("fs");
const https = require("https");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const url = "https://www.palvelusivusto.fi/ih/palvelusivusto/playertransfers/";
const file = "transfers.html";

/**
 * Read player tarsfers from HTML file saved from the Finnish Ice Hockey Federation website
 * @returns {Promise<Array>} - Promise resolving to array of transfers
 */
function readTransfersFromFile() {
  return new Promise((resolve, reject) => {
    fs.readFile(file, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err.message);
        reject(err);
        return;
      }
      try {
        const transfers = processTransfers(data);
        resolve(transfers);
      } catch (err) {
        console.error("Error processing file data:", err.message);
        reject(err);
      }
    });
  });
}

/**
 * Fetches player transfers from the Finnish Ice Hockey Federation website.
 * @returns {Promise<Array>} - Promise resolving to array of transfers
 */
function fetchTransfers() {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const transfers = processTransfers(data);
          resolve(transfers);
        } catch (err) {
          console.error("Error processing data:", err.message);
          reject(err);
        }
      });
    })
    .on("error", err => {
      console.error("Error fetching data:", err.message);
      reject(err);
    });
  });
}

/**
 * Processes the HTML data to extract player transfers
 * @param {string} data - HTML content of the page
 * @returns {Array} - Array of player transfers
 * @throws {Error} - If no table is found in the HTML
 */
function processTransfers(data) {
  const dom = new JSDOM(data);
  const document = dom.window.document;
  const table = document.querySelector("table");

  if (!table) {
    const error = new Error("No table found on the page");
    console.log(error.message);
    reject(error);
    return;
  }

  const rows = table.querySelectorAll("tr");
  const transfers = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll("td");
    if (cells.length >= 8) {
      transfers.push({
        id: cells[0].textContent.trim(),
        date: cells[1].textContent.trim(),
        player: cells[2].textContent.trim(),
        birthDate: cells[3].textContent.trim(),
        oldClub: cells[4].textContent.trim(),
        newClub: cells[5].textContent.trim(),
        transferType: cells[6].textContent.trim(),
        restrictionDate: cells[7].textContent.trim(),
      });
    }
  }

  return transfers;
}

// Execute the function when the script is run directly
if (require.main === module) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const filename = `transfers-${currentYear}-${currentMonth}.json`;
  
  fetchTransfers()
    .then(transfers => {
      fs.writeFileSync(filename, JSON.stringify(transfers, null, 2));
      console.log(`Saved ${transfers.length} transfers to ${filename}`);
    })
    .catch(err => {
      console.error("Failed to fetch and save transfers:", err);
    });
}

// Export the function for use in other scripts
module.exports = {
  readTransfersFromFile,
  fetchTransfers,
};
