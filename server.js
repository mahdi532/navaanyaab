require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(cors());
app.use(express.static('public'));

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

let lastAlerted = new Set();
let globalResults = [];

// ------------------------------------------------------------------
// توابع
// ------------------------------------------------------------------

async function sendTelegram(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("⚠️ توکن تلگرام تنظیم نشده است. فقط داشبورد فعال است.");
        return;
    }
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" })
        });
        console.log("✅ تلاش برای ارسال پیام تلگرام...");
    } catch (e) {
        console.log("❌ خطا در تلگرام:", e.message);
    }
}

async function fetchStock(insCode) {
    try {
        const url = `http://tsetmc.com/tsev2/data/inst-info.aspx?i=${insCode}&heven=0`;
        const res = await axios.get(url, { timeout: 5000 });
        const p = res.data.split(',');
        if (p.length < 22) return null;
        return {
            lastPrice: parseFloat(p[2]) || 0,
            closePrice: parseFloat(p[3]) || 0,
            priceMin: parseFloat(p[5]) || 0,
            priceMax: parseFloat(p[6]) || 0,
            volume: parseInt(p[8]) || 0,
            count: parseInt(p[10]) || 0,
            yesterdayPrice: parseFloat(p[14]) || 0,
            buyVolumeReal: parseFloat(p[16]) || 0,
            sellVolumeReal: parseFloat(p[17]) || 0,
            buyCountReal: parseInt(p[18]) || 0,
            sellCountReal: parseInt(p[19]) || 0,
            bv1: parseFloat(p[24]) || 0,
            bno1: parseInt(p[25]) || 0,
            sv1: parseFloat(p[26]) || 0,
            sno1: parseInt(p[27]) || 0
        };
    } catch (e) {
        return null;
    }
}

function calculateScore(stock) {
    const {
        lastPrice, closePrice, priceMax, volume, count,
        yesterdayPrice, buyVolumeReal, sellVolumeReal,
        buyCountReal, sellCountReal, bv1, bno1
    } = stock;

    const priceChange = ((closePrice - yesterdayPrice) / yesterdayPrice) * 100;
    const realBuyPower = sellVolumeReal > 0 ? buyVolumeReal / sellVolumeReal : 0;
    const isNearHigh = priceMax > 0 ? (priceMax - lastPrice) / priceMax < 0.005 : false;

    let score = 0;
    if (priceChange > 0 && closePrice >= priceMax && realBuyPower > 1.2 && volume > 1e6) score += 30;
    if (priceChange > 3 && volume > 5e6 && realBuyPower > 2) score += 40;
    if (isNearHigh && realBuyPower > 3) score += 30;
    if (bv1 > 1e9 && bno1 < 3 && !isNearHigh) score -= 20;

    return Math.max(0, Math.min(100, score));
}

// ------------------------------------------------------------------
// 🎯 تابع اصلی نوسان‌گیری (Main Loop)
// ------------------------------------------------------------------
async function mainLoop() {
    const now = new Date().toLocaleTimeString('fa-IR');
    const tempResults = [];

    for (const [name, insCode] of Object.entries(symbols)) {
        const data = await fetchStock(insCode);
        if (data) {
            const score = calculateScore(data);
            if (score >= 75) {
                tempResults.push({ name, score, ...data, lastUpdate: now });
                
                // ارسال سیگنال به تلگرام
                if (!lastAlerted.has(name)) {
                    lastAlerted.add(name);
                    const msg = `🚨 <b>سیگنال قوی!</b>\nسهم: ${name}\nامتیاز: ${score}/100\nقیمت: ${data.lastPrice.toLocaleString()} تومان`;
                    sendTelegram(msg);
                }
            }
        }
    }
    
    // به‌روزرسانی نتایج جهانی برای نمایش در داشبورد
    globalResults = tempResults;

    // تمیز کردن لیست هشدارها به صورت دوره‌ای (1% شانس)
    if (Math.random() < 0.01) {
        lastAlerted.clear();
    }
}

// ------------------------------------------------------------------
// 🌐 Endpoint برای داشبورد
// ------------------------------------------------------------------
app.get('/api/stocks', (req, res) => {
    const now = new Date().toLocaleTimeString('fa-IR');
    res.json({ timestamp: now, stocks: globalResults });
});


// 🚨 بخش جدید برای جلوگیری از خوابیدن (Keep-Alive)
const KEEP_ALIVE_URL = process.env.KOYEB_EXTERNAL_URL;
if (KEEP_ALIVE_URL) {
    console.log(`🌐 تلاش برای فعال‌سازی Keep-Alive به URL: ${KEEP_ALIVE_URL}`);
    // پینگ شدن هر 10 دقیقه یکبار
    setInterval(() => {
        fetch(KEEP_ALIVE_URL)
            .then(res => console.log(`✅ خودپینگ موفقیت‌آمیز. وضعیت: ${res.status}`))
            .catch(e => console.log(`❌ خودپینگ ناموفق: ${e.message}`));
    }, 10 * 60 * 1000);
    console.log(`🌐 سرویس Keep-Alive فعال شد. برنامه شما 24/7 اجرا خواهد شد.`);
}
// ----------------------------------------------------


app.listen(PORT, () => {
    console.log(`🚀 برنامه در حال اجراست روی پورت ${PORT}`);
    
    // ------------------------------------------------------------------
    // 🚀 اجرای اولیه و تنظیم حلقه‌
    // ------------------------------------------------------------------
    console.log('🌐 شروع اسکن نوسانات بازار (هر 30 ثانیه)');
    mainLoop(); // اجرای اول
    setInterval(mainLoop, 30000); // اجرای دوره‌ای
    // ------------------------------------------------------------------
});
