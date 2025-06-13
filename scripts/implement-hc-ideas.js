import fs from 'fs';
import csv from 'csv-parser';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function implementHCIdeas() {
  console.log('Implementing High Conviction Ideas...');
  
  const hcData = [];
  
  // Read the HC Ideas CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream('../attached_assets/20250519_HC Ideas Constituents.xlsx - Components_1749786622907.csv')
      .pipe(csv())
      .on('data', (row) => {
        if (row.Ticker && row.Name) {
          const indexWeight = row['Index Weight in HC Ideas']?.trim() ? parseFloat(row['Index Weight in HC Ideas'].replace('%', '')) : null;
          const securityWeightInIndex = row['Security Weight in Index']?.trim() ? parseFloat(row['Security Weight in Index'].replace('%', '')) : null;
          const securityWeightInHC = row['Security Weight in 13D Highest Conviction Portfolio']?.trim() ? parseFloat(row['Security Weight in 13D Highest Conviction Portfolio'].replace('%', '')) : null;
          
          hcData.push({
            ticker: row.Ticker.trim(),
            name: row.Name.trim(),
            index: row['13D Theme / Index']?.trim() || 'Unknown',
            indexWeight,
            securityWeightInIndex,
            securityWeightInHC
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Collected ${hcData.length} high conviction securities`);

  // Add new columns to portfolio_constituents table if they don't exist
  try {
    await pool.query(`
      ALTER TABLE portfolio_constituents 
      ADD COLUMN IF NOT EXISTS index_weight_in_hc numeric,
      ADD COLUMN IF NOT EXISTS weight_in_hc_portfolio numeric
    `);
    console.log('Added HC portfolio columns to database');
  } catch (error) {
    console.log('HC columns already exist or error adding:', error.message);
  }

  // Update existing portfolio constituents with HC data
  let updated = 0;
  let notFound = 0;
  
  for (const hcItem of hcData) {
    try {
      const result = await pool.query(`
        UPDATE portfolio_constituents 
        SET 
          is_high_conviction = true,
          index_weight_in_hc = $1,
          weight_in_hc_portfolio = $2
        WHERE ticker = $3
      `, [
        hcItem.indexWeight,
        hcItem.securityWeightInHC,
        hcItem.ticker
      ]);

      if (result.rowCount > 0) {
        updated++;
      } else {
        // Insert new HC security if not found in portfolio
        await pool.query(`
          INSERT INTO portfolio_constituents 
          (ticker, name, index, weight_in_index, is_high_conviction, index_weight_in_hc, weight_in_hc_portfolio, created_at)
          VALUES ($1, $2, $3, $4, true, $5, $6, NOW())
        `, [
          hcItem.ticker,
          hcItem.name,
          hcItem.index,
          hcItem.securityWeightInIndex,
          hcItem.indexWeight,
          hcItem.securityWeightInHC
        ]);
        console.log(`Inserted new HC security: ${hcItem.ticker}`);
      }
    } catch (error) {
      console.error(`Error processing ${hcItem.ticker}:`, error.message);
      notFound++;
    }
  }

  console.log(`Updated ${updated} existing securities with HC data`);
  console.log(`${notFound} securities had processing issues`);

  // Show final HC statistics
  const hcStats = await pool.query(`
    SELECT 
      COUNT(*) as total_hc,
      ROUND(SUM(weight_in_hc_portfolio), 2) as total_hc_weight,
      COUNT(DISTINCT index) as hc_indexes
    FROM portfolio_constituents 
    WHERE is_high_conviction = true
  `);

  console.log('\nHigh Conviction Portfolio Summary:');
  console.log(`- Total HC securities: ${hcStats.rows[0].total_hc}`);
  console.log(`- Total HC portfolio weight: ${hcStats.rows[0].total_hc_weight}%`);
  console.log(`- HC indexes: ${hcStats.rows[0].hc_indexes}`);

  // Show breakdown by HC index
  const indexBreakdown = await pool.query(`
    SELECT 
      index,
      COUNT(*) as securities,
      ROUND(AVG(index_weight_in_hc), 2) as avg_index_weight,
      ROUND(SUM(weight_in_hc_portfolio), 2) as total_portfolio_weight
    FROM portfolio_constituents 
    WHERE is_high_conviction = true AND index_weight_in_hc IS NOT NULL
    GROUP BY index
    ORDER BY total_portfolio_weight DESC
  `);

  console.log('\nHC Breakdown by Index:');
  indexBreakdown.rows.forEach(row => {
    console.log(`- ${row.index}: ${row.securities} securities, ${row.avg_index_weight}% index weight, ${row.total_portfolio_weight}% portfolio weight`);
  });

  await pool.end();
}

implementHCIdeas().catch(console.error);