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
)

# إعداد التسجيل (Logging)
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# تحميل الإعدادات من المتغيرات البيئية
TOKEN = os.getenv('TELEGRAM_TOKEN', '7370819571:AAHycxAHIt8VRm5tM468hePYtgHke6uChhk')
ADMIN_CHAT_ID = os.getenv('ADMIN_CHAT_ID', '8084142659')
GROUP_INVITE_LINK = 'https://t.me/raselbarbot'
CHANNEL_LINK = 'https://t.me/e3lan_akary'

# دالة لتنظيف النصوص لـ MarkdownV2
def escape_markdown(text):
    if not text:
        return ""
    escape_chars = r'_*[]()~`>#+-=|{}.!'
    return re.sub(f'([{re.escape(escape_chars)}])', r'\\\1', str(text))

# تحميل بيانات العقارات والدليل
def load_json_data(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"{filename} not found!")
        return {}

PROPERTIES_DATA = load_json_data('properties.json')
GUIDE_DATA = load_json_data('ras_elbar_guide_data.json')

# رسالة الترحيب الفاخرة
def get_welcome_message():
    return (
        "🏖️ *مرحباً بك في عالم عقارات رأس البر الفاخرة\\!* 🏖️\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "🏠 *اكتشف أفضل العقارات والشقق الفاخرة*\n"
        "💰 *أسعار تنافسية وخدمة عملاء متميزة*\n"
        "📍 *مواقع استراتيجية قريبة من البحر*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "✨ *ماذا نقدم لك؟*\n"
        "🏠 شقق للبيع والإيجار\n"
        "🏖️ شاليهات فاخرة مطلة على البحر\n"
        "🗺️ *دليل رأس البر الذكي لخدمتك*\n"
        "⚖️ *نصائح عقارية وقانونية تهمك*\n"
        "🎯 خدمة حجز سريعة وآمنة\n\n"
        "👇 *اختر ما يناسبك من الأزرار أدناه*"
    )

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🏠 تصفح العقارات", callback_data='browse_properties')],
        [InlineKeyboardButton("🏖️ دليل رأس البر الذكي", callback_data='city_guide')],
        [InlineKeyboardButton("⚖️ نصائح عقارية وقانونية", callback_data='legal_tips')],
        [InlineKeyboardButton("📝 إرسال طلب حجز", callback_data='booking_request')],
        [InlineKeyboardButton("🌐 موقعنا للإيجار", url='https://egarat.netlify.app/')],
        [InlineKeyboardButton("📞 تواصل معنا", callback_data='contact')],
        [InlineKeyboardButton("📢 انضم لقناتنا", url=CHANNEL_LINK)],
        [InlineKeyboardButton("👥 مجموعتنا على تليجرام", url=GROUP_INVITE_LINK)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    text = get_welcome_message()
    
    if update.message:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='MarkdownV2')
    elif update.callback_query:
        await update.callback_query.message.edit_text(text, reply_markup=reply_markup, parse_mode='MarkdownV2')

