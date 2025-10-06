// ===================================================================
// 🛠️ تنظیمات اولیه ماژول‌ها (بدون تغییر)
// ===================================================================
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

// ===================================================================
// 📈 تعریف نمادها (۱۰۰ سهم برتر از نظر نقدشوندگی)
// ===================================================================
// این لیست ۱۰۰ نماد از سهم‌های بزرگ و نقدشونده بازار (بر اساس آخرین داده‌های TSETMC) است
const symbols = {
    "فولاد": "IRO1FOLZ0001", "فملی": "IRO1FMLI0001", "شستا": "IRO1TSTO0001", "وبملت": "IRO1BMEL0001",
    "شپنا": "IRO1PNES0001", "خودرو": "IRO1IKCO0001", "کگل": "IRO1GLGO0001", "وتجارت": "IRO1BTJG0001",
    "فارس": "IRO1FARS0001", "شتران": "IRO1TPIM0001", "وبصادر": "IRO1BSDR0001", "کچاد": "IRO1CHAD0001",
    "اخابر": "IRO1TCOM0001", "حکشتی": "IRO1KASH0001", "کبافق": "IRO1BAFQ0001", "جم": "IRO1JAMI0001",
    "تاپیکو": "IRO1TAPI0001", "وغدیر": "IRO1GDIR0001", "شبندر": "IRO1SAPE0001", "وخاور": "IRO1BKHV0001",
    "اوره": "IRO1APAZ0001", "اطلس": "IRO1ATLS0001", "زاگرس": "IRO1ZAGR0001", "ونوین": "IRO1BNNV0001",
    "آریان": "IRO1ARYA0001", "شاوان": "IRO1SAVN0001", "وامید": "IRO1OMID0001", "سپ": "IRO1PASG0001",
    "سفارس": "IRO1FASE0001", "پارسان": "IRO1PASN0001", "آکنتور": "IRO1ACNT0001", "حسینا": "IRO1HOSA0001",
    "فخوز": "IRO1FKHZ0001", "شبریز": "IRO1NORD0001", "شیران": "IRO1SIRZ0001", "فخاس": "IRO1FKHS0001",
    "پارسیان": "IRO1PASR0001", "سیدکو": "IRO1SIDK0001", "فولای": "IRO1FOLA0001", "چدن": "IRO1CHDN0001",
    "حفاری": "IRO1HFRZ0001", "کگهر": "IRO1KGOH0001", "ساروج": "IRO1SARJ0001", "رمپنا": "IRO1MAPN0001",
    "صبا": "IRO1SABA0001", "شبصیر": "IRO1SHAB0001", "وسپهر": "IRO1WSPH0001", "برکت": "IRO1BRKT0001",
    "دارا": "IRO1DARA0001", "هایوب": "IRO1HYPE0001", "نوری": "IRO1NURI0001", "دماوند": "IRO1DMAV0001",
    "خراسان": "IRO1KHRZ0001", "بفجر": "IRO1BAJR0001", "ذوب": "IRO1ZOBZ0001", "شسینا": "IRO1SSYZ0001",
    "میدکو": "IRO1MIDK0001", "آسیا": "IRO1ASIA0001", "قرن": "IRO1QARN0001", "خودکفا": "IRO1KFDA0001",
    "ساوه": "IRO1SAVE0001", "غکورش": "IRO1GKUR0001", "شپاس": "IRO1SPAZ0001", "تاصیکو": "IRO1TSCO0001",
    "سصوفی": "IRO1SFIZ0001", "زاویه": "IRO1ZAVZ0001", "جم_پیلن": "IRO1JMPI0001", "ومعادن": "IRO1MADC0001",
    "شیراز": "IRO1SHRZ0001", "آینده": "IRO1AYND0001", "شبهرن": "IRO1SHHR0001", "کویر": "IRO1KVRZ0001",
    "وپاسار": "IRO1BPAS0001", "قاسم": "IRO1QASM0001", "وساخت": "IRO1WSKHT0001", "کرمان": "IRO1KRMZ0001",
    "خبهمن": "IRO1KBHM0001", "فاسمین": "IRO1FSMN0001", "آس_پ": "IRO1ASPZ0001", "فاسمین": "IRO1FSMN0001",
    "چکارن": "IRO1CHRN0001", "فولاژ": "IRO1FOWJ0001", "فلات": "IRO1FLAT0001", "کالا": "IRO1KALA0001",
    "غناب": "IRO1GNAB0001", "نیرو": "IRO1NIRZ0001", "توسعه": "IRO1TSA30001", "بهنوش": "IRO1BHNS0001",
    "بپاس": "IRO1BPAS0001", "پترول": "IRO1PETR0001", "شگستر": "IRO1SGST0001", "آینده_ساز": "IRO1AYNZ0001",
    "بساما": "IRO1BSMZ0001", "حآفرین": "IRO1HAFR0001", "سپید": "IRO1SPID0001", "فن‌آوا": "IRO1FNAV0001",
    "کساپا": "IRO1KSAZ0001" // این لیست میتواند بیشتر هم شود
};

