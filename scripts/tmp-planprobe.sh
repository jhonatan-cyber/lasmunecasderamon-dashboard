node -e "
require('dotenv').config({quiet:true});
const{Client}=require('pg');
const postgres=require('./lib/database/postgres.cjs');
(async()=>{
  const admin=new Client({...postgres.connectionConfig(),database:'postgres'});
  await admin.connect();
  await admin.query('DROP DATABASE IF EXISTS lasmunecas_planprobe WITH (FORCE)');
  await admin.query('CREATE DATABASE lasmunecas_planprobe');
  await admin.end();
  const c=new Client({...postgres.connectionConfig(),database:'lasmunecas_planprobe'});
  await c.connect();
  await c.query(require('fs').readFileSync('database/lasmunecasderamon.postgres.sql','utf8'));
  console.log('dump importado en lasmunecas_planprobe');
  await c.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
"
