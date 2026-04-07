const https = require("https");
const fs = require("fs");
const path = require("path");

const BOT_TOKEN = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN || "7370819571:AAHycxAHIt8VRm5tM468hePYtgHke6uChhk";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8084142659";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const GROUP_INVITE_LINK = "https://t.me/raselbarbot";
const GROUP_CHAT_ID = "-1002550095639";

// Load properties data
const propertiesPath = path.resolve(__dirname, "../../properties.json");
const PROPERTIES = JSON.parse(fs.readFileSync(propertiesPath, "utf-8"));

// Guide Data
const GUIDE_DATA = {
  "tourist_spots": [
    { "name": "منطقة اللسان (الفنار)", "description": "أشهر معالم رأس البر، حيث يلتقي نهر النيل بالبحر المتوسط. تضم ممشى سياحي ساحر، مسرحاً، ومشروع الصوت والضوء.", "location": "نهاية شارع النيل - الشمال الشرقي" },
    { "name": "شارع النيل", "description": "قلب رأس البر النابض، يضم مئات المحلات والمطاعم والكافيهات، وهو المكان الأمثل للتنزه ليلاً.", "location": "موازٍ لنهر النيل" },
    { "name": "منطقة الجربي", "description": "منطقة ترفيهية شهيرة تضم نوادي وكافيهات مطلة على النيل مباشرة، وتشتهر بالهدوء والجمال.", "location": "مدخل رأس البر" },
    { "name": "شاطئ النخيل والخليج", "description": "من أرقى شواطئ رأس البر، تتميز بالهدوء والخدمات الممتازة والمياه الصافية.", "location": "منطقة الامتداد العمراني" }
  ],
  "restaurants": [
    { "name": "مطعم سي دور (Sea Door)", "description": "من أشهر مطاعم الأسماك في رأس البر، يقدم تشكيلة رائعة من المأكولات البحرية الطازجة.", "type": "أسماك" },
    { "name": "مطعم الطناوي / الكيلاني", "description": "أفضل الأماكن لتناول المشويات والكباب والكفتة في رأس البر.", "type": "مشويات" },
    { "name": "حلويات البدري / بلبول", "description": "لا تكتمل زيارة رأس البر بدون تجربة المشبك والحلويات الدمياطية الأصلية.", "type": "حلويات" }
  ],
  "transportation": [
    { "name": "الطفطف", "description": "وسيلة المواصلات الأشهر والأمتع في رأس البر، يربط بين شارع النيل والشواطئ.", "price": "أسعار رمزية" },
    { "name": "أتوبيسات شرق الدلتا", "description": "الوسيلة الأساسية للسفر من وإلى القاهرة والمحافظات.", "location": "موقف رأس البر الرئيسي" }
  ]
};

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
    "🎯 خدمة حجز سريعة وآمنة\n\n" +
    "👇 *اختر ما يناسبك من الأزرار أدناه*"
  );
}

// ─── Check Group Membership ───
async function isMember(userId) {
  try {
    const res = await tg("getChatMember", { chat_id: GROUP_CHAT_ID, user_id: userId });
    if (res.ok) {
      const status = res.result.status;
      return ["member", "administrator", "creator"].includes(status);
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function sendJoinPrompt(chatId) {
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      "🔒 *ثانية واحدة بس!*\n\n" +
      "عشان تشوف الإعلانات والعروض، انضم لجروبنا الأول 👇\n" +
      "مجاني وهتلاقي فيه كل جديد عن عقارات رأس البر\n\n" +
      "✅ بعد ما تشترك، ارجع هنا واضغط *تم الاشتراك* 🎉",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 انضم للجروب", url: GROUP_INVITE_LINK }],
        [{ text: "✅ تم الاشتراك", callback_data: "check_membership" }],
      ],
    },
  });
}

// ─── Send Start Menu ───
async function sendStart(chatId) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: getWelcomeMessage(),
    parse_mode: "Markdown",
    reply_markup: buildMainMenu(),
  });
}

