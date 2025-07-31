# Tabib IQ Backend API

## 🚀 الخادم الخلفي لمنصة طبيب العراق للاستشارات الطبية

### 📋 الوصف
خادم API مخصص لمنصة طبيب العراق، يوفر خدمات الاستشارات الطبية وإدارة المستخدمين والأطباء.

## 🌐 الروابط

### الإنتاج (Production)
- **الخادم الرئيسي**: https://tabib-iq-backend-production.up.railway.app
- **فحص الصحة**: https://tabib-iq-backend-production.up.railway.app/api/health

### التطوير المحلي (Local Development)
- **الخادم المحلي**: http://localhost:5000
- **فحص الصحة**: http://localhost:5000/api/health

## 🛠️ التثبيت والتشغيل

### المتطلبات
- Node.js 18.x أو أحدث
- npm 10.x أو أحدث

### التثبيت
```bash
npm install
```

### التشغيل المحلي
```bash
# تشغيل الخادم المحلي
npm run start:local

# تشغيل مع nodemon للتطوير
npm run dev:local
```

### التشغيل للإنتاج
```bash
npm start
```

## 🔧 المتغيرات البيئية

### للإنتاج (Railway/Vercel)
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq
JWT_SECRET=tabib_iq_secret_key_2024
CORS_ORIGIN=https://www.tabib-iq.com,https://tabib-iq.com,https://*.vercel.app,https://*.netlify.app
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### للتطوير المحلي
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq
JWT_SECRET=tabib_iq_secret_key_2024
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,https://tabib-iq.com,https://www.tabib-iq.com
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

## 📡 النقاط النهائية (API Endpoints)

### فحص الصحة
- **GET** `/api/health` - فحص حالة الخادم

### إدارة الأدمن
- **GET** `/api/test-admin` - فحص وجود الأدمن
- **POST** `/api/admin/init` - إنشاء أدمن افتراضي
- **GET** `/api/admin/list` - قائمة الأدمن

### المستخدمين
- **POST** `/api/create-test-user` - إنشاء مستخدم تجريبي
- **POST** `/api/test-login` - تسجيل دخول تجريبي

### الأطباء
- **GET** `/api/doctors` - قائمة الأطباء
- **GET** `/api/doctors/:id` - تفاصيل طبيب
- **POST** `/api/doctors` - إضافة طبيب جديد

### المواعيد
- **GET** `/api/appointments` - قائمة المواعيد
- **POST** `/api/appointments` - حجز موعد جديد

## 🔑 بيانات الدخول الافتراضية

### الأدمن
- **البريد الإلكتروني**: admin@tabib-iq.com
- **كلمة المرور**: Admin123!@#

### المستخدم التجريبي
- **البريد الإلكتروني**: test@tabib-iq.com
- **كلمة المرور**: 123456

## 🚀 النشر

### Railway
1. اربط repository مع Railway
2. أضف المتغيرات البيئية
3. سيتم النشر تلقائياً

### Vercel
1. اربط repository مع Vercel
2. أضف المتغيرات البيئية
3. سيتم النشر تلقائياً

## 🔍 استكشاف الأخطاء

### مشاكل DNS المحلية
إذا واجهت مشاكل DNS محلياً، راجع ملف `DNS_TROUBLESHOOTING.md`

### مشاكل الاتصال
1. تأكد من إعدادات CORS
2. تحقق من المتغيرات البيئية
3. تأكد من اتصال قاعدة البيانات

## 📁 هيكل الملفات

```
├── server-railway.js      # الخادم الرئيسي للإنتاج
├── server-local.js        # الخادم المحلي للتطوير
├── env.railway           # متغيرات الإنتاج
├── env.local             # متغيرات التطوير المحلي
├── package.json          # تبعيات المشروع
├── Procfile              # إعدادات Railway
└── README.md             # هذا الملف
```

## 🤝 المساهمة

1. Fork المشروع
2. أنشئ branch جديد
3. أضف التحديثات
4. أرسل Pull Request

## 📄 الرخصة

ISC License

## 📞 الدعم

للدعم التقني، تواصل مع فريق التطوير. 