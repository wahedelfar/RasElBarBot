const https = require("https");

const BOT_TOKEN = process.env.TELEGRAM_TOKEN || "7370819571:AAHycxAHIt8VRm5tM468hePYtgHke6uChhk";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// دالة لإرسال الطلبات إلى تليجرام
function tg(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${TELEGRAM_API}/${method}`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          resolve({ ok: false, error: "Invalid JSON response" });
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// دالة لتنظيف النصوص لـ MarkdownV2 (محاكاة للدالة في بايثون)
function escapeMarkdown(text) {
  if (!text) return "";
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "Method Not Allowed" };
  }

  try {
    const update = JSON.parse(event.body);
    console.log("Received update:", JSON.stringify(update));

    // 1. معالجة الرسائل النصية (مثل /start)
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (text.startsWith("/start")) {
        const welcomeMsg = 
          "🏖️ *مرحباً بك في عالم عقارات رأس البر الفاخرة\\!* 🏖️\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
          "🏠 *اكتشف أفضل العقارات والشقق الفاخرة*\n" +
          "💰 *أسعار تنافسية وخدمة عملاء متميزة*\n" +
          "📍 *مواقع استراتيجية قريبة من البحر*\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
          "✨ *ماذا نقدم لك؟*\n" +
          "🏠 شقق للبيع والإيجار\n" +
          "🏖️ شاليهات فاخرة مطلة على البحر\n" +
          "🗺️ *دليل رأس البر الذكي لخدمتك*\n" +
          "⚖️ *نصائح عقارية وقانونية تهمك*\n" +
          "🎯 خدمة حجز سريعة وآمنة\n\n" +
          "👇 *اختر ما يناسبك من الأزرار أدناه*";

        const keyboard = {
          inline_keyboard: [
            [{ text: "🏠 تصفح العقارات", callback_data: "browse_properties" }],
            [{ text: "🏖️ دليل رأس البر الذكي", callback_data: "city_guide" }],
            [{ text: "⚖️ نصائح عقارية وقانونية", callback_data: "legal_tips" }],
            [{ text: "📝 إرسال طلب حجز", callback_data: "booking_request" }],
            [{ text: "🌐 موقعنا للإيجار", url: "https://egarat.netlify.app/" }],
            [{ text: "📞 تواصل معنا", callback_data: "contact" }],
            [{ text: "📢 انضم لقناتنا", url: "https://t.me/e3lan_akary" }],
            [{ text: "👥 مجموعتنا على تليجرام", url: "https://t.me/raselbarbot" }]
          ]
        };

        await tg("sendMessage", {
          chat_id: chatId,
          text: welcomeMsg,
          parse_mode: "MarkdownV2",
          reply_markup: keyboard
        });
      }
    }

    // 2. معالجة الضغط على الأزرار (Callback Queries)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      // الرد على التليجرام بأننا استلمنا الضغطة (لإزالة علامة التحميل من الزر)
      await tg("answerCallbackQuery", { callback_query_id: callbackQuery.id });

      if (data === "main_menu") {
        const welcomeMsg = "🏖️ *القائمة الرئيسية لعقارات رأس البر* 🏖️\n\nاختر من الأقسام التالية:";
        const keyboard = {
          inline_keyboard: [
            [{ text: "🏠 تصفح العقارات", callback_data: "browse_properties" }],
            [{ text: "🏖️ دليل رأس البر الذكي", callback_data: "city_guide" }],
            [{ text: "⚖️ نصائح عقارية وقانونية", callback_data: "legal_tips" }],
            [{ text: "📞 تواصل معنا", callback_data: "contact" }]
          ]
        };
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: welcomeMsg,
          parse_mode: "MarkdownV2",
          reply_markup: keyboard
        });
      }

      else if (data === "browse_properties") {
        const text = "🏠 *تصفح أفضل العقارات في رأس البر*:\nاختر القسم الذي تود استكشافه:";
        const keyboard = {
          inline_keyboard: [
            [{ text: "🏠 شقق للبيع", callback_data: "apartments_sale" }],
            [{ text: "🏖️ شقق إيجار", callback_data: "apartments_rent" }],
            [{ text: "🌄 أراضي وجراجات", callback_data: "land_sale" }],
            [{ text: "🔙 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
          ]
        };
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: "MarkdownV2",
          reply_markup: keyboard
        });
      }

      else if (data === "city_guide") {
        const text = "🏖️ *دليل رأس البر الذكي* 🏖️\n\nدليلك الشامل للمعالم والخدمات في المدينة الساحرة:";
        const keyboard = {
          inline_keyboard: [
            [{ text: "📍 أهم المعالم السياحية", callback_data: "guide_spots" }],
            [{ text: "🍴 أفضل المطاعم والحلويات", callback_data: "guide_food" }],
            [{ text: "🚌 المواصلات والخدمات", callback_data: "guide_services" }],
            [{ text: "🔙 العودة للقائمة الرئيسية", callback_data: "main_menu" }]
          ]
        };
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: "MarkdownV2",
          reply_markup: keyboard
        });
      }

      else if (data === "legal_tips") {
        const text = "⚖️ *نصائح عقارية وقانونية هامة* ⚖️\n\n" +
          "1️⃣ *التأكد من الملكية*: يجب مراجعة تسلسل الملكية وعقد البيع الأصلي\\.\n" +
          "2️⃣ *التراخيص*: تأكد من أن العقار مرخص وليس عليه مخالفات بناء\\.\n" +
          "3️⃣ *المرافق*: تحقق من سداد كافة فواتير الكهرباء والمياه\\.\n" +
          "4️⃣ *عقود الإيجار*: تأكد من توثيق العقد في الشهر العقاري لضمان حقك\\.\n\n" +
          "💡 *نصيحة*: لا تدفع مبالغ كبيرة قبل المعاينة الفعلية والتأكد من الأوراق\\.";
        const keyboard = {
          inline_keyboard: [[{ text: "🔙 العودة", callback_data: "main_menu" }]]
        };
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: "MarkdownV2",
          reply_markup: keyboard
        });
      }

      else if (data === "contact") {
        const text = "📞 *تواصل مع مكتب الوحيد للاستثمار العقاري*:\n\n" +
          "➖ رقم الهاتف: `01026569682`\n" +
          "➖ واتساب: [اضغط هنا](https://wa.me/201026569682)\n" +
          "➖ العنوان: رأس البر، شارع 85 فيلا 31";
        const keyboard = {
          inline_keyboard: [[{ text: "🔙 العودة", callback_data: "main_menu" }]]
        };
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: "MarkdownV2",
          reply_markup: keyboard
        });
      }
    }

    return { statusCode: 200, body: "OK" };
  } catch (e) {
    console.error("Error handler:", e);
    return { statusCode: 200, body: "Error" };
  }
};
