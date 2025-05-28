import os
import sqlite3
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, ContextTypes, filters

# توكن البوت
TOKEN = os.getenv('BOT_TOKEN')
if not TOKEN:
    raise ValueError("BOT_TOKEN not set in environment variables")

# Chat ID بتاعك عشان الإشعارات
ADMIN_CHAT_ID = '8084142659'

# رابط دعوة المجموعة
GROUP_INVITE_LINK = 'https://t.me/+tdAO0DNeIvlmNTRk'

# إعداد قاعدة بيانات SQLite
def init_db():
    conn = sqlite3.connect('bookings.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS bookings
                 (id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, phone TEXT, apartment TEXT, dates TEXT, timestamp TEXT)''')
    conn.commit()
    conn.close()

init_db()

# تعريف بيانات العقارات للبيع
PROPERTIES = {
    "apartments_sale": [
        {
            "name": "شقة مبانى جديده في رأس البر",
            "description": "شقه 3 غرف نوم، 2 حمام، تشطيب سوبر لوكس",
            "price": "4,200,000 جنيه",
            "location": "شارع 89 قريبه من البحر",
            "images": [
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
                "https://images.unsplash.com/photo-1600566752355-35792bed2ac1",
                "https://images.unsplash.com/photo-1592595896551-12b371d546d5",
                "https://images.unsplash.com/photo-1600585154526-990dced4db0d"
            ]
        },
        {
            "name": "شقة بالمستشارين",
            "description": "غرفتين نوم، حمام، تشطيب جيد",
            "price": "900,000 جنيه",
            "location": "أول رأس البر",
            "images": [
                "https://images.unsplash.com/photo-1600585153490-76fb20a32601",
                "https://images.unsplash.com/photo-1600585152915-0a61d4f4b0a7",
                "https://images.unsplash.com/photo-1592595896616-c37162298647",
                "https://images.unsplash.com/photo-1600585154084-4e5e2d2b8283"
            ]
        }
    ],
    "chalets_sale": [
        {
            "name": "شقه ثانى مطل البحر",
            "description": "غرفتين، إطلالة مباشرة على البحر",
            "price": "3,000,000 جنيه",
            "location": "شاطئ رأس البر الرئيسي",
            "images": [
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
                "https://images.unsplash.com/photo-1570129477492-45c003edd2be",
                "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db",
                "https://images.unsplash.com/photo-1570129476875-1b65d6e944d7"
            ]
        }
    ],
    "land_sale": [
        {
            "name": "أرض بالإمتداد العمرانى",
            "description": "قطعة أرض صافى المبانى 100 متر، تصلح للبناء",
            "price": "6,000,000 جنيه",
            "location": "رأس البر",
            "images": [
                "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
                "https://images.unsplash.com/photo-1600585152220-90363b99e7e4",
                "https://images.unsplash.com/photo-1600585152906-8c9f3f9f3a3b",
                "https://images.unsplash.com/photo-1600585153088-7e6b2b2b2e2d"
            ]
        }
    ]
}

# تعريف بيانات شقق الإيجار
RENTAL_PROPERTIES = [
    {
        "name": "شقة لوكس سابع مطل على البحر",
        "description": "شقة 2 غرف نوم، متاح جميع الأدوار، شارع 91",
        "price": "حسب توقيت الحجز والمده",
        "location": "شارع 91، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
            "https://images.unsplash.com/photo-1600566752355-35792bed2ac1",
            "https://images.unsplash.com/photo-1592595896551-12b371d546d5",
            "https://images.unsplash.com/photo-1600585154526-990dced4db0d"
        ]
    },
    {
        "name": "شقة 3 غرف دور ثاني بحري غربي",
        "description": "شقة 3 غرف نوم، قريبة من البحر، شارع 85",
        "price": "حسب توقيت الحجز والمده",
        "location": "شارع 85، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1600585153490-76fb20a32601",
            "https://images.unsplash.com/photo-1600585152915-0a61d4f4b0a7",
            "https://images.unsplash.com/photo-1592595896616-c37162298647",
            "https://images.unsplash.com/photo-1600585154084-4e5e2d2b8283"
        ]
    },
    {
        "name": "شقة غرفتين ثالث مطل البحر",
        "description": "شقة 2 غرف نوم، مكيفة، إطلالة رائعة، شارع 45",
        "price": "حسب توقيت الحجز والمده",
        "location": "شارع 45، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be",
            "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db",
            "https://images.unsplash.com/photo-1570129476875-1b65d6e944d7"
        ]
    },
    {
        "name": "جناح 4 غرف أول مطل من البحر",
        "description": "جناح 4 غرف، دور ثالث بحري غربي، إطلالة رائعة، شارع 87",
        "price": "حسب توقيت الحجز والمده",
        "location": "شارع 87، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
            "https://images.unsplash.com/photo-1600566752355-35792bed2ac1",
            "https://images.unsplash.com/photo-1592595896551-12b371d546d5",
            "https://images.unsplash.com/photo-1600585154526-990dced4db0d"
        ]
    },
    {
        "name": "شقة سوبر لوكس أول مطل البحر",
        "description": "شقة 2 غرف نوم، إطلالة رائعة على شاطئ رأس البر",
        "price": "حسب توقيت الحجز والمده",
        "location": "رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1600585153490-76fb20a32601",
            "https://images.unsplash.com/photo-1600585152915-0a61d4f4b0a7",
            "https://images.unsplash.com/photo-1592595896616-c37162298647",
            "https://images.unsplash.com/photo-1600585154084-4e5e2d2b8283"
        ]
    },
    {
        "name": "شقة سوبر لوكس بجوار سوق 89",
        "description": "شقة 2 غرف نوم، دور ثالث، بجوار سوق 89",
        "price": "حسب توقيت الحجز والمده",
        "location": "بجوار سوق 89، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be",
            "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db",
            "https://images.unsplash.com/photo-1570129476875-1b65d6e944d7"
        ]
    },
    {
        "name": "شقة غربي دور ثاني",
        "description": "شقة 3 غرف نوم، قريبة من البحر وسوق 89",
        "price": "حسب توقيت الحجز والمده",
        "location": "بجوار سوق 89، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
            "https://images.unsplash.com/photo-1600566752355-35792bed2ac1",
            "https://images.unsplash.com/photo-1592595896551-12b371d546d5",
            "https://images.unsplash.com/photo-1600585154526-990dced4db0d"
        ]
    },
    {
        "name": "شقة بحري شرقي بجوار سوق 89",
        "description": "شقة 2 غرف نوم، دور ثالث، بحري شرقي",
        "price": "حسب توقيت الحجز والمده",
        "location": "بجوار سوق 89، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1600585153490-76fb20a32601",
            "https://images.unsplash.com/photo-1600585152915-0a61d4f4b0a7",
            "https://images.unsplash.com/photo-1592595896616-c37162298647",
            "https://images.unsplash.com/photo-1600585154084-4e5e2d2b8283"
        ]
    },
    {
        "name": "شقة فاخرة ثالث مطل البحر",
        "description": "شقة 3 غرف نوم، إطلالة رائعة، شارع 97",
        "price": "حسب توقيت الحجز والمده",
        "location": "شارع 97، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be",
            "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db",
            "https://images.unsplash.com/photo-1570129476875-1b65d6e944d7"
        ]
    },
    {
        "name": "شقق بجوار سوق 89",
        "description": "شقة 3 غرف نوم أو غرفتين، بجوار سوق 89",
        "price": "حسب توقيت الحجز والمده",
        "location": "بجوار سوق 89، رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
            "https://images.unsplash.com/photo-1600566752355-35792bed2ac1",
            "https://images.unsplash.com/photo-1592595896551-12b371d546d5",
            "https://images.unsplash.com/photo-1600585154526-990dced4db0d"
        ]
    },
    {
        "name": "شقة فاخرة مطلة على البحر 11",
        "description": "شقة 3 غرف نوم، مكيفة، إطلالة رائعة",
        "price": "حسب توقيت الحجز والمده",
        "location": "رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1600585153490-76fb20a32601",
            "https://images.unsplash.com/photo-1600585152915-0a61d4f4b0a7",
            "https://images.unsplash.com/photo-1592595896616-c37162298647",
            "https://images.unsplash.com/photo-1600585154084-4e5e2d2b8283"
        ]
    },
    {
        "name": "شقة فاخرة مطلة على البحر 12",
        "description": "شقة 3 غرف نوم، مكيفة، إطلالة رائعة",
        "price": "حسب توقيت الحجز والمده",
        "location": "رأس البر",
        "images": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be",
            "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db",
            "https://images.unsplash.com/photo-1570129476875-1b65d6e944d7"
        ]
    }
]

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
    await update.message.reply_text('مرحبًا! اختر نوع العقار أو الخدمة:', reply_markup=reply_markup)

async def contact(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = (
        "📞 *تواصل مع مكتب الوحيد للاستثمار العقاري*:\n"
        "➖ رقم الهاتف: 01026569682\n"
        "➖ واتساب: 01026569682\n"
        "➖ العنوان: رأس البر، شارع 85 فيلا 31"
    )
    await update.message.reply_text(message, parse_mode='MarkdownV2')

async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await start(update, context)

async def join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = (
        "📢 *انضم لمجموعتنا لعروض حصرية على عقارات رأس البر!*\n"
        f"👉 {GROUP_INVITE_LINK}"
    )
    await update.message.reply_text(message, parse_mode='MarkdownV2')

async def group_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message and update.message.chat.type in ['group', 'supergroup']:
        text = update.message.text.lower()
        keywords = ['شقة', 'إيجار', 'ايجار', 'رأس البر', 'عقار', 'شاليه', 'تمليك', 'شراء', 'بيع', 'فيلا', 'استثمار', 'بحر', 'مصيف', 'إجازة', 'سكن']
        if any(keyword in text for keyword in keywords):
            message = (
                "🏖️ *عروض عقارات رأس البر!*\n"
                "شقق إيجار وتمليك بأسعار مميزة! 🏠\n"
                "📞 تواصل معنا: 01026569682\n"
                f"📢 انضم لمجموعتنا: {GROUP_INVITE_LINK}\n"
                "🌐 زور موقعنا: https://ras-elbar-egar.netlify.app/"
            )
            await update.message.reply_text(message, parse_mode='MarkdownV2')

async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data in PROPERTIES:
        properties = PROPERTIES[query.data]
        for prop in properties:
            message = (
                f"🏠 *{prop['name']}*\n"
                f"📝 *الوصف*: {prop['description']}\n"
                f"💰 *السعر*: {prop['price']}\n"
                f"📍 *الموقع*: {prop['location']}"
            )
            if prop['images'] and prop['images'][0]:
                await query.message.reply_photo(photo=prop['images'][0], caption=message, parse_mode='MarkdownV2')
                for image in prop['images'][1:]:
                    await query.message.reply_photo(photo=image, parse_mode='MarkdownV2')
            else:
                await query.message.reply_text(message, parse_mode='MarkdownV2')

    elif query.data == 'ownership_prices':
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
            "📞 تواصل مع مكتب الوحيد لمزيد من التفاصيل: 01026569682"
        )
        await query.message.reply_text(message, parse_mode='MarkdownV2')

    elif query.data == 'apartments_for_sale':
        message = (
            "🏠 *شقق للبيع في رأس البر*:\n\n"
            "لدينا العديد من الشقق في شوارع وأماكن مختلفة:\n"
            "➖ 🏗️ *تقسيط حتى سنة*: شقق تحت الإنشاء\\.\n"
            "➖ 💵 *كاش*: استلام فوري\\.\n\n"
            "📞 نرجو الاتصال بمكتب الوحيد لمعرفة الأماكن والأسعار: 01026569682"
        )
        await query.message.reply_text(message, parse_mode='MarkdownV2')

    elif query.data == 'apartments_rent':
        message = (
            "🏖️ *شقق إيجار في رأس البر*:\n\n"
            "💰 *أسعار الإيجار* تتحدد حسب التوقيت، الموقع، القرب من البحر، ومستوى الشقة:\n"
            "➖ *قبل الموسم \\(قبل يونيو\\)*:\n"
            "  ➖ شقق من *250\\-300 جنيه/اليوم*\\.\n"
            "  ➖ أول مطل: حتى *1,500 جنيه/اليوم*\\.\n"
            "➖ *موسم الصيف \\(يونيو وما بعد\\)*:\n"
            "  ➖ الأسعار ترتفع مع الازدحام \\(الطلب أعلى من العرض\\)\\.\n"
            "  ➖ أول مطل: تصل إلى *4,000 جنيه/اليوم*\\.\n\n"
            "🏠 *شقق الإيجار المتاحة*:\n"
        )
        await query.message.reply_text(message, parse_mode='MarkdownV2')
        for prop in RENTAL_PROPERTIES:
            message = (
                f"🏠 *{prop['name']}*\n"
                f"📝 *الوصف*: {prop['description']}\n"
                f"💰 *السعر*: {prop['price']}\n"
                f"📍 *الموقع*: {prop['location']}\n"
                f"📞 تواصل للحجز: 01026569682"
            )
            if prop['images'] and prop['images'][0]:
                await query.message.reply_photo(photo=prop['images'][0], caption=message, parse_mode='MarkdownV2')
                for image in prop['images'][1:]:
                    await query.message.reply_photo(photo=image, parse_mode='MarkdownV2')
            else:
                await query.message.reply_text(message, parse_mode='MarkdownV2')
        contact_message = (
            "🔗 *لمعرفة المتاح والأسعار*:\n"
            "➖ زور موقعنا: https://ras\\-elbar\\-egar\\.netlify\\.app/\n"
            "➖ تابع صفحتنا على فيسبوك: https://www\\.facebook\\.com/akarat\\.raaselbar\n"
            "➖ 📞 اتصل بمكتب الوحيد: 01026569682"
        )
        await query.message.reply_text(contact_message, parse_mode='MarkdownV2')

    elif query.data == 'booking_request':
        context.user_data['booking'] = True
        await query.message.reply_text(
            "📝 من فضلك، أرسل بيانات الحجز في رسالة واحدة:\n"
            "- الاسم\n"
            "- رقم التليفون\n"
            "- اسم الشقة (مثل: شقة لوكس سابع)\n"
            "- تواريخ الحجز (مثل: من 1-6 إلى 5-6)\n\n"
            "📞 سنتواصل معك لتأكيد الحجز."
        )

    elif query.data == 'contact':
        message = (
            "📞 *تواصل مع مكتب الوحيد للاستثمار العقاري*:\n"
            "➖ رقم الهاتف: 01026569682\n"
            "➖ واتساب: 01026569682\n"
            "➖ العنوان: رأس البر، شارع 85 فيلا 31"
        )
        await query.message.reply_text(message, parse_mode='MarkdownV2')

    else:
        await query.message.reply_text('⚠️ اختيار غير صحيح، جرب تاني\\.')

async def handle_booking_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get('booking'):
        user = update.message.from_user
        data = update.message.text
        timestamp = str(update.message.date)

        try:
            lines = data.split('\n')
            name = lines[0].strip()
            phone = lines[1].strip()
            apartment = lines[2].strip()
            dates = lines[3].strip()
        except IndexError:
            await update.message.reply_text("⚠️ من فضلك، أرسل البيانات بالترتيب الصحيح:\n- الاسم\n- رقم التليفون\n- اسم الشقة\n- تواريخ الحجز")
            return

        conn = sqlite3.connect('bookings.db')
        c = conn.cursor()
        c.execute("INSERT INTO bookings (user_id, name, phone, apartment, dates, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                  (user.id, name, phone, apartment, dates, timestamp))
        conn.commit()
        conn.close()

        await update.message.reply_text("✅ تم تسجيل طلب الحجز! سنتواصل معك قريبًا للتأكيد.")

        admin_message = (
            f"🔔 *طلب حجز جديد*\n\n"
            f"👤 *الاسم*: {name}\n"
            f"📱 *رقم التليفون*: {phone}\n"
            f"🏠 *الشقة*: {apartment}\n"
            f"📅 *تواريخ الحجز*: {dates}\n"
            f"🕒 *وقت الطلب*: {timestamp}"
        )
        try:
            await context.bot.send_message(chat_id=ADMIN_CHAT_ID, text=admin_message, parse_mode='MarkdownV2')
        except Exception as e:
            print(f"Error sending admin notification: {e}")

        context.user_data['booking'] = False

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('contact', contact))
    app.add_handler(CommandHandler('menu', menu))
    app.add_handler(CommandHandler('join', join))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND & filters.ChatType.GROUPS, group_message_handler))
    app.add_handler(CallbackQueryHandler(button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_booking_data))

    port = int(os.getenv('PORT', 5000))
    app.run_webhook(
        listen='0.0.0.0',
        port=port,
        url_path=TOKEN,
        webhook_url=f'https://{os.getenv("RAILWAY_PUBLIC_DOMAIN")}/{TOKEN}'
    )

if __name__ == '__main__':
    main()