async def browse_properties(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    keyboard = [
        [InlineKeyboardButton("🏠 شقق للبيع", callback_data='apartments_sale')],
        [InlineKeyboardButton("🏖️ شقق إيجار", callback_data='apartments_rent')],
        [InlineKeyboardButton("🌄 أراضي وجراجات", callback_data='land_sale')],
        [InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data='main_menu')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text("🏠 *تصفح أفضل العقارات في رأس البر*:\nاختر القسم الذي تود استكشافه:", reply_markup=reply_markup, parse_mode='MarkdownV2')

async def city_guide(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    keyboard = [
        [InlineKeyboardButton("📍 أهم المعالم السياحية", callback_data='guide_spots')],
        [InlineKeyboardButton("🍴 أفضل المطاعم والحلويات", callback_data='guide_food')],
        [InlineKeyboardButton("🚌 المواصلات والخدمات", callback_data='guide_services')],
        [InlineKeyboardButton("🔙 العودة للقائمة الرئيسية", callback_data='main_menu')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    message = (
        "🏖️ *دليل رأس البر الذكي* 🏖️\n\n"
        "أهلاً بك في دليلك الشامل لمدينة رأس البر الساحرة\\! "
        "نحن هنا لنجعل إقامتك أسهل وأمتع\\.\n\n"
        "ماذا تود أن تعرف اليوم؟"
    )
    await query.edit_message_text(message, reply_markup=reply_markup, parse_mode='MarkdownV2')

async def legal_tips(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    text = (
        "⚖️ *نصائح عقارية وقانونية هامة* ⚖️\n\n"
        "1️⃣ *التأكد من الملكية*: يجب مراجعة تسلسل الملكية وعقد البيع الأصلي\\.\n"
        "2️⃣ *التراخيص*: تأكد من أن العقار مرخص وليس عليه مخالفات بناء\\.\n"
        "3️⃣ *المرافق*: تحقق من سداد كافة فواتير الكهرباء والمياه\\.\n"
        "4️⃣ *عقود الإيجار*: تأكد من توثيق العقد في الشهر العقاري لضمان حقك\\.\n\n"
        "💡 *نصيحة*: لا تدفع مبالغ كبيرة قبل المعاينة الفعلية والتأكد من الأوراق\\."
    )
    keyboard = [[InlineKeyboardButton("🔙 العودة", callback_data='main_menu')]]
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='MarkdownV2')

async def contact(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    message = (
        "📞 *تواصل مع مكتب الوحيد للاستثمار العقاري*:\n\n"
        "➖ رقم الهاتف: `01026569682`\n"
        "➖ واتساب: [اضغط هنا](https://wa.me/201026569682)\n"
        "➖ العنوان: رأس البر، شارع 85 فيلا 31"
    )
    keyboard = [[InlineKeyboardButton("🔙 العودة", callback_data='main_menu')]]
    if query:
        await query.edit_message_text(message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='MarkdownV2', disable_web_page_preview=True)
    else:
        await update.message.reply_text(message, parse_mode='MarkdownV2', disable_web_page_preview=True)

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == 'main_menu':
        await start(update, context)
    elif data == 'browse_properties':
        await browse_properties(update, context)
    elif data == 'city_guide':
        await city_guide(update, context)
    elif data == 'legal_tips':
        await legal_tips(update, context)
    elif data == 'contact':
        await contact(update, context)
    
    # معالجة أقسام الدليل
    elif data == 'guide_spots':
        spots = GUIDE_DATA.get('tourist_spots', [])
        message = "📍 *أهم المعالم السياحية في رأس البر*:\n\n"
        for spot in spots:
            message += f"✨ *{escape_markdown(spot['name'])}*\n📝 {escape_markdown(spot['description'])}\n📍 {escape_markdown(spot['location'])}\n\n"
        keyboard = [[InlineKeyboardButton("🔙 العودة للدليل", callback_data='city_guide')]]
        await query.edit_message_text(message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='MarkdownV2')
    
    elif data == 'guide_food':
        foods = GUIDE_DATA.get('restaurants', [])
        message = "🍴 *أفضل المطاعم والحلويات*:\n\n"
        for food in foods:
            message += f"🍽️ *{escape_markdown(food['name'])}*\n📝 {escape_markdown(food['description'])}\n🏷️ النوع: {escape_markdown(food['type'])}\n\n"
        keyboard = [[InlineKeyboardButton("🔙 العودة للدليل", callback_data='city_guide')]]
        await query.edit_message_text(message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='MarkdownV2')

    elif data == 'guide_services':
        services = GUIDE_DATA.get('transportation', [])
        message = "🚌 *المواصلات والخدمات*:\n\n"
        for service in services:
            message += f"🚍 *{escape_markdown(service['name'])}*\n📝 {escape_markdown(service['description'])}\n💰 {escape_markdown(service.get('price', ''))}\n\n"
        keyboard = [[InlineKeyboardButton("🔙 العودة للدليل", callback_data='city_guide')]]
        await query.edit_message_text(message, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='MarkdownV2')

    # معالجة أقسام العقارات
    elif data in PROPERTIES_DATA:
        properties = PROPERTIES_DATA[data]
        # إرسال أول 5 عقارات لتجنب الرسائل الطويلة جداً
        for prop in properties[:5]:
            message = (
                f"🏠 *{escape_markdown(prop['name'])}*\n"
                f"📝 *الوصف*: {escape_markdown(prop['description'])}\n"
                f"💰 *السعر*: {escape_markdown(prop['price'])}\n"
                f"📍 *الموقع*: {escape_markdown(prop['location'])}\n"
                f"📞 *للتواصل*: `01026569682`"
            )
            await query.message.reply_text(message, parse_mode='MarkdownV2')
        
        keyboard = [[InlineKeyboardButton("🔙 العودة للتصنيفات", callback_data='browse_properties')]]
        await query.message.reply_text("استعرضنا لك أبرز العروض المتاحة حالياً\\.", reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='MarkdownV2')

def main():
    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    # تشغيل البوت
    logger.info("Bot started...")
    application.run_polling()

if __name__ == '__main__':
    main()
