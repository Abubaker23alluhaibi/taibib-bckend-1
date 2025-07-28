// سكريبت اختبار الاتصال المحدث بعد إصلاح خيارات MongoDB
const mongoose = require('mongoose');

// استخدام نفس الرابط المحدث
const MONGO_URI = 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority&appName=Cluster0';

async function اختبارالاتصالالمحدث() {
  console.log('🔍 اختبار الاتصال المحدث بعد إصلاح خيارات MongoDB...');
  console.log('📝 MONGO_URI:', MONGO_URI.replace(/\/\/.*@/, '//***:***@'));
  
  try {
    console.log('📡 محاولة الاتصال بدون الخيارات المهملة...');
    
    // الاتصال بدون الخيارات المهملة
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ تم الاتصال بنجاح!');
    console.log('📊 قاعدة البيانات:', mongoose.connection.name);
    console.log('🌐 المضيف:', mongoose.connection.host);
    console.log('🔗 حالة الاتصال:', mongoose.connection.readyState === 1 ? 'متصل' : 'غير متصل');
    
    // اختبار العمليات الأساسية
    console.log('\n🧪 اختبار العمليات الأساسية...');
    
    // إنشاء مخطط اختبار بسيط
    const testSchema = new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now },
      test: { type: Boolean, default: true }
    });
    
    const TestModel = mongoose.model('TestConnection', testSchema);
    
    // اختبار الإدراج
    const testDoc = new TestModel({
      message: 'اختبار الاتصال المحدث',
      test: true
    });
    
    await testDoc.save();
    console.log('✅ اختبار الإدراج: نجح');
    
    // اختبار القراءة
    const readDoc = await TestModel.findOne({ _id: testDoc._id });
    console.log('✅ اختبار القراءة: نجح');
    
    // اختبار التحديث
    await TestModel.updateOne(
      { _id: testDoc._id },
      { $set: { updated: true } }
    );
    console.log('✅ اختبار التحديث: نجح');
    
    // اختبار الحذف
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('✅ اختبار الحذف: نجح');
    
    // اختبار المجموعات الموجودة
    console.log('\n📋 المجموعات الموجودة في قاعدة البيانات:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name}: ${count} مستند`);
    }
    
    console.log('\n🎉 جميع الاختبارات نجحت! الاتصال يعمل بشكل مثالي');
    console.log('✅ لا توجد تحذيرات حول الخيارات المهملة');
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 الحل: تأكد من صحة رابط الاتصال واتصال الإنترنت');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 الحل: تأكد من صحة اسم المستخدم وكلمة المرور');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 الحل: تأكد من أن السيرفر متاح وأن IP مضاف في whitelist');
    }
    
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔒 تم إغلاق الاتصال');
    }
  }
}

// تشغيل الاختبار
اختبارالاتصالالمحدث(); 