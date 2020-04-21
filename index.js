const cron = require("node-cron");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const BASE_URL = "https://www.binance.com/gateway-api/v1/public/future/data/";

const db = new sqlite3.Database("db");
const TelegramBot = require('node-telegram-bot-api');
const token = '1171295033:AAEHtIkaP1JPU9RG5SQ0sGZE1HFjYvqqtno';
const telegramBot = new TelegramBot(token, {polling: false});
const channelChatId = '-1001356289454'

let lastInsertedTimeStamp;
db.serialize(() => {
  db.get("SELECT last_inserted_timestamp FROM metadata", (err, row) => {
    console.log("lastInsertedTimeStamp", row.last_inserted_timestamp);
    lastInsertedTimeStamp = row.last_inserted_timestamp;
  });
});

// (async () => {
cron.schedule("*/5 * * * *", async () => {
  const contracts = [
    "BTCUSDT",
    "ETHUSDT",
    "BCHUSDT",
    "XPRUSDT",
    "EOSUSDT",
    "LTCUSDT",
    "TRXUSDT",
    "ETCUSDT"
  ];
  const data = { name: contracts[0], periodMinutes: 5 };

  try {
    const topTradersRatioResponse = await axios.post(
      `${BASE_URL}long-short-position-ratio`,
      data
    );
    const globalTradersResponse = await axios.post(
      `${BASE_URL}global-long-short-account-ratio`,
      data
    );
    if (!topTradersRatioResponse.data.success) {
      console.log(
        `An error occured while getting global loong short account ratio:\n
        ${topTradersRatioResponse.data.message}\n
        ${topTradersRatioResponse.data.messageDetail}`
      );
    }
    if (!globalTradersResponse.data.success) {
      console.log(
        `An error occured while getting global loong short account ratio:\n
        ${globalTradersResponse.data.message}\n
        ${globalTradersResponse.data.messageDetail}`
      );
    }
    db.serialize(() => {
      var statement = db.prepare(
        `INSERT INTO long_top_ratio_positions (
          contract,
          timestamp,
          top_long,
          top_short,
          top_long_short_ratio,
          global_long,
          global_short,
          global_long_short_ratio
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (var i = 0; i < globalTradersResponse.data.data.xAxis.length; i++) {
        if (globalTradersResponse.data.data.xAxis[i] <= lastInsertedTimeStamp) {
          console.log(`Skipping ${globalTradersResponse.data.data.xAxis[i]} because it was already inserted`)
          continue;
        }

        statement.run(
          data.name,
          globalTradersResponse.data.data.xAxis[i],
          topTradersRatioResponse.data.data.series[0].data[i], // top raito
          topTradersRatioResponse.data.data.series[1].data[i],
          topTradersRatioResponse.data.data.series[2].data[i],
          globalTradersResponse.data.data.series[0].data[i], // global ratio
          globalTradersResponse.data.data.series[1].data[i],
          globalTradersResponse.data.data.series[2].data[i]
        );
        console.log(`Inserting ${globalTradersResponse.data.data.xAxis[i]}`)
      }

      const lastTimeStamp =
        globalTradersResponse.data.data.xAxis[
          globalTradersResponse.data.data.xAxis.length - 1
        ];
      if (lastTimeStamp > lastInsertedTimeStamp) {
        lastInsertedTimeStamp = lastTimeStamp;
        db.run(
          "UPDATE metadata SET last_inserted_timestamp = ?",
          lastInsertedTimeStamp
        );
        console.log("lastInsertedTimeStamp", lastInsertedTimeStamp);


        const lastIndex = globalTradersResponse.data.data.xAxis.length - 1
        console.log('lastIndex', lastIndex)
        console.log('topLong', topTradersRatioResponse.data.data.series[1].data[lastIndex])
        const topChange = parseFloat(topTradersRatioResponse.data.data.series[1].data[lastIndex]) - parseFloat(topTradersRatioResponse.data.data.series[1].data[lastIndex - 3])
        console.log('topChange', topChange)
        const globalChange = parseFloat(globalTradersResponse.data.data.series[1].data[lastIndex]) - parseFloat(globalTradersResponse.data.data.series[1].data[lastIndex - 3])
        console.log('globalChange', globalChange)
        const difference = 3
        if (Math.abs(topChange) > difference && Math.abs(globalChange) > difference && topChange - globalChange !== Math.abs(topChange) - Math.abs(globalChange)) {
          telegramBot.sendMessage(channelChatId, "Divergence detected");
          console.log(channelChatId, "Divergence detected")
        }
        else if(Math.abs(topChange) > difference) {
          telegramBot.sendMessage(channelChatId, "Volatility detected");
          console.log(channelChatId, "Volatility detected")
        }
      }
    });
  } catch (error) {
    console.error(error);
  }
});
