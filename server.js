// ===================================================================
// 🛠️ تنظیمات اولیه ماژول‌ها
// ===================================================================
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fetch = require('node-fetch'); // برای ارسال پیام تلگرام و Keep-Alive
const app = express();
const PORT = process.env.PORT || 3000;

// 🔑 تنظیمات تلگرام (از متغیرهای محیطی مانند Koyeb خوانده می‌شود)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ⚠️ مهم: این متغیرها باید در تنظیمات Koyeb (یا .env محلی) تنظیم شوند.
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("⚠️ اخطار: متغیرهای TELEGRAM_BOT_TOKEN یا TELEGRAM_CHAT_ID تنظیم نشده‌اند. سیگنال‌های تلگرام ارسال نخواهند شد.");
}

app.use(cors());
app.use(express.static('public'));


// ===================================================================
// 📈 تعریف نمادها و متغیرهای اصلی
// ===================================================================
const symbols = {
    "فولاد": "IRO1FOLZ0001",
    "خودرو": "IRO1IKCO0001",
    "سپرده": "IRO1BANK0001",
    "وتوکو": "IRO1VTOC0001",
    "شپنا": "IRO1PNES0001",
    "فملی": "IRO1FMLI0001",
    "ذوب": "IRO1ZOBZ0001",
    "شستا": "IRO1TSTO0001",
    "خساپا": "IRO1KSAZ0001",
    "گپیام": "IRO1PGIR0001"
};

let lastAlerted = new Set(); // جلوگیری از ارسال مکرر سیگنال
let globalResults = []; // ذخیره نتایج برای داشبورد API


// ===================================================================
// ✉️ توابع ارسال پیام (تلگرام)
// ===================================================================

/**
 * ارسال پیام به تلگرام با توکن و چت آیدی از متغیرهای محیطی.
 * @param {string} message - متن پیام
 */
async function sendTelegram(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    try {
        // توجه: فاصله اضافی بعد از /bot حذف شده است.
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" })
        });
        const data = await response.json();
        if (data.ok) {
            console.log("✅ پیام تلگرام با موفقیت ارسال شد.");
        } else {
            // نمایش خطای تلگرام (مثلا Bad Request)
            console.log(`❌ خطا در ارسال تلگرام: ${data.description}`);
        }
    } catch (e) {
        console.log("❌ خطا در اتصال به تلگرام:", e.message);
    }
}


// ===================================================================
// 📊 توابع واکشی داده و محاسبه امتیاز
// ===================================================================

/**
 * واکشی اطلاعات یک نماد از TSETMC.
 */
async function fetchStock(insCode) {
    try {
        const url = `http://tsetmc.com/tsev2/data/inst-info.aspx?i=${insCode}&heven=0`;
        const res = await axios.get(url, { timeout: 5000 });
        const p = res.data.split(',');
        if (p.length < 22) return null; // بررسی صحت داده
        
        // استخراج و تبدیل داده‌ها
        return {
            lastPrice: parseFloat(p[2]) || 0,
            closePrice: parseFloat(p[3]) || 0,
            priceMax: parseFloat(p[6]) || 0, // حداکثر قیمت مجاز
            volume: parseInt(p[8]) || 0,
            yesterdayPrice: parseFloat(p[14]) || 0,
            buyVolumeReal: parseFloat(p[16]) || 0,
            sellVolumeReal: parseFloat(p[17]) || 0,
            // ... داده‌های دیگر
        };
    } catch (e) {
        // console.log(`❌ خطا در واکشی داده: ${e.message}`);
        return null;
    }
}

/**
 * محاسبه امتیاز نوسان‌گیری بر اساس معیارهای تعریف‌شده.
 */
function calculateScore(stock) {
    const {
        lastPrice, closePrice, priceMax, volume,
        yesterdayPrice, buyVolumeReal, sellVolumeReal,
    } = stock;

    // محاسبات کلیدی
    const priceChangePercent = ((closePrice - yesterdayPrice) / yesterdayPrice) * 100;
    const realBuyPower = sellVolumeReal > 0 ? buyVolumeReal / sellVolumeReal : 0;
    const isNearHigh = priceMax > 0 ? (priceMax - lastPrice) / priceMax < 0.005 : false;

    let score = 0;
    
    // شرط ۱: رشد خوب، صف خرید/کف قیمتی، قدرت خریدار بالا و حجم مناسب
    if (priceChangePercent > 0 && closePrice >= priceMax && realBuyPower > 1.2 && volume > 1e6) score += 30;
    
    // شرط ۲: رشد قوی (بالای ۳٪)، حجم بالا، قدرت خریدار قوی (سیگنال نوسان‌گیری قوی)
    if (priceChangePercent > 3 && volume > 5e6 && realBuyPower > 2) score += 40;
    
    // شرط ۳: نزدیک سقف روزانه و قدرت خریدار بسیار بالا
    if (isNearHigh && realBuyPower > 3) score += 30;
    
    // کاهش امتیاز برای برخی الگوهای منفی (مثل صف فروش شدن در قیمت‌های بالا)
    // این قسمت می‌تواند بر اساس استراتژی شما تغییر کند.

    return Math.max(0, Math.min(100, score));
}

