const fs = require('fs');
const { Pool } = require('@neondatabase/serverless');

async function updatePDFContent() {
  try {
    // Read the complete PDF content as text
    const pdfContent = fs.readFileSync('attached_assets/WILTW_2025-05-29_1749541261397.pdf', 'utf8');
    
    console.log('PDF content length:', pdfContent.length);
    console.log('Preview:', pdfContent.substring(0, 200));
    
    // Connect to database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Update the database with complete original content
    const result = await pool.query(
      'UPDATE content_reports SET full_content = $1 WHERE id = 12',
      [pdfContent]
    );
    
    console.log('Database updated successfully:', result.rowCount, 'rows affected');
    
    // Verify the update
    const verification = await pool.query(
      'SELECT id, title, LENGTH(full_content) as content_length FROM content_reports WHERE id = 12'
    );
    
    console.log('Verification:', verification.rows[0]);
    
    await pool.end();
    
  } catch (error) {
    console.error('Error updating PDF content:', error);
  }
}

updatePDFContent();