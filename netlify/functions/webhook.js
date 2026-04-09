const https = require("https");

const BOT_TOKEN = process.env.TELEGRAM_TOKEN || "7370819571:AAHycxAHIt8VRm5tM468hePYtgHke6uChhk";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function tg(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${TELEGRAM_API}/${method}`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 200, body: "OK" };
  
  try {
    const body = JSON.parse(event.body);
    
    if (body.message && body.message.text === "/start") {
      await tg("sendMessage", {
        chat_id: body.message.chat.id,
        text: "البوت يعمل الآن بشكل صحيح!",
      });
    }

    return { statusCode: 200, body: "OK" };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: "OK" };
  }
};
