const https = require("https");
const fs = require("fs");
const path = require("path");

const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8084142659";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const GROUP_INVITE_LINK = "https://t.me/raselbarbot";

// Load properties data
const propertiesPath = path.resolve(__dirname, "../../properties.json");
const PROPERTIES = JSON.parse(fs.readFileSync(propertiesPath, "utf-8"));

// ─── Telegram API Helper ───
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

// ─── Main Menu ───
function buildMainMenu() {
  return {
    inline_keyboard: [
      [{ text: "🏠 شقق للبيع", callback_data: "apartments_sale" }],
      [{ text: "🏖️ شاليهات للبيع", callback_data: "chalets_sale" }],
      [{ text: "🌄 أراضي للبيع", callback_data: "land_sale" }],
      [{ text: "💰 أسعار التمليك", callback_data: "ownership_prices" }],
      [{ text: "🏠 شقق للبيع (كاش/تقسيط)", callback_data: "apartments_for_sale" }],
      [{ text: "🏖️ شقق إيجار", callback_data: "apartments_rent" }],
      [{ text: "📝 إرسال طلب حجز", callback_data: "booking_request" }],
      [{ text: "🌐 زور موقعنا للإيجار", url: "https://ras-elbar-egar.netlify.app/" }],
      [{ text: "📱 صفحتنا على فيسبوك", url: "https://www.facebook.com/akarat.raaselbar" }],
      [{ text: "📞 تواصل معنا", callback_data: "contact" }],
      [{ text: "📢 انضم لمجموعتنا", url: GROUP_INVITE_LINK }],
    ],
  };
}

const backButton = {
  inline_keyboard: [[{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }]],
};

// ─── Send Start Menu ───
async function sendStart(chatId) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: "مرحبًا بك في بوت عقارات رأس البر! اختر نوع العقار أو الخدمة:",
    reply_markup: buildMainMenu(),
  });
}

// ─── Send Properties List ───
async function sendProperties(chatId, category) {
  const props = PROPERTIES[category];
  if (!props || props.length === 0) {
    await tg("sendMessage", { chat_id: chatId, text: "لا توجد عقارات متاحة حالياً في هذا القسم.", reply_markup: backButton });
    return;
  }
  for (const prop of props) {
    const caption =
      `🏠 *${prop.name}*\n` +
      `📝 *الوصف*: ${prop.description}\n` +
      `💰 *السعر*: ${prop.price}\n` +
      `📍 *الموقع*: ${prop.location}`;

    if (prop.images && prop.images.length > 0) {
      await tg("sendPhoto", {
        chat_id: chatId,
        photo: prop.images[0],
        caption: caption,
        parse_mode: "Markdown",
      });
    } else {
      await tg("sendMessage", {
        chat_id: chatId,
        text: caption,
        parse_mode: "Markdown",
      });
    }
  }
  await tg("sendMessage", { chat_id: chatId, text: "📞 للمزيد من التفاصيل تواصل معنا: `01026569682`", parse_mode: "Markdown", reply_markup: backButton });
}