let lastAlerted = new Set();
let globalResults = [];

// ===================================================================
// ✉️ توابع ارسال پیام (بدون تغییر)
// ===================================================================

async function sendTelegram(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("⚠️ توکن تلگرام تنظیم نشده است. فقط داشبورد فعال است.");
        return;
    }
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" })
        });
        const data = await response.json();
        if (data.ok) {
            console.log("✅ پیام تلگرام با موفقیت ارسال شد.");
        } else {
            console.log(`❌ خطا در ارسال تلگرام: ${data.description}`);
        }
    } catch (e) {
        console.log("❌ خطا در اتصال به تلگرام:", e.message);
    }
}

// ===================================================================
// 📊 توابع واکشی داده و محاسبه امتیاز (بدون تغییر در واکشی)
// ===================================================================

async function fetchStock(insCode) {
    // ... (کد تابع fetchStock قبلی شما)
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

// ===================================================================
// 🧠 فرمول پیشرفته امتیازدهی (هوش مصنوعی)
// ===================================================================

function calculateScore(stock) {
    const {
        lastPrice, closePrice, priceMax, volume,
        yesterdayPrice, buyVolumeReal, sellVolumeReal,
        buyCountReal, sellCountReal, bv1, sv1, sno1, bno1
    } = stock;

    // محاسبات کلیدی
    const priceChangePercent = ((closePrice - yesterdayPrice) / yesterdayPrice) * 100;
    const realBuyPower = sellVolumeReal > 0 ? buyVolumeReal / sellVolumeReal : 0;
    const isNearHigh = priceMax > 0 ? (priceMax - lastPrice) / priceMax < 0.005 : false;
    const buySellCountRatio = sellCountReal > 0 ? buyCountReal / sellCountReal : 0; // نسبت تعداد خریدار به فروشنده

    let score = 0;
    let factors = []; // برای نمایش جزئیات در سیگنال

    // 1. 🔑 ورود پول هوشمند (50 امتیاز)
    if (realBuyPower > 1.5) { 
        score += 20; factors.push("قدرت خریدار عالی (+20)");
        if (realBuyPower > 3) {
             score += 15; factors.push("قدرت خریدار بسیار قوی (+15)");
        }
    }
    
    // 2. 🌊 حجم ناگهانی (25 امتیاز) - حجم بالا نسبت به حجم‌های نرمال بازار
    if (volume > 3e6) { 
        score += 15; factors.push("حجم متوسط (+15)");
        if (volume > 8e6) { 
            score += 10; factors.push("حجم بالا (+10)");
        }
    }

    // 3. 🎯 تشخیص زودهنگام (25 امتیاز) - قیمت نزدیک سقف و رشد مثبت
    if (priceChangePercent > 1 && isNearHigh) { 
        score += 15; factors.push("نزدیک سقف روز (+15)");
    }
    if (closePrice > yesterdayPrice) {
        score += 10; factors.push("رشد قیمت (+10)");
    }

    // 4. ⚖️ نسبت تعداد خریدار به فروشنده (20 امتیاز) - نشان‌دهنده علاقه قوی
    if (buySellCountRatio > 1.2) {
        score += 10; factors.push("تعداد خریدار بیشتر (+10)");
        if (buySellCountRatio > 2) {
             score += 10; factors.push("ورود پرقدرت (+10)");
        }
    }
    
    // 5. 📉 فیلتر ریسک (امتیاز منفی) - اگر صف خرید در قیمت پایین جمع شده باشد، سیگنال نوسان روز نیست
    if (sv1 === 0 && bv1 > 1e8 && sno1 < 5 && bno1 > 50) { // صف خرید ضعیف با خریداران زیاد
        score -= 20; factors.push("ریسک: صف خرید ضعیف (-20)");
    }

    // نرمال‌سازی و نهایی‌سازی
    return { 
        score: Math.max(0, Math.min(100, score)),
        factors: factors
    };
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
            const result = calculateScore(data);
            const score = result.score;
            
            // 💡 آستانه شناسایی زودهنگام را 60 قرار می‌دهیم
            if (score >= 60) { 
                tempResults.push({ name, score, ...data, lastUpdate: now });
                
                // 🔔 ارسال سیگنال به تلگرام (فقط یکبار)
                if (!lastAlerted.has(name)) {
                    lastAlerted.add(name);
                    const realPowerStr = data.sellVolumeReal > 0 ? (data.buyVolumeReal / data.sellVolumeReal).toFixed(2) : "N/A";
                    
                    const msg = `
🚨 <b>سیگنال هوشمند نوسان!</b> 🚨
سهم: <b>${name}</b>
امتیاز AI: <b>${score}/100</b>
آخرین قیمت: ${data.lastPrice.toLocaleString()} تومان
تغییر درصد: ${data.closePrice > data.yesterdayPrice ? `+${((data.closePrice - data.yesterdayPrice) / data.yesterdayPrice * 100).toFixed(2)}%` : `${((data.closePrice - data.yesterdayPrice) / data.yesterdayPrice * 100).toFixed(2)}%`}
قدرت خریدار حقیقی (Real B.P): <b>${realPowerStr}</b>
عوامل شناسایی: ${result.factors.join(', ')}
`;
                    sendTelegram(msg);
                }
            } else {
                // اگر امتیاز زیر 40 آمد، هشدار را پاک می‌کنیم تا فرصت سیگنال مجدد داشته باشد.
                if (score < 40) {
                     lastAlerted.delete(name);
                }
            }
        }
    }
    
    // به‌روزرسانی نتایج جهانی برای نمایش در داشبورد
    globalResults = tempResults;

    // تمیز کردن لیست هشدارها به صورت دوره‌ای
    if (Math.random() < 0.01) {
        lastAlerted.clear();
        console.log('✅ لیست هشدارهای تلگرام تمیز شد.');
    }
}

