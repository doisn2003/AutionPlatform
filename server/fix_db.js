const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.xoddvzoyvzkrhjcjwsfw:UJmqchDTYTgLlm5P@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres' });
pool.query("UPDATE nfts SET owner = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' WHERE token_id = 1")
  .then(() => { console.log('UPDATED'); pool.end(); })
  .catch(console.error);
