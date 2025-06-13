import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updatePortfolioConstituents() {
  try {
    console.log('Starting portfolio constituents update...');

    // Clear existing data
    await pool.query('DELETE FROM portfolio_constituents');
    console.log('Cleared existing portfolio constituents');

    // Process 13D Index Constituents CSV
    const allConstituentsPath = '../attached_assets/20250514_All 13D Index Constituents.xlsx - Sheet1_1749785607919.csv';
    const hcIdeasPath = '../attached_assets/20250519_HC Ideas Constituents.xlsx - Components_1749785613691.csv';

    const constituents = new Map(); // Use Map to avoid duplicates
    
    // Read All 13D Index Constituents
    console.log('Processing All 13D Index Constituents...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(allConstituentsPath)
        .pipe(csv())
        .on('data', (row) => {
          // Skip empty rows or header rows
          if (!row['Ticker'] || !row['Name'] || row['Ticker'] === 'Ticker') {
            return;
          }

          const ticker = row['Ticker'].trim();
          const name = row['Name'].trim();
          const index = row['13D Index / Theme']?.trim() || 'Unknown';
          const weight = row['Weight']?.trim() ? parseFloat(row['Weight'].replace('%', '')) : null;
          const rebalanceDate = row['Latest Rebalance']?.trim() || null;

          if (ticker && name) {
            const key = `${ticker}|${index}`;
            constituents.set(key, {
              ticker,
              name,
              index,
              weightInIndex: weight,
              rebalanceDate,
              isHighConviction: false, // Will be updated from HC Ideas
              weightInHighConviction: null
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Processed ${constituents.size} constituents from All 13D Index`);

    // Read HC Ideas Constituents to mark high conviction holdings
    console.log('Processing HC Ideas Constituents...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(hcIdeasPath)
        .pipe(csv())
        .on('data', (row) => {
          // Skip empty rows or header rows
          if (!row['Ticker'] || !row['Name'] || row['Ticker'] === 'Ticker') {
            return;
          }

          const ticker = row['Ticker'].trim();
          const name = row['Name'].trim();
          const index = row['13D Theme / Index']?.trim() || 'Unknown';
          const weightInHC = row['Security Weight in 13D Highest Conviction Portfolio']?.trim() ? parseFloat(row['Security Weight in 13D Highest Conviction Portfolio'].replace('%', '')) : null;
          const weightInIndex = row['Security Weight in Index']?.trim() ? parseFloat(row['Security Weight in Index'].replace('%', '')) : null;

          if (ticker && name) {
            const key = `${ticker}|${index}`;
            
            // Check if this constituent exists, if not add it
            if (!constituents.has(key)) {
              constituents.set(key, {
                ticker,
                name,
                index,
                weightInIndex,
                rebalanceDate: null,
                isHighConviction: true,
                weightInHighConviction: weightInHC
              });
            } else {
              // Update existing constituent with HC data
              const existing = constituents.get(key);
              existing.isHighConviction = true;
              existing.weightInHighConviction = weightInHC;
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Updated ${constituents.size} total constituents with HC data`);

    // Insert all constituents into database
    let insertCount = 0;
    for (const constituent of constituents.values()) {
      try {
        await pool.query(`
          INSERT INTO portfolio_constituents 
          (ticker, name, index, is_high_conviction, weight_in_index, weight_in_high_conviction, rebalance_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          constituent.ticker,
          constituent.name,
          constituent.index,
          constituent.isHighConviction,
          constituent.weightInIndex,
          constituent.weightInHighConviction,
          constituent.rebalanceDate ? new Date(constituent.rebalanceDate) : null
        ]);
        insertCount++;
      } catch (error) {
        console.error(`Error inserting ${constituent.ticker}:`, error.message);
      }
    }

    console.log(`Successfully inserted ${insertCount} portfolio constituents`);

    // Show summary statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_high_conviction = true) as high_conviction,
        COUNT(DISTINCT index) as unique_indexes
      FROM portfolio_constituents
    `);

    console.log('Portfolio Constituents Summary:');
    console.log(`- Total constituents: ${stats.rows[0].total}`);
    console.log(`- High conviction holdings: ${stats.rows[0].high_conviction}`);
    console.log(`- Unique indexes/themes: ${stats.rows[0].unique_indexes}`);

    // Show breakdown by index
    const indexBreakdown = await pool.query(`
      SELECT 
        index,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_high_conviction = true) as hc_count
      FROM portfolio_constituents
      GROUP BY index
      ORDER BY count DESC
    `);

    console.log('\nBreakdown by Index/Theme:');
    indexBreakdown.rows.forEach(row => {
      console.log(`- ${row.index}: ${row.count} holdings (${row.hc_count} HC)`);
    });

  } catch (error) {
    console.error('Error updating portfolio constituents:', error);
  } finally {
    await pool.end();
  }
}

updatePortfolioConstituents();