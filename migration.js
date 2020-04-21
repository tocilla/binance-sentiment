const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("db");

db.serialize(() => {
  db.run(
    `CREATE TABLE long_top_ratio_positions (
      contract TEXT,
      timestamp INTEGER,
      top_long TEXT,
      top_short TEXT,
      top_long_short_ratio REAL,
      global_long TEXT,
      global_short TEXT,
      global_long_short_ratio REAL
    )`
  );
  db.run("CREATE TABLE  metadata (last_inserted_timestamp INTEGER)");
  db.run("INSERT INTO metadata (last_inserted_timestamp) values (0)");
});

db.close();
