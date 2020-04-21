const express = require("express");
const app = express();
const port = 3001;

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("db");

const cors = require("cors");
const fs = require("fs");
const https = require("https");

const RSI = require('technicalindicators').RSI;

app.use(cors());

app.get("/", (req, res) => {
  console.log(req.query);

  db.serialize(() => {
    const query = `
    SELECT *, printf("%.4f", (non_top_long / non_top_short)) as non_top_long_short_ratio
    FROM
    (SELECT contract,
           datetime(timestamp/1000, 'unixepoch') as timeframe,
           ((cast(global_short AS FLOAT) * 10 - cast(top_short AS FLOAT) * 2)/8 )  as non_top_long,
           ((cast(global_long_short_ratio AS FLOAT) * 10 - cast(top_long_short_ratio AS FLOAT) * 2)/8) as non_top_short,
           top_long as top_long_short_ratio,
           top_short as top_long,
           top_long_short_ratio as top_short,
           global_long as global_long_short_ratio,
           global_short as global_long,
           global_long_short_ratio as global_short
    FROM long_top_ratio_positions)
    `;

    db.all(query, (err, rows) => {

      const rsiPeriod = req.query.rsi ? parseInt(req.query.rsi) : 14

      const inputTopRatiosRSI = {
        values : rows.map(row => row.top_long_short_ratio),
        period : rsiPeriod
      };
      const topRatiosRSISeries = [...Array(rsiPeriod).fill(null), ...RSI.calculate(inputTopRatiosRSI)];

      const inputGlobalRatiosRSI = {
        values : rows.map(row => row.global_long_short_ratio),
        period : rsiPeriod
      };
      const globalRatiosRSISeries = [...Array(rsiPeriod).fill(null), ...RSI.calculate(inputGlobalRatiosRSI)];
      // console.log({rows, topRatiosRSISeries, globalRatiosRSISeries})
      res.json({rows, topRatiosRSISeries, globalRatiosRSISeries});
    });
  });
});

// db.close();

// app.listen(port, () =>
//   console.log(`App listening at http://localhost:${port}`)
// );

https
  .createServer(
    {
      key: fs.readFileSync("server.key"),
      cert: fs.readFileSync("server.cert")
    },
    app
  )
  .listen(port, function() {
    console.log(`App listening at https://localhost:${port}`);
  });

// Generate a self-signed certificate
// openssl req -nodes -new -x509 -keyout server.key -out server.cert