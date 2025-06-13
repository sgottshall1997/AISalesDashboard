import fs from 'fs';
import csv from 'csv-parser';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function bulkLoadPortfolio() {
  console.log('Starting bulk portfolio load...');
  
  // Clear existing data
  await pool.query('DELETE FROM portfolio_constituents');
  console.log('Cleared existing portfolio_constituents');
  
  const constituents = [];
  
  // Read CSV and collect all data
  await new Promise((resolve, reject) => {
    fs.createReadStream('../attached_assets/20250514_All 13D Index Constituents.xlsx - Sheet1_1749786057214.csv')
      .pipe(csv())
      .on('data', (row) => {
        if (row.Ticker && row.Name && row['13D Index / Theme']) {
          const weightStr = row.Weight ? row.Weight.replace('%', '') : '0';
          const weight = parseFloat(weightStr) || 0;
          
          constituents.push([
            row.Ticker.trim(),
            row.Name.trim(),
            row['13D Index / Theme'].trim(),
            weight,
            false,
            new Date()
          ]);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Collected ${constituents.length} constituents`);

  // Bulk insert using COPY command for speed
  if (constituents.length > 0) {
    const placeholders = constituents.map((_, i) => {
      const base = i * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    }).join(', ');
    
    const values = constituents.flat();
    
    await pool.query(`
      INSERT INTO portfolio_constituents 
      (ticker, name, index, weight_in_index, is_high_conviction, created_at)
      VALUES ${placeholders}
    `, values);
    
    console.log(`Bulk inserted ${constituents.length} constituents`);
  }

  // Verify final count
  const result = await pool.query('SELECT COUNT(*) as count FROM portfolio_constituents');
  console.log(`Final count: ${result.rows[0].count} portfolio constituents loaded`);

  await pool.end();
}

bulkLoadPortfolio().catch(console.error);