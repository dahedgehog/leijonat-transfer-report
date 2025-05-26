const fs = require("fs");
const https = require("https");
const querystring = require("querystring");
const teamNameMap = require("./team-name-map");

const transfers = JSON.parse(fs.readFileSync("transfers.json", "utf8"));
const existingEnrichedTransfers = fs.existsSync("enriched-transfers.json")
  ? JSON.parse(fs.readFileSync("enriched-transfers.json", "utf8")) : [];

// Function to fetch player data using the API
async function fetchPlayerData(playerName, newClub) {
  return new Promise((resolve, reject) => {
    const baseData = { schtms: "", schass: "", initial: "", level: "", pid: "0", index: "0" };
    const postData = querystring.stringify({ ...baseData, schplrs: playerName });
    const options = {
      hostname: "www.leijonat.fi",
      path: "/modules/mod_searchplayersstats/helper/searchplayers.php",
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referrer": "https://www.leijonat.fi/index.php/pelaajat",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);

          if (response.players && response.players.length > 0) {
            const normalizedNewClub = teamNameMap[newClub] || newClub;
            const clubNames = Array.isArray(normalizedNewClub) ? normalizedNewClub : [normalizedNewClub];

            if (response.players.length > 1) {
              // Try to match by club
              const clubMatches = response.players.filter(p => p.Association && clubNames.some(clubName => p.Association.includes(clubName)));
              if (clubMatches.length === 1 || (clubMatches.length > 1 &&
                  clubMatches.every(p => p.DateOfBirth && p.DateOfBirth === clubMatches[0].DateOfBirth))) {
                const dob = clubMatches[0].DateOfBirth;
                resolve({
                  birthYear: dob ? new Date(dob).getFullYear() : null,
                  playerId: clubMatches[0].PersonID,
                });
                return;
              }

              // Try to match by name
              const nameMatches = response.players.filter(p => `${p.LastName} ${p.FirstName}`.toLowerCase() === playerName.toLowerCase());
              if (nameMatches.length === 1 || (nameMatches.length > 1 &&
                  nameMatches.every(p => p.DateOfBirth && p.DateOfBirth === nameMatches[0].DateOfBirth))
              ) {
                const dob = nameMatches[0].DateOfBirth;
                resolve({
                  birthYear: dob ? new Date(dob).getFullYear() : null,
                  playerId: nameMatches[0].PersonID,
                });
                return;
              }

              // If all players have the same birth date, use that
              if (response.players.every(p => p.DateOfBirth && p.DateOfBirth === response.players[0].DateOfBirth)) {
                resolve({
                  birthYear: new Date(response.players[0].DateOfBirth).getFullYear(),
                  playerId: response.players[0].PersonID,
                });
                return;
              }

              console.log(`No match found for ${playerName}`);
              resolve({ birthYear: null, playerId: null });
            } else {
              // Only one player found
              const dob = response.players[0].DateOfBirth;
              resolve({
                birthYear: dob ? new Date(dob).getFullYear() : null,
                playerId: response.players[0].PersonID,
              });
            }
          } else {
            resolve({ birthYear: null, playerId: null });
          }
        } catch (err) {
          console.error("Error parsing response:", err);
          resolve({ birthYear: null, playerId: null });
        }
      });
    });

    req.on("error", err => {
      console.error(`Problem with request: ${err.message}`);
      resolve({ birthYear: null, playerId: null });
    });

    req.write(postData);
    req.end();
  });
}

// Process transfers in batches to avoid too many concurrent requests
async function processTransfers() {
  const existingTransfersMap = existingEnrichedTransfers.reduce((carry, transfer) => {
    return { ...carry, [transfer.id]: transfer };
  }, {});

  const transfersToEnrich = transfers.filter(transfer => {
    return (
      !existingTransfersMap[transfer.id] ||
      !existingTransfersMap[transfer.id].playerId ||
      !existingTransfersMap[transfer.id].birthYear
    );
  });

  const newlyEnrichedTransfers = [];
  const batchSize = 5;

  if (transfersToEnrich.length === 0) {
    console.log("No transfers need enrichment. All data is up to date.");
    return existingEnrichedTransfers;
  }

  console.log(
    `Processing ${transfersToEnrich.length} players (out of ${transfers.length} total) in batches of ${batchSize}`
  );

  for (let i = 0; i < transfersToEnrich.length; i += batchSize) {
    const batch = transfersToEnrich.slice(i, i + batchSize);
    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
        transfersToEnrich.length / batchSize
      )}`
    );

    const results = await Promise.all(
      batch.map(async transfer => {
        const { playerId, birthYear } = await fetchPlayerData(transfer.player, transfer.newClub);
        return { ...transfer, playerId, birthYear };
      })
    );
    newlyEnrichedTransfers.push(...results);

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Merge newly enriched transfers with existing ones
  const updatedTransfers = [...existingEnrichedTransfers];

  // Update existing transfers or add new ones
  for (const newTransfer of newlyEnrichedTransfers) {
    const existingIndex = updatedTransfers.findIndex(t => t.id === newTransfer.id);
    if (existingIndex >= 0) {
      updatedTransfers[existingIndex] = newTransfer;
    } else {
      updatedTransfers.push(newTransfer);
    }
  }

  return { updatedTransfers, newlyEnrichedTransfers };
}

// Process and save enriched data
processTransfers()
  .then(({ updatedTransfers, newlyEnrichedTransfers }) => {
    // Sort the transfers by date (oldest first) before saving
    const sortedTransfers = updatedTransfers.sort((a, b) => {
      return new Date(a.date.split(".").reverse().join("-")) - new Date(b.date.split(".").reverse().join("-"));
    });
    fs.writeFileSync("enriched-transfers.json", JSON.stringify(sortedTransfers, null, 2));

    // Calculate how many transfers were newly processed
    console.log(`Finished enriching transfers data with player information.
       - Processed ${newlyEnrichedTransfers.length} new or incomplete player transfers.`);

    // Print summary statistics
    const playersWithId = sortedTransfers.filter(t => t.playerId !== null).length;
    const playersWithDob = sortedTransfers.filter(t => t.birthYear !== null).length;

    const idPct = Math.round((playersWithId / sortedTransfers.length) * 100);
    const dobPct = Math.round((playersWithDob / sortedTransfers.length) * 100);

    console.log(
      `Transfers with player IDs: ${playersWithId} out of ${sortedTransfers.length} players (${idPct}%)`
    );
    console.log(
      `Transfers with birth years: ${playersWithDob} out of ${sortedTransfers.length} players (${dobPct}%)`
    );
  })
  .catch(err => {
    console.error("Error processing transfers:", err);
  });
