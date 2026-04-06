import os
import json
import sqlite3
import logging
import re
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    ContextTypes,
    filters,
    ConversationHandler,
)

# إعداد التسجيل (Logging)
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# تحميل الإعدادات من المتغيرات البيئية
TOKEN = os.getenv('TELEGRAM_TOKEN', '7370819571:AAF697gifhVCaY6Y5JpVxvJj8AUdqyi6u04')
ADMIN_CHAT_ID = os.getenv('ADMIN_CHAT_ID', '8084142659')
GROUP_INVITE_LINK = 'https://t.me/raselbarbot'

# حالات المحادثة للحجز
GET_NAME, GET_PHONE, GET_APARTMENT, GET_DATES = range(4)

# دالة لتنظيف النصوص لـ MarkdownV2
def escape_markdown(text):
    if not text:
        return ""
    # الرموز التي يجب الهروب منها في MarkdownV2
    escape_chars = r'_*[]()~`>#+-=|{}.!'
    return re.sub(f'([{re.escape(escape_chars)}])', r'\\\1', str(text))

# تحميل بيانات العقارات
def load_properties():
    try:
        with open('properties.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("properties.json not found!")
        return {}

PROPERTIES_DATA = load_properties()

# إعداد قاعدة بيانات SQLite
def init_db():
    conn = sqlite3.connect('bookings.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS bookings
                 (id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, phone TEXT, apartment TEXT, dates TEXT, timestamp TEXT)''')
    conn.commit()
    conn.close()

init_db()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🏠 شقق للبيع", callback_data='apartments_sale')],
        [InlineKeyboardButton("🏖️ شاليهات للبيع", callback_data='chalets_sale')],
        [InlineKeyboardButton("🌄 أراضي للبيع", callback_data='land_sale')],
        [InlineKeyboardButton("💰 أسعار التمليك", callback_data='ownership_prices')],
        [InlineKeyboardButton("🏠 شقق للبيع (كاش/تقسيط)", callback_data='apartments_for_sale')],
        [InlineKeyboardButton("🏖️ شقق إيجار", callback_data='apartments_rent')],
        [InlineKeyboardButton("📝 إرسال طلب حجز", callback_data='booking_request')],
        [InlineKeyboardButton("🌐 زور موقعنا للإيجار", url='https://ras-elbar-egar.netlify.app/')],
        [InlineKeyboardButton("📱 صفحتنا على فيسبوك", url='https://www.facebook.com/akarat.raaselbar')],
        [InlineKeyboardButton("📞 تواصل معنا", callback_data='contact')],
        [InlineKeyboardButton("📢 انضم لمجموعتنا", url=GROUP_INVITE_LINK)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    text = "مرحبًا بك في بوت عقارات رأس البر\\! اختر نوع العقار أو الخدمة:"
    if update.message:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='MarkdownV2')
    elif update.callback_query:
        await update.callback_query.message.reply_text(text, reply_markup=reply_markup, parse_mode='MarkdownV2')

async def contact(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = (
        "📞 *تواصل مع مكتب الوحيد للاستثمار العقاري*:\n"
        "➖ رقم الهاتف: `01026569682`\n"
        "➖ واتساب: `01026569682`\n"
        "➖ العنوان: رأس البر، شارع 85 فيلا 31"
    )
    if update.message:
        await update.message.reply_text(escape_markdown(message), parse_mode='MarkdownV2')
    elif update.callback_query:
        await update.callback_query.message.reply_text(escape_markdown(message), parse_mode='MarkdownV2')

async def group_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message and update.message.chat.type in ['group', 'supergroup']:
        text = update.message.text.lower()
        keywords = ['شقة', 'إيجار', 'ايجار', 'رأس البر', 'عقار', 'شاليه', 'تمليك', 'شراء', 'بيع', 'فيلا', 'استثمار', 'بحر', 'مصيف', 'إجازة', 'سكن']
        if any(keyword in text for keyword in keywords):
            message = (
                "🏖️ *عروض عقارات رأس البر\\!*\n"
                "شقق إيجار وتمليك بأسعار مميزة\\! 🏠\n"
                "📞 تواصل معنا: `01026569682`\n"
                f"📢 انضم لمجموعتنا: {escape_markdown(GROUP_INVITE_LINK)}\n"
                "🌐 زور موقعنا: [اضغط هنا](https://ras-elbar-egar.netlify.app/)"
            )
            await update.message.reply_text(message, parse_mode='MarkdownV2', disable_web_page_preview=True)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data in PROPERTIES_DATA:
        properties = PROPERTIES_DATA[data]
        for prop in properties:
            message = (
                f"🏠 *{escape_markdown(prop['name'])}*\n"
                f"📝 *الوصف*: {escape_markdown(prop['description'])}\n"
                f"💰 *السعر*: {escape_markdown(prop['price'])}\n"
                f"📍 *الموقع*: {escape_markdown(prop['location'])}"
            )
            if prop.get('images'):
                await query.message.reply_photo(photo=prop['images'][0], caption=message, parse_mode='MarkdownV2')
            else:
                await query.message.reply_text(message, parse_mode='MarkdownV2')

    elif data == 'ownership_prices':
        message = (
            "💰 *أسعار التمليك في رأس البر*:\n\n"
            "🏠 *عمارات المستشارين*:\n"
            "➖ الأسعار تبدأ من *900,000 جنيه*\\.\n\n"
            "🏙️ *الامتداد العمراني*:\n"
            "➖ شقق غرفتين \\(60 متر\\): من *1,200,000* إلى *1,900,000 جنيه*\\.\n"
            "➖ أجنحة \\(120 متر\\): تصل إلى *5,000,000 جنيه* حسب الموقع والتشطيب\\.\n\n"
            "🌊 *شوارع رأس البر الرئيسية*:\n"
            "➖ الفيلات: من *1,700,000* إلى *6,000,000 جنيه* حسب العمر، الموقع، والاتجاه\\.\n"
            "➖ المنطقة الأولى: أسعار أعلى حسب المواصفات\\.\n\n"
            "📞 تواصل مع مكتب الوحيد لمزيد من التفاصيل: `01026569682`"
        )
        await query.message.reply_text(message, parse_mode='MarkdownV2')

    elif data == 'apartments_for_sale':
        message = (
            "🏠 *شقق للبيع في رأس البر*:\n\n"
            "لدينا العديد من الشقق في شوارع وأماكن مختلفة:\n"
            "➖ 🏗️ *تقسيط حتى سنة*: شقق تحت الإنشاء\\.\n"
            "➖ 💵 *كاش*: استلام فوري\\.\n\n"
            "📞 نرجو الاتصال بمكتب الوحيد لمعرفة الأماكن والأسعار: `01026569682`"
        )
        await query.message.reply_text(message, parse_mode='MarkdownV2')

    elif data == 'apartments_rent':
        intro = (
            "🏖️ *شقق إيجار في رأس البر*:\n\n"
            "💰 *أسعار الإيجار* تتحدد حسب التوقيت، الموقع، القرب من البحر، ومستوى الشقة:\n"
            "➖ *قبل الموسم \\(قبل يونيو\\)*:\n"
            "  ➖ شقق من *250\\-300 جنيه/اليوم*\\.\n"
            "  ➖ أول مطل: حتى *1,500 جنيه/اليوم*\\.\n"
            "➖ *موسم الصيف \\(يونيو وما بعد\\)*:\n"
            "  ➖ الأسعار ترتفع مع الازدحام \\(الطلب أعلى من العرض\\)\\.\n"
            "  ➖ أول مطل: تصل إلى *4,000 جنيه/اليوم*\\.\n\n"
            "🏠 *شقق الإيجار المتاحة*:"
        )
        await query.message.reply_text(intro, parse_mode='MarkdownV2')
        
        rentals = PROPERTIES_DATA.get('apartments_rent', [])
        for prop in rentals:
            message = (
                f"🏠 *{escape_markdown(prop['name'])}*\n"
                f"📝 *الوصف*: {escape_markdown(prop['description'])}\n"
                f"💰 *السعر*: {escape_markdown(prop['price'])}\n"
                f"📍 *الموقع*: {escape_markdown(prop['location'])}\n"
                f"📞 تواصل للحجز: `01026569682`"
            )
            if prop.get('images'):
                await query.message.reply_photo(photo=prop['images'][0], caption=message, parse_mode='MarkdownV2')
            else:
                await query.message.reply_text(message, parse_mode='MarkdownV2')
        
        contact_info = (
            "🔗 *لمعرفة المتاح والأسعار*:\n"
            "➖ زور موقعنا: [اضغط هنا](https://ras-elbar-egar.netlify.app/)\n"
            "➖ تابع صفحتنا على فيسبوك: [اضغط هنا](https://www.facebook.com/akarat.raaselbar)\n"
            "➖ 📞 اتصل بمكتب الوحيد: `01026569682`"
        )
        await query.message.reply_text(contact_info, parse_mode='MarkdownV2', disable_web_page_preview=True)

    elif data == 'booking_request':
        await query.message.reply_text("📝 لبدء طلب الحجز، من فضلك أرسل *اسمك بالكامل*:")
        return GET_NAME

    elif data == 'contact':
        await contact(update, context)

# معالجة محادثة الحجز
async def booking_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.message.reply_text("📝 لبدء طلب الحجز، من فضلك أرسل *اسمك بالكامل*:", parse_mode='MarkdownV2')
    return GET_NAME

async def get_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['name'] = update.message.text
    await update.message.reply_text(f"أهلاً بك {update.message.text}\\! الآن أرسل *رقم تليفونك*:", parse_mode='MarkdownV2')
    return GET_PHONE

async def get_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['phone'] = update.message.text
    await update.message.reply_text("تمام\\! ما هو *اسم الشقة* التي تود حجزها؟", parse_mode='MarkdownV2')
    return GET_APARTMENT

async def get_apartment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['apartment'] = update.message.text
    await update.message.reply_text("أخيراً، ما هي *تواريخ الحجز* المطلوبة؟ (مثلاً: من 1-6 إلى 5-6)", parse_mode='MarkdownV2')
    return GET_DATES

async def get_dates(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['dates'] = update.message.text
    user_id = update.message.from_user.id
    name = context.user_data['name']
    phone = context.user_data['phone']
    apartment = context.user_data['apartment']
    dates = context.user_data['dates']
    timestamp = str(update.message.date)

    # حفظ في قاعدة البيانات
    conn = sqlite3.connect('bookings.db')
    c = conn.cursor()
    c.execute("INSERT INTO bookings (user_id, name, phone, apartment, dates, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
              (user_id, name, phone, apartment, dates, timestamp))
    conn.commit()
    conn.close()

    await update.message.reply_text("✅ تم تسجيل طلب الحجز بنجاح\\! سنتواصل معك قريبًا للتأكيد\\.", parse_mode='MarkdownV2')

    # إشعار للمسؤول
    admin_message = (
        f"🔔 *طلب حجز جديد*\n\n"
        f"👤 *الاسم*: {escape_markdown(name)}\n"
        f"📱 *رقم التليفون*: `{escape_markdown(phone)}`\n"
        f"🏠 *الشقة*: {escape_markdown(apartment)}\n"
        f"📅 *التواريخ*: {escape_markdown(dates)}\n"
        f"🕒 *الوقت*: {escape_markdown(timestamp)}"
    )
    try:
        await context.bot.send_message(chat_id=ADMIN_CHAT_ID, text=admin_message, parse_mode='MarkdownV2')
    except Exception as e:
        logger.error(f"Error sending admin notification: {e}")

    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("تم إلغاء طلب الحجز\\.", parse_mode='MarkdownV2')
    return ConversationHandler.END

def main():
    if not TOKEN:
        logger.error("No token provided!")
        return

    app = Application.builder().token(TOKEN).build()

    # إعداد ConversationHandler للحجز
    booking_conv = ConversationHandler(
        entry_points=[CallbackQueryHandler(booking_start, pattern='^booking_request$')],
        states={
            GET_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_name)],
            GET_PHONE: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_phone)],
            GET_APARTMENT: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_apartment)],
            GET_DATES: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_dates)],
        },
        fallbacks=[CommandHandler('cancel', cancel)],
    )

    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('contact', contact))
    app.add_handler(CommandHandler('menu', start))
    app.add_handler(booking_conv)
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND & filters.ChatType.GROUPS, group_message_handler))

    # تشغيل البوت
    # ملاحظة: تم تبسيط التشغيل ليعمل محلياً أو على الخادم بسهولة
    port = int(os.getenv('PORT', 5000))
    domain = os.getenv('RENDER_EXTERNAL_HOSTNAME') or os.getenv('RAILWAY_PUBLIC_DOMAIN')
    
    if domain:
        logger.info(f"Starting webhook on port {port} with domain {domain}")
        app.run_webhook(
            listen='0.0.0.0',
            port=port,
            url_path=TOKEN,
            webhook_url=f'https://{domain}/{TOKEN}'
        )
    else:
        logger.info("Starting polling...")
        app.run_polling()

if __name__ == '__main__':
    main()

