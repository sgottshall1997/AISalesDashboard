import fs from 'fs';
import csv from 'csv-parser';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function loadAllConstituents() {
  console.log('Loading all 418 portfolio constituents...');
  
  // Clear existing data
  await pool.query('DELETE FROM portfolio_constituents');
  
  const constituents = [];
  
  // Read the complete CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream('../attached_assets/20250514_All 13D Index Constituents.xlsx - Sheet1_1749786057214.csv')
      .pipe(csv())
      .on('data', (row) => {
        if (row.Ticker && row.Name && row['13D Index / Theme']) {
          const weightStr = row.Weight ? row.Weight.replace('%', '') : '0';
          const weight = parseFloat(weightStr) || 0;
          
          constituents.push({
            ticker: row.Ticker.trim(),
            name: row.Name.trim(),
            index: row['13D Index / Theme'].trim(),
            weight: weight,
            rebalance: row['Latest Rebalance']?.trim() || null
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Parsed ${constituents.length} constituents from CSV`);

  // Insert in batches
  let inserted = 0;
  for (const constituent of constituents) {
    try {
      await pool.query(`
        INSERT INTO portfolio_constituents 
        (ticker, name, index, weight_in_index, is_high_conviction, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        constituent.ticker,
        constituent.name,
        constituent.index,
        constituent.weight,
        false
      ]);
      inserted++;
    } catch (error) {
      console.error(`Error inserting ${constituent.ticker}:`, error.message);
    }
  }

  console.log(`Successfully inserted ${inserted} constituents`);

  // Mark high conviction stocks
  const hcStocks = ['600019.SS']; // Add known HC tickers here
  for (const ticker of hcStocks) {
    await pool.query(`
      UPDATE portfolio_constituents 
      SET is_high_conviction = true 
      WHERE ticker = $1
    `, [ticker]);
  }

  // Show final stats
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_high_conviction = true) as hc_count,
      COUNT(DISTINCT index) as unique_indexes
    FROM portfolio_constituents
  `);

  console.log(`Final stats: ${result.rows[0].total} total, ${result.rows[0].hc_count} HC, ${result.rows[0].unique_indexes} indexes`);

  await pool.end();
}

loadAllConstituents().catch(console.error);