// ===================================================================
// 🎯 تابع اصلی نوسان‌گیری (Main Loop)
// ===================================================================
async function mainLoop() {
    const now = new Date().toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran' });
    const tempResults = [];

    for (const [name, insCode] of Object.entries(symbols)) {
        const data = await fetchStock(insCode);
        if (data) {
            const score = calculateScore(data);
            if (score >= 75) {
                tempResults.push({ name, score, ...data, lastUpdate: now });
                
                // 🔔 ارسال سیگنال به تلگرام (فقط یکبار)
                if (!lastAlerted.has(name)) {
                    lastAlerted.add(name);
                    const msg = `🚨 <b>سیگنال قوی!</b>\nسهم: ${name}\nامتیاز: ${score}/100\nقیمت: ${data.lastPrice.toLocaleString()} تومان\nقدرت خریدار حقیقی: ${data.buyVolumeReal > 0 && data.sellVolumeReal > 0 ? (data.buyVolumeReal / data.sellVolumeReal).toFixed(2) : 0}`;
                    sendTelegram(msg);
                }
            } else {
                // اگر امتیاز زیر آستانه آمد، می‌توان هشدار را پاک کرد تا دوباره در صورت افزایش ارسال شود.
                lastAlerted.delete(name);
            }
        }
    }
    
    // به‌روزرسانی نتایج جهانی برای نمایش در داشبورد
    globalResults = tempResults;

    // پاکسازی دوره‌ای لیست هشدارها (اختیاری: برای اینکه یک سیگنال قوی مجدد ارسال شود)
    // if (Math.random() < 0.05) { lastAlerted.clear(); } 
}


// ===================================================================
// 🌐 مدیریت Endpoints و Keep-Alive
// ===================================================================

// مسیر سلامت برای Koyeb و تست (حل مشکل Cannot GET /)
app.get('/', (req, res) => {
    res.send('Your Telegram Bot App is running and healthy!');
});

// Endpoint برای داشبورد (نمایش نتایج)
app.get('/api/stocks', (req, res) => {
    const now = new Date().toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran' });
    res.json({ timestamp: now, stocks: globalResults });
});

// 🚨 بخش جلوگیری از خوابیدن (Keep-Alive) در محیط Koyeb
const KEEP_ALIVE_URL = process.env.KOYEB_EXTERNAL_URL;
if (KEEP_ALIVE_URL) {
    console.log(`🌐 تلاش برای فعال‌سازی Keep-Alive به URL: ${KEEP_ALIVE_URL}`);
    // پینگ شدن هر 10 دقیقه یکبار
    setInterval(() => {
        fetch(KEEP_ALIVE_URL)
            .then(res => console.log(`✅ خودپینگ موفقیت‌آمیز. وضعیت: ${res.status}`))
            .catch(e => console.log(`❌ خودپینگ ناموفق: ${e.message}`));
    }, 10 * 60 * 1000); // 10 دقیقه
    console.log(`🌐 سرویس Keep-Alive فعال شد.`);
}


// ===================================================================
// 🏃‍♂️ شروع سرور و منطق اصلی
// (فقط یک بار app.listen فراخوانی می‌شود)
// ===================================================================
app.listen(PORT, () => {
    console.log(`🚀 برنامه در حال اجراست روی پورت ${PORT}`);
    
    // ارسال پیام تست به محض شروع به کار
    sendTelegram("✅ ربات نوسان‌گیری فعال شد. (پیام تست موفقیت آمیز)") 
        .catch(err => console.error("Error sending test message:", err));
    
    // شروع اسکن و اجرای دوره‌ای آن هر 30 ثانیه
    console.log('🌐 شروع اسکن نوسانات بازار (هر 30 ثانیه)');
    mainLoop(); // اجرای اول
    setInterval(mainLoop, 30000); // اجرای دوره‌ای
});