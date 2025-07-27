require('dotenv').config();
const mongoose = require('mongoose');

async function اختباراتصالMongoDB() {
  console.log('🔍 اختبار اتصال MongoDB...');
  console.log('📝 البيئة:', process.env.NODE_ENV || 'development');
  
  // التحقق من وجود MONGO_URI
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('❌ متغير البيئة MONGO_URI غير معين!');
    console.log('💡 يرجى تعيين MONGO_URI في متغيرات البيئة');
    return;
  }
  
  console.log('🔗 MONGO_URI:', MONGO_URI ? 'معين (مخفي للأمان)' : 'غير معين');
  
  try {
    console.log('🔄 محاولة الاتصال...');
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ اتصال MongoDB ناجح!');
    console.log('📊 قاعدة البيانات:', mongoose.connection.name);
    console.log('🌐 المضيف:', mongoose.connection.host);
    console.log('🔌 المنفذ:', mongoose.connection.port);
    console.log('👤 المستخدم:', mongoose.connection.user);
    
    // اختبار استعلام بسيط
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 المجموعات الموجودة:', collections.length);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
  } catch (error) {
    console.error('❌ فشل اتصال MongoDB!');
    console.error('❌ رسالة الخطأ:', error.message);
    console.error('❌ رمز الخطأ:', error.code);
    console.error('❌ اسم الخطأ:', error.name);
    
    // تقديم إرشادات محددة بناءً على نوع الخطأ
    if (error.code === 'ENOTFOUND') {
      console.log('\n🔍 استكشاف أخطاء ENOTFOUND:');
      console.log('1. تحقق من صحة MongoDB URI');
      console.log('2. تحقق من الاتصال بالشبكة');
      console.log('3. تأكد من إمكانية الوصول إلى مجموعة MongoDB');
      console.log('4. تحقق من أن IP مدرج في القائمة البيضاء في MongoDB Atlas');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔍 استكشاف أخطاء ECONNREFUSED:');
      console.log('1. تحقق من تشغيل خدمة MongoDB');
      console.log('2. تحقق من رقم المنفذ في سلسلة الاتصال');
      console.log('3. تحقق من إعدادات الجدار الناري');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n🔍 استكشاف أخطاء ETIMEDOUT:');
      console.log('1. تحقق من الاتصال بالشبكة');
      console.log('2. جرب زيادة مهلة الاتصال');
      console.log('3. تحقق من وجود مشاكل في MongoDB Atlas');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n🔍 استكشاف أخطاء المصادقة:');
      console.log('1. تحقق من اسم المستخدم وكلمة المرور');
      console.log('2. تحقق من بيانات اعتماد MongoDB Atlas');
      console.log('3. تأكد من أن المستخدم لديه صلاحيات مناسبة');
    }
    
    console.log('\n💡 تنسيق MongoDB URI الشائع:');
    console.log('mongodb+srv://username:password@cluster.abc123.mongodb.net/database?retryWrites=true&w=majority');
  } finally {
    // إغلاق الاتصال
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 تم إغلاق الاتصال');
    }
  }
}

// تشغيل الاختبار
اختباراتصالMongoDB().catch(console.error); 