import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Parsed data from the uploaded PDFs
const allConstituents = [
  // 13D Index constituents from first PDF
  { ticker: 'ABBN.SW', name: 'ABB LTD-REG', index: '13D Automation Index', isHighConviction: false },
  { ticker: 'ASML.AS', name: 'ASML HOLDING NV', index: '13D Automation Index', isHighConviction: false },
  { ticker: 'ADSK', name: 'AUTODESK INC', index: '13D Automation Index', isHighConviction: false },
  { ticker: 'CDNS', name: 'CADENCE DESIGN SYS INC', index: '13D Automation Index', isHighConviction: false },
  { ticker: 'DSY.PA', name: 'DASSAULT SYSTEMES SE', index: '13D Automation Index', isHighConviction: false },
  { ticker: '6501.T', name: 'HITACHI LTD', index: '13D Automation Index', isHighConviction: false },
  { ticker: '6861.T', name: 'KEYENCE CORP', index: '13D Automation Index', isHighConviction: false },
  { ticker: 'NVDA', name: 'NVIDIA CORP', index: '13D Automation Index', isHighConviction: false },
  { ticker: 'ROK', name: 'ROCKWELL AUTOMATION INC', index: '13D Automation Index', isHighConviction: false },
  { ticker: '005930.KS', name: 'Samsung Electronics Co Ltd', index: '13D Automation Index', isHighConviction: false },
  { ticker: '000660.KS', name: 'SK Hynix Inc', index: '13D Automation Index', isHighConviction: false },
  { ticker: 'SNPS', name: 'SYNOPSYS INC', index: '13D Automation Index', isHighConviction: false },

  // 13D China Deep Value & High Dividend Yield Index
  { ticker: '600019.SS', name: 'BAOSHAN IRON & STEEL CO-A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '601668.SS', name: 'CHINA STATE CONSTRUCTION -A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '000651.SZ', name: 'GREE ELECTRIC APPLIANCES I-A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '600285.SS', name: 'HENAN LINGRUI PHARMACEUTIC-A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '000895.SZ', name: 'HENAN SHUANGHUI INVESTMENT-A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '0388.HK', name: 'Hong Kong Exchanges & Clearing Ltd.', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '000932.SZ', name: 'Hunan Valin Steel Co., Ltd. Class A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '600887.SS', name: 'INNER MONGOLIA YILI INDUS-A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '601225.SS', name: 'SHAANXI COAL INDUSTRY CO L-A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '002327.SZ', name: 'Shenzhen Fuanna Bedding & Furnishing Co. Ltd. Class A', index: '13D China Deep Value & High Dividend Yield Index', isHighConviction: true, weightInHighConviction: 5.00 },

  // High conviction copper strategy
  { ticker: 'ATX.V', name: 'ATEX RESOURCES INC', index: '13D Copper Strategy', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: 'FOM.TO', name: 'FORAN MINING CORP', index: '13D Copper Strategy', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: 'COPX', name: 'Global X Copper Miners ETF', index: '13D Copper Strategy', isHighConviction: true, weightInHighConviction: 5.00 },

  // High conviction critical minerals
  { ticker: '600111.SS', name: 'CHINA NORTHERN RARE EARTH -A', index: '13D Critical Minerals Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '000831.SZ', name: 'China Rare Earth Resources And Technology Co., Ltd. Class', index: '13D Critical Minerals Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: 'LYC.AX', name: 'Lynas Rare Earths Limited', index: '13D Critical Minerals Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: 'MND.TO', name: 'Mandalay Resources Corporation', index: '13D Critical Minerals Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: 'MP', name: 'MP Materials Corp Class A', index: '13D Critical Minerals Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: 'SXGC.V', name: 'Southern Cross Gold Consolidated Ltd.', index: '13D Critical Minerals Index', isHighConviction: true, weightInHighConviction: 5.00 },
  { ticker: '600549.SS', name: 'Xiamen Tungsten Co. Ltd. Class A', index: '13D Critical Minerals Index', isHighConviction: true, weightInHighConviction: 5.00 },

  // High conviction defense
  { ticker: 'AVAV', name: 'AEROVIRONMENT INC', index: '13D Defense Index', isHighConviction: true, weightInHighConviction: 4.00 },
  { ticker: 'BA.L', name: 'BAE SYSTEMS PLC', index: '13D Defense Index', isHighConviction: true, weightInHighConviction: 4.00 },
  { ticker: 'ESLT.TA', name: 'Elbit Systems Ltd', index: '13D Defense Index', isHighConviction: true, weightInHighConviction: 4.00 },
  { ticker: 'FTNT', name: 'FORTINET INC', index: '13D Defense Index', isHighConviction: true, weightInHighConviction: 4.00 },
  { ticker: 'KTOS', name: 'Kratos Defense & Security Solutions, Inc.', index: '13D Defense Index', isHighConviction: true, weightInHighConviction: 4.00 },
  { ticker: 'LHX', name: 'L3HARRIS TECHNOLOGIES INC', index: '13D Defense Index', isHighConviction: true, weightInHighConviction: 4.00 },
  { ticker: 'LMT', name: 'LOCKHEED MARTIN CORP', index: '13D Defense Index', isHighConviction: true, weightInHighConviction: 4.00 },
  { ticker: 'NOC', name: 'NORTHROP GRUMMAN CORP', index: '13D Defense Index', isHighConviction: true, weightInHighConviction: 4.00 },

  // High conviction gold miners
  { ticker: 'SXGC.V', name: 'Southern Cross Gold Consolidated Ltd.', index: '13D Gold High Growth Acquisition (HGAX) Index', isHighConviction: true, weightInHighConviction: 6.90 },
  { ticker: 'OLA.TO', name: 'Orla Mining Ltd.', index: '13D Gold High Growth Acquisition (HGAX) Index', isHighConviction: true, weightInHighConviction: 6.90 },
  { ticker: 'WDO.TO', name: 'Wesdome Gold Mines Ltd.', index: '13D Gold High Growth Acquisition (HGAX) Index', isHighConviction: true, weightInHighConviction: 6.90 },
  { ticker: 'AEM', name: 'Agnico Eagle Mines Limited', index: '13D Gold Miners Index', isHighConviction: true, weightInHighConviction: 6.90 },
  { ticker: 'AGI', name: 'Alamos Gold Inc.', index: '13D Gold Miners Index', isHighConviction: true, weightInHighConviction: 6.90 },
  { ticker: 'OLA.TO', name: 'Orla Mining Ltd.', index: '13D Gold Miners Index', isHighConviction: true, weightInHighConviction: 6.90 },
  { ticker: 'KGC', name: 'Kinross Gold Corporation', index: '13D Gold Miners Index', isHighConviction: true, weightInHighConviction: 6.90 },
  { ticker: 'NGD', name: 'New Gold Inc.', index: '13D Gold Miners Index', isHighConviction: true, weightInHighConviction: 6.90 },
  { ticker: 'WDO.TO', name: 'Wesdome Gold Mines Ltd.', index: '13D Gold Miners Index', isHighConviction: true, weightInHighConviction: 6.90 },

  // High conviction silver strategy
  { ticker: 'SI=F', name: 'Silver Futures', index: '13D Silver Strategy', isHighConviction: true, weightInHighConviction: 7.00 },
  { ticker: 'SILJ', name: 'ETFMG Prime Junior Silver ETF', index: '13D Silver Strategy', isHighConviction: true, weightInHighConviction: 7.00 },
  { ticker: 'AYA.TO', name: 'Aya Gold & Silver Inc.', index: '13D Silver Strategy', isHighConviction: true, weightInHighConviction: 7.00 },
  { ticker: 'DV.V', name: 'Discovery Silver Corp.', index: '13D Silver Strategy', isHighConviction: true, weightInHighConviction: 7.00 },
  { ticker: 'SIL', name: 'Global X Silver Miners ETF', index: '13D Silver Strategy', isHighConviction: true, weightInHighConviction: 7.00 },
  { ticker: 'PAAS', name: 'Pan American Silver Corp.', index: '13D Silver Strategy', isHighConviction: true, weightInHighConviction: 7.00 },

  // High conviction uranium
  { ticker: 'CCO.TO', name: 'Cameco Corporation', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'KAP.IL', name: 'Kazatomprom National Atomic Company', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'U-UN.TO', name: 'Uranium Participation Corporation', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'NXE.TO', name: 'NexGen Energy Ltd.', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'PDN.AX', name: 'Paladin Energy Ltd.', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'LOT.AX', name: 'Lotus Resources Limited', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'BOE.AX', name: 'Boss Energy Limited', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'DML.TO', name: 'Denison Mines Corp.', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'GLO.TO', name: 'Global Atomic Corporation', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 },
  { ticker: 'EFR.TO', name: 'Energy Fuels Inc.', index: '13D Uranium Index', isHighConviction: true, weightInHighConviction: 8.50 }
];

async function populateConstituents() {
  try {
    console.log('Creating portfolio_constituents table if not exists...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_constituents (
        id SERIAL PRIMARY KEY,
        ticker TEXT NOT NULL,
        name TEXT NOT NULL,
        "index" TEXT NOT NULL,
        is_high_conviction BOOLEAN DEFAULT false,
        weight_in_index DECIMAL(5,2),
        weight_in_high_conviction DECIMAL(5,2),
        rebalance_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Clearing existing data...');
    await pool.query('DELETE FROM portfolio_constituents');

    console.log('Inserting portfolio constituents...');
    for (const constituent of allConstituents) {
      await pool.query(`
        INSERT INTO portfolio_constituents (ticker, name, "index", is_high_conviction, weight_in_index, weight_in_high_conviction, rebalance_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        constituent.ticker,
        constituent.name,
        constituent.index,
        constituent.isHighConviction,
        constituent.weightInIndex || null,
        constituent.weightInHighConviction || null,
        constituent.rebalanceDate || null
      ]);
    }

    console.log(`Successfully inserted ${allConstituents.length} portfolio constituents`);

  } catch (error) {
    console.error('Error populating constituents:', error);
  } finally {
    await pool.end();
  }
}

populateConstituents();