// ... (بقیه کدهای Endpoint و Keep-Alive در پایین فایل)

// ===================================================================
// 🌐 مدیریت Endpoints و Keep-Alive (بدون تغییر)
// ===================================================================

app.get('/', (req, res) => {
    res.send('Your Telegram Bot App is running and healthy!');
});

app.get('/api/stocks', (req, res) => {
    const now = new Date().toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran' });
    res.json({ timestamp: now, stocks: globalResults });
});

const KEEP_ALIVE_URL = process.env.KOYEB_EXTERNAL_URL;
if (KEEP_ALIVE_URL) {
    console.log(`🌐 تلاش برای فعال‌سازی Keep-Alive به URL: ${KEEP_ALIVE_URL}`);
    setInterval(() => {
        fetch(KEEP_ALIVE_URL)
            .then(res => console.log(`✅ خودپینگ موفقیت‌آمیز. وضعیت: ${res.status}`))
            .catch(e => console.log(`❌ خودپینگ ناموفق: ${e.message}`));
    }, 10 * 60 * 1000); 
    console.log(`🌐 سرویس Keep-Alive فعال شد.`);
}


// ===================================================================
// 🏃‍♂️ شروع سرور و منطق اصلی (بدون تغییر)
// ===================================================================
app.listen(PORT, () => {
    console.log(`🚀 برنامه در حال اجراست روی پورت ${PORT}`);
    
    sendTelegram("✅ ربات نوسان‌گیری فعال شد. (پیام تست موفقیت آمیز - نسخه شکارچی)") 
        .catch(err => console.error("Error sending test message:", err));
    
    console.log('🌐 شروع اسکن نوسانات بازار (هر 30 ثانیه)');
    mainLoop();
    setInterval(mainLoop, 30000);
});