// ─── Handle Callback Queries ───
async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  await tg("answerCallbackQuery", { callback_query_id: query.id });

  switch (data) {
    case "main_menu":
      await sendStart(chatId);
      break;

    case "apartments_sale":
    case "chalets_sale":
    case "land_sale":
      await sendProperties(chatId, data);
      break;

    case "ownership_prices":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "💰 *أسعار التمليك في رأس البر*:\n\n" +
          "🏠 *عمارات المستشارين*:\n" +
          "➖ الأسعار تبدأ من *900,000 جنيه*.\n\n" +
          "🏙️ *الامتداد العمراني*:\n" +
          "➖ شقق غرفتين (60 متر): من *1,200,000* إلى *1,900,000 جنيه*.\n" +
          "➖ أجنحة (120 متر): تصل إلى *5,000,000 جنيه* حسب الموقع والتشطيب.\n\n" +
          "🌊 *شوارع رأس البر الرئيسية*:\n" +
          "➖ الفيلات: من *1,700,000* إلى *6,000,000 جنيه* حسب العمر، الموقع، والاتجاه.\n" +
          "➖ المنطقة الأولى: أسعار أعلى حسب المواصفات.\n\n" +
          "📞 تواصل مع مكتب الوحيد لمزيد من التفاصيل: `01026569682`",
        parse_mode: "Markdown",
        reply_markup: backButton,
      });
      break;

    case "apartments_for_sale":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🏠 *شقق للبيع في رأس البر*:\n\n" +
          "لدينا العديد من الشقق في شوارع وأماكن مختلفة:\n" +
          "➖ 🏗️ *تقسيط حتى سنة*: شقق تحت الإنشاء.\n" +
          "➖ 💵 *كاش*: استلام فوري.\n\n" +
          "📞 نرجو الاتصال بمكتب الوحيد لمعرفة الأماكن والأسعار: `01026569682`",
        parse_mode: "Markdown",
        reply_markup: backButton,
      });
      break;

    case "apartments_rent":
      // Send intro
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🏖️ *شقق إيجار في رأس البر*:\n\n" +
          "💰 *أسعار الإيجار* تتحدد حسب التوقيت، الموقع، القرب من البحر، ومستوى الشقة:\n" +
          "➖ *قبل الموسم (قبل يونيو)*:\n" +
          "  ➖ شقق من *250-300 جنيه/اليوم*.\n" +
          "  ➖ أول مطل: حتى *1,500 جنيه/اليوم*.\n" +
          "➖ *موسم الصيف (يونيو وما بعد)*:\n" +
          "  ➖ الأسعار ترتفع مع الازدحام (الطلب أعلى من العرض).\n" +
          "  ➖ أول مطل: تصل إلى *4,000 جنيه/اليوم*.\n\n" +
          "🏠 *شقق الإيجار المتاحة*:",
        parse_mode: "Markdown",
      });
      // Send each rental property
      await sendProperties(chatId, "apartments_rent");
      // Contact info
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🔗 *لمعرفة المتاح والأسعار*:\n" +
          "➖ زور موقعنا: https://ras-elbar-egar.netlify.app/\n" +
          "➖ تابع صفحتنا على فيسبوك: https://www.facebook.com/akarat.raaselbar\n" +
          "➖ 📞 اتصل بمكتب الوحيد: `01026569682`",
        parse_mode: "Markdown",
        reply_markup: backButton,
      });
      break;

    case "booking_request":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "📝 *إرسال طلب حجز*\n\n" +
          "لحجز شقة أو شاليه، من فضلك ابعتلنا البيانات دي في رسالة واحدة:\n\n" +
          "1️⃣ اسمك الكامل\n" +
          "2️⃣ رقم التليفون\n" +
          "3️⃣ نوع العقار (شقة/شاليه/أرض)\n" +
          "4️⃣ تمليك ولا إيجار؟\n" +
          "5️⃣ المساحة المطلوبة\n" +
          "6️⃣ الميزانية\n\n" +
          "📞 أو تواصل مباشرة: `01026569682`",
        parse_mode: "Markdown",
        reply_markup: backButton,
      });
      break;

    case "contact":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "📞 *تواصل مع مكتب الوحيد للاستثمار العقاري*:\n" +
          "➖ رقم الهاتف: `01026569682`\n" +
          "➖ واتساب: `01026569682`\n" +
          "➖ العنوان: رأس البر، شارع 85 فيلا 31",
        parse_mode: "Markdown",
        reply_markup: backButton,
      });
      break;

    default:
      await sendStart(chatId);
  }
}

// ─── Handle Text Messages ───
async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const chatType = message.chat.type;

  // /start command
  if (text === "/start" || text === "/menu") {
    await sendStart(chatId);
    return;
  }

  // /contact command
  if (text === "/contact") {
    await tg("sendMessage", {
      chat_id: chatId,
      text:
        "📞 *تواصل مع مكتب الوحيد للاستثمار العقاري*:\n" +
        "➖ رقم الهاتف: `01026569682`\n" +
        "➖ واتساب: `01026569682`\n" +
        "➖ العنوان: رأس البر، شارع 85 فيلا 31",
      parse_mode: "Markdown",
    });
    return;
  }

  // Group keyword auto-reply
  if (chatType === "group" || chatType === "supergroup") {
    const keywords = ["شقة", "إيجار", "ايجار", "رأس البر", "عقار", "شاليه", "تمليك", "شراء", "بيع", "فيلا", "استثمار", "بحر", "مصيف", "إجازة", "سكن"];
    const lower = text.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🏖️ *عروض عقارات رأس البر!*\n" +
          "شقق إيجار وتمليك بأسعار مميزة! 🏠\n" +
          "📞 تواصل معنا: `01026569682`\n" +
          `📢 انضم لمجموعتنا: ${GROUP_INVITE_LINK}\n` +
          "🌐 زور موقعنا: https://ras-elbar-egar.netlify.app/",
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
      return;
    }
  }

  // Forward booking data to admin (any non-command message in private chat)
  if (chatType === "private" && text.length > 10) {
    // Could be a booking request - forward to admin
    const userName = message.from.first_name || "مستخدم";
    const userId = message.from.id;
    await tg("sendMessage", {
      chat_id: ADMIN_CHAT_ID,
      text:
        `🔔 *رسالة جديدة من مستخدم البوت*\n\n` +
        `👤 *الاسم*: ${userName}\n` +
        `🆔 *ID*: ${userId}\n` +
        `📝 *الرسالة*:\n${text}`,
      parse_mode: "Markdown",
    });

    await tg("sendMessage", {
      chat_id: chatId,
      text: "✅ تم استلام رسالتك! سنتواصل معك قريباً.\n📞 أو تواصل مباشرة: `01026569682`",
      parse_mode: "Markdown",
      reply_markup: backButton,
    });
    return;
  }

  // Default: show menu
  if (chatType === "private") {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "مرحبًا! 👋 اضغط /start عشان تشوف القائمة الرئيسية.",
    });
  }
}

// ─── Netlify Function Handler ───
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "✅ RasElBarBot is running!" };
  }

  try {
    const update = JSON.parse(event.body);

    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }

    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 200, body: "OK" };
  }
};
