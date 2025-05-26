const fs = require("fs");
const https = require("https");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const url = "https://www.palvelusivusto.fi/ih/palvelusivusto/playertransfers/";

/**
 * Fetches player transfers from the Finnish Ice Hockey Federation website and saves to JSON file
 * @param {string} outputFile - Path to the output JSON file
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

// Execute the function when the script is run directly
if (require.main === module) {
  fetchTransfers()
    .then(transfers => {
      fs.writeFileSync("transfers.json", JSON.stringify(transfers, null, 2));
      console.log(`Saved ${transfers.length} transfers to transfers.json`);
    })
    .catch(err => {
      console.error("Failed to fetch and save transfers:", err);
    });
}

// Export the function for use in other scripts
module.exports = {
  fetchTransfers,
};
