const fs = require('fs');

// Read the enriched transfers data and analysis
const transfers = JSON.parse(fs.readFileSync('enriched-transfers.json', 'utf8'));
const analysis = JSON.parse(fs.readFileSync('transfer-analysis.json', 'utf8'));

function fillMissingDates(transfersByDate) {
  if (Object.keys(transfersByDate).length === 0) return [];
  const sortedDates = Object.keys(transfersByDate).sort();
  
  const startParts = sortedDates[0].split('.');
  const endParts = sortedDates[sortedDates.length - 1].split('.');
  
  const startDate = new Date(parseInt(startParts[2]), parseInt(startParts[1]) - 1, 1);
  const endDate = new Date(parseInt(endParts[2]), parseInt(endParts[1]) - 1, parseInt(endParts[0]));
  
  const allDates = {};
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    const formattedDate = `${day}.${month}.${year}`;
    allDates[formattedDate] = transfersByDate[formattedDate] || 0;
  }
  
  return allDates;
}

// Generate an HTML report with visualizations
function generateHtmlReport() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hockey Player Transfers Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .chart-container {
      position: relative;
      height: 400px;
      margin-bottom: 40px;
    }
    .report-section {
      margin-bottom: 40px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      cursor: pointer;
      position: relative;
      min-width: 60px;
    }
    th.sortable:after {
      content: " ↕";
      font-size: 12px;
      color: #999;
    }
    th.sortable.asc:after {
      content: " ↑";
      color: #333;
    }
    th.sortable.desc:after {
      content: " ↓";
      color: #333;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .positive {
      color: #27ae60;
    }
    .negative {
      color: #c0392b;
    }
    .filters-container {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
      border: 1px solid #ddd;
    }
    .filter-group {
      flex: 1;
      min-width: 200px;
    }
    .filter-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .filter-group input, .filter-group select {
      box-sizing: border-box;
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .filter-buttons {
      margin-top: 32px;
    }
    .filter-buttons button {
      padding: 8px 15px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .filter-buttons button.reset {
      background-color: #f44336;
    }
    .filter-buttons button:hover {
      opacity: 0.9;
    }
    .hidden {
      display: none;
    }
    
    /* Tab styles */
    .tabs {
      overflow: hidden;
      border: 1px solid #ccc;
      background-color: #f1f1f1;
      border-radius: 4px 4px 0 0;
    }
    
    .tabs button {
      background-color: inherit;
      cursor: pointer;
      float: left;
      border: none;
      outline: none;
      cursor: pointer;
      padding: 14px 16px;
      transition: 0.3s;
      font-size: 16px;
      font-weight: bold;
    }
    
    .tabs button:hover {
      background-color: #ddd;
    }
    
    .tabs button.active {
      background-color: #4CAF50;
      color: white;
    }
    
    .tab-content {
      display: none;
      padding: 20px;
      border: 1px solid #ccc;
      border-top: none;
      border-radius: 0 0 4px 4px;
    }
    
    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <h1>Jääkiekkoliiton pelajaasiirrot</h1>
  <p>Pelaajasiirrot yhteensä: ${analysis.totalTransfers} kpl</p>
  
  <!-- Tab navigation -->
  <div class="tabs">
    <button type="button" class="tab-button active" data-tab="tab-analytics">Tilastot</button>
    <button type="button" class="tab-button" data-tab="tab-transfers">Viimeisimmät pelaajasiirrot</button>
  </div>
  
  <!-- Tab 1: Analytics Content -->
  <div id="tab-analytics" class="tab-content active">
    <div class="report-section">
      <h2>Pelaajasiirrot päivämäärän mukaan</h2>
      <div class="chart-container">
        <canvas id="transfersByDateChart"></canvas>
      </div>
    </div>
    
    <div class="report-section">
      <h2>Top 10 pelaajasiirrot seuroittain</h2>
      <div class="chart-container">
        <canvas id="clubsChart"></canvas>
      </div>
      
      <h3>Yksityiskohtaiset siirtotiedot seuroittain</h3>
      <table>
        <thead>
          <tr>
            <th>Seura</th>
            <th>Sisään</th>
            <th>Ulos</th>
            <th>Yhteensä</th>
            <th>Netto</th>
          </tr>
        </thead>
        <tbody>
          ${analysis.clubsWithActivity.map(club => `
            <tr>
              <td>${club.name}</td>
              <td>${club.incoming}</td>
              <td>${club.outgoing}</td>
              <td>${club.total}</td>
              <td class="${club.net > 0 ? 'positive' : club.net < 0 ? 'negative' : ''}">${club.net > 0 ? '+' : ''}${club.net}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- Tab 2: Transfers Content -->
  <div id="tab-transfers" class="tab-content">
    <div class="report-section">
      <h2>Viimeisimmät pelaajasiirrot</h2>
      
      <div class="filters-container">
        <div class="filter-group">
          <label for="playerFilter">Pelaaja (nimi):</label>
          <input type="text" id="playerFilter" placeholder="Kirjoita pelaajan nimi...">
        </div>
        
        <div class="filter-group">
          <label for="birthYearFilter">Syntymävuosi:</label>
          <select id="birthYearFilter">
            <option value="">Kaikki vuodet</option>
            ${Array.from(new Set(transfers.map(t => t.birthYear).filter(year => year !== null)))
              .sort((a, b) => a - b)
              .map(year => `<option value="${year}">${year}</option>`)
              .join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="oldClubFilter">Entinen seura:</label>
          <select id="oldClubFilter">
            <option value="">Kaikki seurat</option>
            ${Array.from(new Set(transfers.map(t => t.oldClub)))
              .sort()
              .map(club => `<option value="${club}">${club}</option>`)
              .join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="newClubFilter">Uusi seura:</label>
          <select id="newClubFilter">
            <option value="">Kaikki seurat</option>
            ${Array.from(new Set(transfers.map(t => t.newClub)))
              .sort()
              .map(club => `<option value="${club}">${club}</option>`)
              .join('')}
          </select>
        </div>
        
        <div class="filter-buttons">
          <button type="button" id="resetFilters" class="reset">Tyhjennä</button>
        </div>
        
        <div style="flex-basis: 100%;">
          <span id="filterResultsCount">Näytetään pelaajia</span>
        </div>
      </div>
      
      <table id="transfersTable">
        <thead>
          <tr>
            <th class="sortable" data-sort="date">Pvm.</th>
            <th class="sortable" data-sort="player">Pelaaja</th>
            <th class="sortable" data-sort="birthYear">Synt.</th>
            <th class="sortable" data-sort="oldClub">Entinen seura</th>
            <th class="sortable" data-sort="newClub">Uusi seura</th>
          </tr>
        </thead>
        <tbody>
          ${transfers.map(t => `
            <tr>
              <td>${t.date}</td>
              <td>${t.player}</td>
              <td>${t.birthYear}</td>
              <td>${t.oldClub}</td>
              <td>${t.newClub}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Tab functionality
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');
      
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          // Remove active class from all buttons and contents
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          
          // Add active class to current button and corresponding content
          button.classList.add('active');
          const tabId = button.getAttribute('data-tab');
          document.getElementById(tabId).classList.add('active');
        });
      });
      
      // Initialize filter results count
      const totalRows = document.querySelectorAll('#transfersTable tbody tr').length;
      document.getElementById('filterResultsCount').textContent = "Näytetään " + totalRows + " / " + totalRows + " pelaajaa";
      
      const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;
      
      const comparer = (idx, asc) => (a, b) => {
        const v1 = getCellValue(asc ? a : b, idx);
        const v2 = getCellValue(asc ? b : a, idx);
        
        // Special handling for date values (in format DD.MM.YYYY)
        if (idx === 0) { // Date column
          // Convert DD.MM.YYYY to YYYY-MM-DD for proper comparison
          const parseDate = (dateStr) => {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
              return parts[2] + '-' + parts[1] + '-' + parts[0]; // YYYY-MM-DD
            }
            return dateStr;
          };
          return parseDate(v1).localeCompare(parseDate(v2));
        }
        
        return v1 === '' || v2 === '' || isNaN(v1) || isNaN(v2) ?
          v1.toString().localeCompare(v2) : parseInt(v1) - parseInt(v2);
      };
      
      // Sort table function
      document.querySelectorAll('#transfersTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const table = th.closest('table');
          const tbody = table.querySelector('tbody');
          
          // Get the current sort direction
          const isAsc = th.classList.contains('asc');
          const isDesc = th.classList.contains('desc');
          let direction = isAsc ? 'desc' : 'asc';
          
          // Remove all classes from all headers
          table.querySelectorAll('th').forEach(el => {
            el.classList.remove('asc', 'desc');
          });
          
          // Add class to the current header based on sort direction
          if (direction) {
            th.classList.add(direction);
          }
          
          // Sort the rows
          Array.from(tbody.querySelectorAll('tr:not(.hidden)'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), direction === 'asc'))
            .forEach(tr => tbody.appendChild(tr));
        });
      });
      
      // Filter functionality
      const filterTable = () => {
        const oldClubFilter = document.getElementById('oldClubFilter').value.toLowerCase();
        const newClubFilter = document.getElementById('newClubFilter').value.toLowerCase();
        const playerFilter = document.getElementById('playerFilter').value.toLowerCase();
        const birthYearFilter = document.getElementById('birthYearFilter').value;
        
        const table = document.getElementById('transfersTable');
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
          const player = row.cells[1].textContent.toLowerCase();
          const birthYear = row.cells[2].textContent;
          const oldClub = row.cells[3].textContent.toLowerCase();
          const newClub = row.cells[4].textContent.toLowerCase();
          
          // For birth year we do exact match, but for clubs and player we do partial match
          const birthYearMatch = !birthYearFilter || birthYear === birthYearFilter;
          const oldClubMatch = !oldClubFilter || oldClub.includes(oldClubFilter);
          const newClubMatch = !newClubFilter || newClub.includes(newClubFilter);
          const playerMatch = !playerFilter || player.includes(playerFilter);
          
          if (birthYearMatch && oldClubMatch && newClubMatch && playerMatch) {
            row.classList.remove('hidden');
          } else {
            row.classList.add('hidden');
          }
        });
        
        // Display count of visible rows
        const visibleRowCount = table.querySelectorAll('tbody tr:not(.hidden)').length;
        const totalRowCount = rows.length;
        document.getElementById('filterResultsCount').textContent = 
          "Näytetään " + visibleRowCount + " / " + totalRowCount + " pelaajaa";
      };
      
      // Add event listeners for interactive filtering
      document.getElementById('birthYearFilter').addEventListener('change', filterTable);
      document.getElementById('oldClubFilter').addEventListener('change', filterTable);
      document.getElementById('newClubFilter').addEventListener('change', filterTable);
      document.getElementById('playerFilter').addEventListener('keyup', filterTable);
      
      // Reset filters
      document.getElementById('resetFilters').addEventListener('click', () => {
        document.getElementById('birthYearFilter').value = '';
        document.getElementById('oldClubFilter').value = '';
        document.getElementById('newClubFilter').value = '';
        document.getElementById('playerFilter').value = '';
        
        // Remove hidden class from all rows
        const rows = document.querySelectorAll('#transfersTable tbody tr');
        rows.forEach(row => row.classList.remove('hidden'));
        
        document.getElementById('filterResultsCount').textContent = 
          "Näytetään " + rows.length + " / " + rows.length + " pelaajaa";
      });
    });

    const transfersByDate = ${JSON.stringify(fillMissingDates(analysis.transfersByDate))};

    new Chart(document.getElementById('transfersByDateChart'), {
      type: 'line',
      data: {
        labels: Object.keys(transfersByDate).sort(),
        datasets: [{
          label: 'Siirtojen lukumäärä',
          data: Object.keys(transfersByDate).sort().map(date => transfersByDate[date]),
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Siirtojen määrä'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Päivämäärä'
            }
          }
        }
      }
    });
    
    const topClubs = ${JSON.stringify(analysis.clubsWithActivity.slice(0, 10))};

    new Chart(document.getElementById('clubsChart'), {
      type: 'bar',
      data: {
        labels: topClubs.map(club => club.name),
        datasets: [
          {
            label: 'Sisään',
            data: topClubs.map(club => club.incoming),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1
          },
          {
            label: 'Ulos',
            data: topClubs.map(club => club.outgoing),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Siirtojen määrä'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Seura'
            }
          }
        }
      }
    });
  </script>
</body>
</html>
  `;
}

// Only generate and save the HTML report when run directly as a script
if (require.main === module) {
  const htmlReport = generateHtmlReport();
  fs.writeFileSync('transfers-report.html', htmlReport);
  console.log('HTML report generated: transfers-report.html');
}

// Export the function for use in server.js
module.exports = {
  generateHtmlReport
};