// ─── Handle Callback Queries ───
async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  await tg("answerCallbackQuery", { callback_query_id: query.id });

  // Check membership for content sections
  const protectedSections = ["apartments_sale", "garages_sale", "land_sale", "ownership_prices", "apartments_for_sale", "apartments_rent", "area_inside", "area_extension", "area_mostasharin", "area_kentucky", "area_all"];
  if (protectedSections.includes(data)) {
    const userId = query.from.id;
    const member = await isMember(userId);
    if (!member) {
      await sendJoinPrompt(chatId);
      return;
    }
  }

  switch (data) {
    case "main_menu":
      await sendStart(chatId);
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
            [{ text: "🌄 أراضي للبيع", callback_data: "land_sale" }],
            [{ text: "💰 أسعار التمليك", callback_data: "ownership_prices" }],
            [{ text: "🏠 شقق للبيع (كاش/تقسيط)", callback_data: "apartments_for_sale" }],
            [{ text: "🏖️ شقق إيجار", callback_data: "apartments_rent" }],
            [{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
      });
      break;

    case "city_guide":
      await tg("editMessageText", {
        chat_id: chatId,
        message_id: query.message.message_id,
        text: "🏖️ *دليل رأس البر الذكي* 🏖️\n\nأهلاً بك في دليلك الشامل لمدينة رأس البر الساحرة! نحن هنا لنجعل إقامتك أسهل وأمتع.\n\nماذا تود أن تعرف اليوم؟",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📍 أهم المعالم السياحية", callback_data: "guide_spots" }],
            [{ text: "🍴 أفضل المطاعم والحلويات", callback_data: "guide_food" }],
            [{ text: "🚌 المواصلات والخدمات", callback_data: "guide_services" }],
            [{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
      });
      break;

    case "guide_spots": {
      let msg = "📍 *أهم المعالم السياحية في رأس البر*:\n\n";
      GUIDE_DATA.tourist_spots.forEach(s => {
        msg += `✨ *${s.name}*\n📝 ${s.description}\n📍 ${s.location}\n\n`;
      });
      await tg("editMessageText", {
        chat_id: chatId,
        message_id: query.message.message_id,
        text: msg,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "« رجوع للدليل", callback_data: "city_guide" }]] }
      });
      break;
    }

    case "guide_food": {
      let msg = "🍴 *أفضل المطاعم والحلويات*:\n\n";
      GUIDE_DATA.restaurants.forEach(f => {
        msg += `🍽️ *${f.name}*\n📝 ${f.description}\n🏷️ النوع: ${f.type}\n\n`;
      });
      await tg("editMessageText", {
        chat_id: chatId,
        message_id: query.message.message_id,
        text: msg,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "« رجوع للدليل", callback_data: "city_guide" }]] }
      });
      break;
    }

    case "guide_services": {
      let msg = "🚌 *المواصلات والخدمات*:\n\n";
      GUIDE_DATA.transportation.forEach(s => {
        msg += `🚍 *${s.name}*\n📝 ${s.description}\n💰 ${s.price}\n\n`;
      });
      await tg("editMessageText", {
        chat_id: chatId,
        message_id: query.message.message_id,
        text: msg,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "« رجوع للدليل", callback_data: "city_guide" }]] }
      });
      break;
    }

    case "check_membership": {
      const userId = query.from.id;
      const member = await isMember(userId);
      if (member) {
        await tg("sendMessage", { chat_id: chatId, text: "🎉 *تمام، أنت معانا!*\nاتفضل اختار اللي يعجبك 👇", parse_mode: "Markdown" });
        await sendStart(chatId);
      } else {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "😅 *لسه مشتركتش!*\nاضغط على الزر ده وانضم، وبعدين ارجع اضغط تم الاشتراك",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 انضم للجروب", url: GROUP_INVITE_LINK }],
              [{ text: "✅ تم الاشتراك", callback_data: "check_membership" }],
            ],
          },
        });
      }
      break;
    }

    case "apartments_sale":
      await tg("editMessageText", {
        chat_id: chatId,
        message_id: query.message.message_id,
        text: "🏠 *شقق تمليك في رأس البر*\n━━━━━━━━━━━━━━━━\n\nحدد المنطقة اللي تهمك 👇",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌊 داخل رأس البر (الشوارع المرقمة)", callback_data: "area_inside" }],
            [{ text: "🏗️ الامتداد العمراني", callback_data: "area_extension" }],
            [{ text: "🏢 المستشارين", callback_data: "area_mostasharin" }],
            [{ text: "🏪 العاصي وكنتاكي", callback_data: "area_kentucky" }],
            [{ text: "📜 عرض كل الشقق", callback_data: "area_all" }],
            [{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
      });
      break;

    case "area_inside":
    case "area_extension":
    case "area_mostasharin":
    case "area_kentucky":
    case "area_all": {
      const areaKey = data.replace("area_", "");
      const areaNames = { inside: "🌊 داخل رأس البر", extension: "🏗️ الامتداد العمراني", mostasharin: "🏢 المستشارين", kentucky: "🏪 العاصي وكنتاكي", all: "📜 كل الشقق" };
      const allApts = PROPERTIES["apartments_sale"] || [];
      const filtered = areaKey === "all" ? allApts : allApts.filter(p => p.area === areaKey);
      
      if (!filtered || filtered.length === 0) {
        await tg("sendMessage", { chat_id: chatId, text: `لا توجد إعلانات حالياً في *${areaNames[areaKey]}*\n\n📞 كلمنا وهنوفرلك: \`01026569682\``, parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "« رجوع للمناطق", callback_data: "apartments_sale" }], [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]] } });
      } else {
        await tg("sendMessage", { chat_id: chatId, text: `${areaNames[areaKey]} — *${filtered.length} إعلان*`, parse_mode: "Markdown" });
        for (const prop of filtered) {
          const caption = `🏠 *${prop.name}*\n📝 *الوصف*: ${prop.description}\n💰 *السعر*: ${prop.price}\n📍 *الموقع*: ${prop.location}${prop.phone ? `\n📞 *للتواصل*: ${prop.phone}` : ''}`;
          if (prop.images && prop.images.length > 0) { await tg("sendPhoto", { chat_id: chatId, photo: prop.images[0], caption, parse_mode: "Markdown" }); }
          else { await tg("sendMessage", { chat_id: chatId, text: caption, parse_mode: "Markdown" }); }
        }
        await tg("sendMessage", { chat_id: chatId, text: "📞 للمزيد من التفاصيل تواصل معنا: `01026569682`", parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "« رجوع للمناطق", callback_data: "apartments_sale" }], [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }]] } });
      }
      break;
    }

    case "garages_sale":
    case "land_sale":
    case "apartments_rent": {
      const props = PROPERTIES[data];
      if (!props || props.length === 0) {
        await tg("sendMessage", { chat_id: chatId, text: "لا توجد عقارات متاحة حالياً في هذا القسم.", reply_markup: backButton });
      } else {
        for (const prop of props) {
          const caption = `🏠 *${prop.name}*\n📝 *الوصف*: ${prop.description}\n💰 *السعر*: ${prop.price}\n📍 *الموقع*: ${prop.location}${prop.phone ? `\n📞 *للتواصل*: ${prop.phone}` : ''}`;
          if (prop.images && prop.images.length > 0) { await tg("sendPhoto", { chat_id: chatId, photo: prop.images[0], caption, parse_mode: "Markdown" }); }
          else { await tg("sendMessage", { chat_id: chatId, text: caption, parse_mode: "Markdown" }); }
        }
        await tg("sendMessage", { chat_id: chatId, text: "📞 للمزيد من التفاصيل تواصل معنا: `01026569682`", parse_mode: "Markdown", reply_markup: backButton });
      }
      break;
    }

    case "ownership_prices":
      await tg("sendMessage", {
        chat_id: chatId,
        text: "💰 *أسعار التمليك في رأس البر (2025/2026)*\n━━━━━━━━━━━━━━━━\n\n📊 *متوسط سعر المتر*: حوالي *29,700 جنيه/م²*\n\n🏠 *عمارات المستشارين*:\n➖ غرفتين (60 م²): من *900,000* إلى *1,200,000 جنيه*\n➖ 3 غرف: من *1,200,000* إلى *1,500,000 جنيه*\n\n🏙️ *الامتداد العمراني*:\n➖ غرفتين (60 م²): من *1,200,000* إلى *1,900,000 جنيه*\n➖ أجنحة (120 م²): تصل إلى *5,000,000 جنيه*\n\n📞 تواصل معنا: `01026569682`",
        parse_mode: "Markdown",
        reply_markup: backButton,
      });
      break;

    case "booking_request":
      await tg("sendMessage", { chat_id: chatId, text: "📝 لبدء طلب الحجز، من فضلك أرسل رسالة تحتوي على:\n1. اسمك بالكامل\n2. رقم تليفونك\n3. اسم الشقة أو نوع الطلب\n\nوسنتواصل معك فوراً!", parse_mode: "Markdown", reply_markup: backButton });
      break;

    case "contact":
      await tg("sendMessage", { chat_id: chatId, text: "📞 *تواصل مع مكتب الوحيد للاستثمار العقاري*:\n➖ رقم الهاتف: `01026569682`\n➖ واتساب: `01026569682`\n➖ العنوان: رأس البر، شارع 85 فيلا 31", parse_mode: "Markdown", reply_markup: backButton });
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

  if (text === "/start" || text === "/menu" || text.startsWith("/start ")) {
    await sendStart(chatId);
    return;
  }

  if (chatType === "group" || chatType === "supergroup") {
    const keywords = ["شقة", "إيجار", "ايجار", "رأس البر", "عقار", "شاليه", "تمليك", "شراء", "بيع", "فيلا", "استثمار", "بحر", "مصيف", "إجازة", "سكن"];
    if (keywords.some(k => text.toLowerCase().includes(k))) {
      await tg("sendMessage", { chat_id: chatId, text: "🏖️ *عروض عقارات رأس البر!*\nشقق إيجار وتمليك بأسعار مميزة! 🏠\n📞 تواصل معنا: `01026569682`\n📢 انضم لمجموعتنا: " + GROUP_INVITE_LINK, parse_mode: "Markdown", disable_web_page_preview: true });
    }
    return;
  }

  if (chatType === "private" && text.length > 5) {
    await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, text: `🔔 *رسالة جديدة من مستخدم*\n👤 *الاسم*: ${message.from.first_name}\n🆔 *ID*: ${message.from.id}\n📝 *الرسالة*:\n${text}`, parse_mode: "Markdown" });
    await tg("sendMessage", { chat_id: chatId, text: "✅ تم استلام رسالتك! سنتواصل معك قريباً.\n📞 أو تواصل مباشرة: `01026569682`", parse_mode: "Markdown", reply_markup: backButton });
  }
}

// ─── Netlify Function Handler ───
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 200, body: "✅ RasElBarBot is running!" };
  try {
    const update = JSON.parse(event.body);
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (update.message) await handleMessage(update.message);
    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 200, body: "OK" };
  }
};
