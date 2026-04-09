const https = require("https");
const PROPERTIES = require("../../properties.json");
const GUIDE_DATA = require("../../ras_elbar_guide_data.json");

const BOT_TOKEN = process.env.TELEGRAM_TOKEN || "7370819571:AAHycxAHIt8VRm5tM468hePYtgHke6uChhk";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8084142659";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const GROUP_INVITE_LINK = "https://t.me/raselbarbot";
const GROUP_CHAT_ID = "-1002550095639"; // @raselbarbot
const CHANNEL_ID = "-1002361644048";    // @e3lan_akary

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
      [{ text: "🏠 تصفح العقارات", callback_data: "browse_properties" }],
      [{ text: "🏖️ دليل رأس البر الذكي", callback_data: "city_guide" }],
      [{ text: "⚖️ معلومات عقارية قانونية", callback_data: "legal_info" }],
      [{ text: "📝 إرسال طلب حجز", callback_data: "booking_request" }],
      [{ text: "🌐 زور موقعنا للإيجار", url: "https://ras-elbar-egar.netlify.app/" }],
      [{ text: "📱 صفحتنا على فيسبوك", url: "https://www.facebook.com/akarat.raaselbar" }],
      [{ text: "📞 تواصل معنا", callback_data: "contact" }],
      [{ text: "📢 انضم لمجموعتنا", url: GROUP_INVITE_LINK }],
    ],
  };
}

// ─── Welcome Message ───
function getWelcomeMessage() {
  return (
    "🏖️ *مرحباً بك في عالم عقارات رأس البر الفاخرة!* 🏖️\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "🏠 *اكتشف أفضل العقارات والشقق الفاخرة*\n" +
    "💰 *أسعار تنافسية وخدمة عملاء متميزة*\n" +
    "📍 *مواقع استراتيجية قريبة من البحر*\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "✨ *ماذا نقدم لك؟*\n" +
    "🏠 شقق للبيع والإيجار\n" +
    "🏖️ شاليهات فاخرة مطلة على البحر\n" +
    "🗺️ *دليل رأس البر الذكي لخدمتك*\n" +
    "⚖️ *استشارات ومعلومات قانونية عقارية*\n" +
    "🎯 خدمة حجز سريعة وآمنة\n\n" +
    "👇 *اختر ما يناسبك من الأزرار أدناه*"
  );
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 200, body: "OK" };
  
  try {
    const body = JSON.parse(event.body);
    
    // Handle Messages
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;
      const userId = body.message.from.id;

      // Broadcast Feature (Admin Only)
      if (text && text.startsWith("/broadcast") && userId.toString() === ADMIN_CHAT_ID) {
        const broadcastMsg = text.replace("/broadcast", "").trim();
        if (broadcastMsg) {
          const finalMsg = `🔔 *تنبيه هام من عقارات رأس البر*\n\n${broadcastMsg}`;
          await tg("sendMessage", { chat_id: GROUP_CHAT_ID, text: finalMsg, parse_mode: "Markdown" });
          await tg("sendMessage", { chat_id: CHANNEL_ID, text: finalMsg, parse_mode: "Markdown" });
          await tg("sendMessage", { chat_id: chatId, text: "✅ تم إرسال البث للقناة والمجموعة بنجاح!" });
        }
        return { statusCode: 200, body: "OK" };
      }

      // Start Command
      if (text === "/start") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: getWelcomeMessage(),
          parse_mode: "Markdown",
          reply_markup: buildMainMenu(),
        });
      }
      
      // Keyword Auto-Reply in Groups
      const keywords = ["شقة", "ايجار", "إيجار", "بيع", "تمليك", "جراج", "حجز"];
      if (text && keywords.some(k => text.includes(k)) && chatId.toString() === GROUP_CHAT_ID) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "🏠 *تبحث عن عقار في رأس البر؟*\n\nتفضل بزيارة البوت الخاص بنا لتصفح أحدث العروض والحجوزات مباشرة 👇",
          reply_markup: {
            inline_keyboard: [[{ text: "🤖 افتح البوت الآن", url: "https://t.me/raselbarakarbot?start=welcome" }]]
          }
        });
      }
    }

    // Handle Callback Queries
    if (body.callback_query) {
      const query = body.callback_query;
      const chatId = query.message.chat.id;
      const data = query.data;

      await tg("answerCallbackQuery", { callback_query_id: query.id });

      switch (data) {
        case "main_menu":
          await tg("editMessageText", {
            chat_id: chatId,
            message_id: query.message.message_id,
            text: getWelcomeMessage(),
            parse_mode: "Markdown",
            reply_markup: buildMainMenu(),
          });
          break;

        case "city_guide":
          await tg("editMessageText", {
            chat_id: chatId,
            message_id: query.message.message_id,
            text: "🏖️ *دليل رأس البر الذكي* 🏖️\n\nأهلاً بك في دليلك الشامل لمدينة رأس البر الساحرة!\n\nماذا تود أن تعرف اليوم؟",
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📜 تاريخ رأس البر العريق", callback_data: "guide_history" }],
                [{ text: "📍 أهم المعالم السياحية", callback_data: "guide_spots" }],
                [{ text: "🍴 أفضل المطاعم والحلويات", callback_data: "guide_food" }],
                [{ text: "🚌 المواصلات والخدمات", callback_data: "guide_services" }],
                [{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }],
              ],
            },
          });
          break;

        case "legal_info":
          await tg("editMessageText", {
            chat_id: chatId,
            message_id: query.message.message_id,
            text: "⚖️ *معلومات عقارية قانونية هامة*\n\n" +
                  "1️⃣ *التسجيل العقاري*: تأكد دائماً من صحة تسلسل الملكية ووجود عقد مسجل أو صحة توقيع.\n" +
                  "2️⃣ *تراخيص البناء*: تأكد من أن العقار غير مخالف لقوانين البناء في رأس البر.\n" +
                  "3️⃣ *عقود الإيجار*: يفضل دائماً توثيق عقود الإيجار لضمان حقوق الطرفين.\n" +
                  "4️⃣ *المرافق*: تأكد من سداد كافة فواتير الكهرباء والمياه قبل الشراء.\n\n" +
                  "📞 للاستفسارات القانونية المفصلة، يمكنك التواصل معنا مباشرة.",
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📞 تواصل مع المستشار", callback_data: "contact" }],
                [{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }],
              ],
            },
          });
          break;

        case "browse_properties":
          await tg("editMessageText", {
            chat_id: chatId,
            message_id: query.message.message_id,
            text: "🏠 *تصفح أفضل العقارات في رأس البر*:\nاختر القسم الذي تود استكشافه:",
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🏠 شقق للبيع", callback_data: "apartments_sale" }],
                [{ text: "🚗 جراجات للبيع", callback_data: "garages_sale" }],
                [{ text: "🏖️ شقق إيجار", callback_data: "apartments_rent" }],
                [{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }],
              ],
            },
          });
          break;

        case "contact":
          await tg("sendMessage", {
            chat_id: chatId,
            text: "📞 *يسعدنا تواصلك معنا مباشرة:*\n\n" +
                  "📱 واتساب: [اضغط هنا](https://wa.me/201026569682)\n" +
                  "☎️ اتصال: `01026569682`\n\n" +
                  "📍 العنوان: رأس البر - شارع 85 فيلا 31",
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: { inline_keyboard: [[{ text: "« الرجوع", callback_data: "main_menu" }]] }
          });
          break;
          
        // Add other cases as needed...
      }
    }

    return { statusCode: 200, body: "OK" };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: "OK" };
  }
};
