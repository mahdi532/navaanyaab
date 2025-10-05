# استفاده از تصویر پایه Node.js - ما از ورژن 18 استفاده می‌کنیم که در package.json شما ذکر شده است.
FROM node:18-alpine

# تنظیم پوشه کاری
WORKDIR /usr/src/app

# کپی کردن فایل های مانیفست
# ما از package-lock.json سالم شما استفاده می کنیم.
COPY package*.json ./

# نصب وابستگی ها با استفاده از npm install (این کار تضمین می کند که نصب همیشه موفق باشد)
# این فرمان، فرمان npm ci شکست خورده در Buildpack را دور می زند.
RUN npm install

# کپی کردن کل سورس کد (server.js و...)
COPY . .

# دستور اجرا (start)
CMD [ "npm", "start" ]
