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
      [{ text: "🚗 جراجات للبيع", callback_data: "garages_sale" }],
      [{ text: "🌄 أراضي للبيع", callback_data: "land_sale" }],
      [{ text: "💰 أسعار التمليك", callback_data: "ownership_prices" }],
      [{ text: "🏠 شقق للبيع (كاش/تقسيط)", callback_data: "apartments_for_sale" }],
      [{ text: "🏖️ شقق إيجار", callback_data: "apartments_rent" }],
      [{ text: "📝 إرسال طلب حجز", callback_data: "booking_request" }],
      [{ text: "🌐 زور موقعنا للإيجار", url: "https://ras-elbar-egar.netlify.app/" }],
      [{ text: "📱 صفحتنا على فيسبوك", url: "https://www.facebook.com/akarat.raaselbar" }],
      [{ text: "💡 نصائح عقارية وقانونية", callback_data: "tips_menu" }],
      [{ text: "📞 تواصل معنا", callback_data: "contact" }],
      [{ text: "📢 انضم لمجموعتنا", url: GROUP_INVITE_LINK }],
    ],
  };
}

const backButton = {
  inline_keyboard: [[{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }]],
};

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
    const phoneLine = prop.phone ? `\n📞 *للتواصل*: ${prop.phone}` : '';
    const caption =
      `🏠 *${prop.name}*\n` +
      `📝 *الوصف*: ${prop.description}\n` +
      `💰 *السعر*: ${prop.price}\n` +
      `📍 *الموقع*: ${prop.location}` +
      phoneLine;

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

    case "check_membership": {
      const userId = query.from.id;
      const member = await isMember(userId);
      if (member) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "🎉 *تمام، أنت معانا!*\nاتفضل اختار اللي يعجبك 👇",
          parse_mode: "Markdown",
        });
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
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🏠 *شقق تمليك في رأس البر*\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "حدد المنطقة اللي تهمك 👇",
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
      const areaNames = {
        inside: "🌊 داخل رأس البر",
        extension: "🏗️ الامتداد العمراني",
        mostasharin: "🏢 المستشارين",
        kentucky: "🏪 العاصي وكنتاكي",
        all: "📜 كل الشقق"
      };
      const allApts = PROPERTIES["apartments_sale"] || [];
      const filtered = areaKey === "all" ? allApts : allApts.filter(p => p.area === areaKey);
      
      if (!filtered || filtered.length === 0) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `لا توجد إعلانات حالياً في *${areaNames[areaKey]}*\n\n📞 كلمنا وهنوفرلك: \`01026569682\``,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "« رجوع للمناطق", callback_data: "apartments_sale" }],
              [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }],
            ],
          },
        });
      } else {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `${areaNames[areaKey]} — *${filtered.length} إعلان*`,
          parse_mode: "Markdown",
        });
        for (const prop of filtered) {
          const phoneLine = prop.phone ? `\n📞 *للتواصل*: ${prop.phone}` : '';
          const caption =
            `🏠 *${prop.name}*\n` +
            `📝 *الوصف*: ${prop.description}\n` +
            `💰 *السعر*: ${prop.price}\n` +
            `📍 *الموقع*: ${prop.location}` +
            phoneLine;
          if (prop.images && prop.images.length > 0) {
            await tg("sendPhoto", { chat_id: chatId, photo: prop.images[0], caption, parse_mode: "Markdown" });
          } else {
            await tg("sendMessage", { chat_id: chatId, text: caption, parse_mode: "Markdown" });
          }
        }
        await tg("sendMessage", {
          chat_id: chatId,
          text: "📞 للمزيد من التفاصيل تواصل معنا: `01026569682`",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "« رجوع للمناطق", callback_data: "apartments_sale" }],
              [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }],
            ],
          },
        });
      }
      break;
    }

    case "garages_sale":
    case "land_sale":
      await sendProperties(chatId, data);
      break;

    case "ownership_prices":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "💰 *أسعار التمليك في رأس البر (2025/2026)*\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "📊 *متوسط سعر المتر*: حوالي *29,700 جنيه/م²*\n\n" +
          "🏠 *عمارات المستشارين*:\n" +
          "➖ غرفتين (60 م²): من *900,000* إلى *1,200,000 جنيه*\n" +
          "➖ 3 غرف: من *1,200,000* إلى *1,500,000 جنيه*\n" +
          "➖ عقد مسجل + حصة في الأرض\n\n" +
          "🏙️ *الامتداد العمراني*:\n" +
          "➖ غرفتين (60 م²): من *1,200,000* إلى *1,900,000 جنيه*\n" +
          "➖ أجنحة (120 م²): تصل إلى *5,000,000 جنيه*\n" +
          "➖ أراضي (200+ م²): من *5,000,000 جنيه*\n\n" +
          "🏪 *منطقة كنتاكي*:\n" +
          "➖ شقق (60 م²): من *1,500,000 جنيه*\n" +
          "➖ مساحات أكبر (80+ م²): من *2,000,000 جنيه*\n" +
          "➖ أجنحة: تصل إلى *4,000,000 جنيه*\n\n" +
          "🌊 *داخل رأس البر (الشوارع المرقمة)*:\n" +
          "➖ شقق من شارع 101: تبدأ من *2,000,000 جنيه*\n" +
          "➖ المنطقة الأولى: من *3,000,000* إلى *7,000,000 جنيه*\n" +
          "➖ مطل بحر مباشر: الأسعار أعلى حسب الدور\n\n" +
          "🏢 *عمارات العرايس (101 إلى 77)*:\n" +
          "➖ غرفتين (90 م²): من *1,800,000 جنيه*\n" +
          "➖ 3 غرف (116 م²): من *2,500,000 جنيه*\n" +
          "➖ ليس لها حصة في الأرض\n\n" +
          "🏖️ *الكمبوندات (صن سيت، دوراي باي)*:\n" +
          "➖ شقق (70-90 م²): من *2,250,000* إلى *4,500,000 جنيه*\n" +
          "➖ شاليهات: من *4,000,000* إلى *16,000,000+ جنيه*\n\n" +
          "━━━━━━━━━━━━━━━━\n" +
          "⚠️ الأسعار تقريبية وتختلف حسب الدور والاتجاه والتشطيب\n" +
          "📞 للأسعار الدقيقة تواصل مع مكتب الوحيد: `01026569682`",
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

    // ─── Tips Section (Open - No membership required) ───
    case "tips_menu":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "💡 *نصائح عقارية وقانونية*\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "اختار القسم اللي يهمك 👇",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🏠 قبل ما تشتري شقة", callback_data: "tips_buying" }],
            [{ text: "📜 نصائح قانونية وعقود", callback_data: "tips_legal" }],
            [{ text: "🚨 احمي نفسك من النصب", callback_data: "tips_scam" }],
            [{ text: "📋 أوراق مطلوبة للتمليك", callback_data: "tips_docs" }],
            [{ text: "🌊 نصائح مصايف رأس البر", callback_data: "tips_resort" }],
            [{ text: "« الرجوع للقائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
      });
      break;

    case "tips_buying":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🏠 *نصائح ذهبية قبل شراء شقة تمليك*\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "1️⃣ *حدد هدفك الأول*\n" +
          "سكن ولا استثمار؟ ده بيفرق في اختيار المكان والمساحة والسعر.\n\n" +
          "2️⃣ *عاين الشقة بنفسك*\n" +
          "زور المكان أكتر من مرة وفي أوقات مختلفة (صبح ومساء). شوف الجيران والخدمات والشوارع.\n\n" +
          "3️⃣ *متخليش السعر يخدعك*\n" +
          "سعر رخيص أوي ممكن يكون فخ! قارن بين 10-15 شقة قبل ما تقرر.\n\n" +
          "4️⃣ *اسأل عن حصة الأرض*\n" +
          "شقة بدون حصة في الأرض = خطر! لو العمارة اتشالت مش هيبقى لك حق في الأرض.\n\n" +
          "5️⃣ *افحص البنية التحتية*\n" +
          "كهرباء، مياه، صرف، مصعد، سلالم. الشقق القديمة بتحتاج صيانة مكلفة.\n\n" +
          "6️⃣ *متستعجلش*\n" +
          "أي بائع بيضغط عليك تقرر بسرعة — ده علامة تحذير!\n\n" +
          "7️⃣ *فكّر في المستقبل*\n" +
          "المناطق الجديدة أسعارها بتزيد مع الوقت. الامتداد العمراني في رأس البر فرصة استثمارية.\n\n" +
          "━━━━━━━━━━━━━━━━\n" +
          "📞 محتاج مساعدة؟ كلمنا: `01026569682`",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "« رجوع للنصائح", callback_data: "tips_menu" }],
            [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
      });
      break;

    case "tips_legal":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "📜 *نصائح قانونية مهمة للعقارات*\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "⚖️ *التسجيل في الشهر العقاري*\n" +
          "العقد العرفي لوحده مش بينقل الملكية! الملكية بتنتقل بس بالتسجيل في الشهر العقاري.\n\n" +
          "📝 *أنواع التسجيل:*\n" +
          "➖ *رضائي*: البائع والمشتري يروحوا سوا للشهر العقاري\n" +
          "➖ *صحة ونفاذ*: عن طريق حكم من المحكمة ثم تسجيل الحكم\n\n" +
          "⚠️ *خطر عدم التسجيل:*\n" +
          "➖ مش هتقدر تحتج بالعقد على أي حد تاني\n" +
          "➖ لو حد سجّل قبلك هياخد الشقة حتى لو اشتراها بعدك\n" +
          "➖ البيع بدون تسجيل = مخاطرة كبيرة\n\n" +
          "📋 *شروط التسجيل الجديدة (2025):*\n" +
          "➖ لازم العقد الابتدائي (العرفي) موجود\n" +
          "➖ معاينة ميدانية من مأمور الشهر العقاري\n" +
          "➖ خريطة العقار الرقمية + أوراق المالك\n" +
          "➖ أقوال الجيران والشهود\n\n" +
          "💡 *تسلسل الملكية*\n" +
          "تأكد إن كل مالك سابق سجّل قبل اللي بعده. سلسلة مكسورة = مشكلة.\n\n" +
          "━━━━━━━━━━━━━━━━\n" +
          "⚠️ *نصيحة*: استعين بمحامي قبل ما توقع أي عقد!",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "« رجوع للنصائح", callback_data: "tips_menu" }],
            [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
      });
      break;

    case "tips_scam":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🚨 *احمي نفسك من النصب العقاري*\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "🔴 *أشهر طرق النصب في مصر:*\n\n" +
          "1️⃣ *بيع عقار لأكتر من شخص*\n" +
          "البائع بيبيع نفس الشقة لعدة مشترين! الحل: سجّل فوراً في الشهر العقاري.\n\n" +
          "2️⃣ *بيع ملك الغير*\n" +
          "شخص بيبيعك شقة مش ملكه! الحل: تأكد من سند الملكية وتسلسلها.\n\n" +
          "3️⃣ *مشاريع وهمية*\n" +
          "صور 3D حلوة لمشروع مش موجود! الحل: زور الموقع بنفسك واسأل الجيران.\n\n" +
          "4️⃣ *صكوك وأوراق مزورة*\n" +
          "توكيلات منتهية أو عقود مزورة. الحل: راجع الشهر العقاري.\n\n" +
          "5️⃣ *سعر أقل من السوق بكتير*\n" +
          "لو العرض حلو أوي — اشتبه! غالباً فيه حاجة غلط.\n\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "✅ *ازاي تحمي نفسك:*\n" +
          "➖ اطلب كل الأوراق واتأكد من الشهر العقاري\n" +
          "➖ متدفعش فلوس من غير إيصال رسمي\n" +
          "➖ عاين المكان بنفسك واسأل الجيران والبواب\n" +
          "➖ تأكد التوكيلات سارية المفعول\n" +
          "➖ استعين بمحامي قبل التوقيع\n" +
          "➖ وثّق كل حاجة (محادثات، صور، تحويلات)\n\n" +
          "🆘 *لو اتنصب عليك:*\n" +
          "➖ بلاغ في أقرب قسم شرطة\n" +
          "➖ دعوى صحة ونفاذ في المحكمة\n" +
          "➖ شكوى في جهاز حماية المستهلك",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "« رجوع للنصائح", callback_data: "tips_menu" }],
            [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
      });
      break;

    case "tips_docs":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "📋 *الأوراق المطلوبة لشراء شقة تمليك*\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "📄 *أوراق لازم تطلبها من البائع:*\n" +
          "➖ عقد الملكية الأصلي\n" +
          "➖ تسلسل الملكية (كل العقود من المالك الأول)\n" +
          "➖ ترخيص المباني ساري\n" +
          "➖ آخر 3 إيصالات مرافق (كهرباء، مياه، غاز)\n" +
          "➖ صورة بطاقة المالك\n" +
          "➖ التوكيل الرسمي (لو فيه وسيط)\n\n" +
          "✅ *تأكد من:*\n" +
          "➖ الشقة مش متعدية على أملاك الدولة\n" +
          "➖ العمارة مرخصة (عشان متتشالش)\n" +
          "➖ فيه عداد كهرباء رئيسي للعمارة\n" +
          "➖ الشقة مش مباعة أو مؤجرة قبل كده (شهادة سلبية)\n" +
          "➖ لو الشقة ميراث — كل الورثة موافقين بتوكيل رسمي\n\n" +
          "📝 *في العقد اكتب:*\n" +
          "➖ المساحة الكاملة بالمتر\n" +
          "➖ قيمة الأقساط ومواعيدها\n" +
          "➖ تاريخ التسليم المحدد\n" +
          "➖ حصة الأرض (مهم جداً!)\n" +
          "➖ غرامة التأخير\n\n" +
          "🏛️ *بعد الشراء:*\n" +
          "➖ سجّل في الشهر العقاري فوراً\n" +
          "➖ اعمل توكيل رسمي من البائع\n" +
          "➖ حوّل العدادات باسمك",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "« رجوع للنصائح", callback_data: "tips_menu" }],
            [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
      });
      break;

    case "tips_resort":
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🌊 *نصائح المصايف ورأس البر*\n" +
          "━━━━━━━━━━━━━━━━\n\n" +
          "🏖️ *لو بتشتري للمصيف:*\n" +
          "➖ الشوارع من 33 لـ 77 أقرب للبحر وأغلى\n" +
          "➖ بحري شرقي = الشمس بعيدة عنك بعد الضهر (الأفضل)\n" +
          "➖ الدور الأول والأخير أرخص — الأوسط أغلى\n" +
          "➖ أول مطل بحر = ضعف السعر تقريباً\n\n" +
          "📍 *أفضل مناطق رأس البر للاستثمار:*\n" +
          "➖ *الامتداد العمراني*: أسعار لسه معقولة وبتزيد\n" +
          "➖ *المنطقة الأولى*: أغلى بس مطلوبة جداً\n" +
          "➖ *كمبوندات صن سيت*: استثمار مضمون\n" +
          "➖ *شارع النخيل*: واجهة مميزة\n\n" +
          "💰 *لو بتأجر للمصيف:*\n" +
          "➖ احجز بدري (قبل يونيو) الأسعار بتكون نص\n" +
          "➖ اسأل عن العدادات والمياه قبل ما تدفع\n" +
          "➖ صوّر الشقة وقت الاستلام\n" +
          "➖ اتفق على كل حاجة كتابي\n\n" +
          "🌤️ *أفضل وقت لزيارة رأس البر:*\n" +
          "➖ مايو ويونيو: جو جميل وأسعار معقولة\n" +
          "➖ يوليو وأغسطس: ذروة الموسم وأغلى الأسعار\n" +
          "➖ سبتمبر: هادي وجميل ورخيص\n\n" +
          "━━━━━━━━━━━━━━━━\n" +
          "📞 محتاج شقة في رأس البر؟ كلمنا: `01026569682`",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "« رجوع للنصائح", callback_data: "tips_menu" }],
            [{ text: "🏠 القائمة الرئيسية", callback_data: "main_menu" }],
          ],
        },
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
  if (text === "/start" || text === "/menu" || text.startsWith("/start ")) {
    if (text === "/start welcome") {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "🏖 *أهلاً بيك في بوت عقارات رأس البر\!*\n\n" +
          "أنت في المكان الصح 👌\n" +
          "هنا هتلاقي أحدث إعلانات الشقق والجراجات والأراضي في رأس البر\n" +
          "كل الإعلانات بأرقام حقيقية من المالك مباشرة\n\n" +
          "اختار من القائمة تحت واستكشف 👇",
        parse_mode: "MarkdownV2",
      });
    }
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
    const keywords = ["شقة", "إيجار", "ايجار", "رأس البر", "عقار", "شاليه", "تمليك", "شراء", "بيع", "فيلا", "استثمار", "بحر", "مصيف", "إجازة", "سكن", "جراج", "جراش", "أرض", "ارض"];
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
