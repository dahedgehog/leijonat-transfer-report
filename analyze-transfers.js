const fs = require('fs');

// Get current year for filenames
const currentYear = new Date().getFullYear();
const enrichedFilename = `enriched-transfers-${currentYear}.json`;

console.log(`Using year-specific enriched transfers file: ${enrichedFilename}`);
const transfers = JSON.parse(fs.readFileSync(enrichedFilename, 'utf8'));

function analyzeTransfers() {
  
  const transfersByYear = {};

  transfers.forEach(transfer => {
    transfersByYear[transfer.birthYear] = (transfersByYear[transfer.birthYear] || 0) + 1;
  });
  
  const years = Object.keys(transfersByYear).sort();
  const totalTransfers = transfers.length;
  
  console.log('\nPelaajasiirrot pelaajan syntymävuoden mukaan:');
  years.forEach(year => {
    const count = transfersByYear[year];
    const percentage = (count / totalTransfers * 100).toFixed(1);
    console.log(`${year}: ${count} pelaajaa (${percentage}%)`);
  });
  
  const clubTransfers = {};

  transfers.forEach(transfer => {
    if (!clubTransfers[transfer.oldClub]) {
      clubTransfers[transfer.oldClub] = { incoming: 0, outgoing: 0 };
    }
    if (!clubTransfers[transfer.newClub]) {
      clubTransfers[transfer.newClub] = { incoming: 0, outgoing: 0 };
    }
    clubTransfers[transfer.oldClub].outgoing++;
    clubTransfers[transfer.newClub].incoming++;
  });
  
  const clubsWithActivity = Object.keys(clubTransfers).map(club => ({
    name: club,
    incoming: clubTransfers[club].incoming,
    outgoing: clubTransfers[club].outgoing,
    total: clubTransfers[club].incoming + clubTransfers[club].outgoing,
    net: clubTransfers[club].incoming - clubTransfers[club].outgoing
  }))
  .sort((a, b) => b.total - a.total || b.incoming - a.incoming);
  
  console.log('\nTop 10 siirroissa aktiivisinta seuraa:');
  clubsWithActivity.slice(0, 10).forEach(club => {
    console.log(`${club.name}: ${club.incoming} sisään, ${club.outgoing} ulos (netto: ${club.net > 0 ? '+' : ''}${club.net})`);
  });
  
  const transfersByDate = {};
  transfers.sort((a, b) => (a.date < b.date) ? -1 : (a.date > b.date) ? 1 : 0);
  transfers.forEach(transfer => {
    transfersByDate[transfer.date] = (transfersByDate[transfer.date] || 0) + 1;
  });
  
  const dates = Object.keys(transfersByDate).sort();
  
  console.log('\nPelaajasiirrot päivämäärän mukaan:');
  dates.forEach(date => {
    console.log(`${date}: ${transfersByDate[date]} pelaajaa`);
  });
  
  return {
    totalTransfers,
    transfersByYear,
    clubsWithActivity,
    transfersByDate
  };
}

const analysis = analyzeTransfers();

const outputFilename = `transfer-analysis-${currentYear}.json`;
fs.writeFileSync(outputFilename, JSON.stringify(analysis, null, 2));
console.log(`\nAnalysis saved to ${outputFilename}`);