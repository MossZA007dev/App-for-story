const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/saga_forge.db'));

const update = db.prepare(`
  UPDATE characters 
  SET character_type = 'canon', 
      faction = CASE WHEN faction IS NULL OR faction = '' THEN 'Night''s Watch' ELSE faction END
  WHERE name IN ('Gared', 'Waymar', 'Will')
`);

const res = update.run();
console.log('Updated characters count:', res.changes);

const rows = db.prepare('SELECT name, character_type, faction FROM characters').all();
console.log('--- ALL CHARACTERS NOW ---');
rows.forEach(r => console.log(`${r.name} | type: ${r.character_type} | faction: ${r.faction}`));
