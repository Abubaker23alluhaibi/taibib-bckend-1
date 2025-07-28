// سكريبت اختبار قاعدة البيانات الجديدة في الباكند
const { MongoClient } = require('mongodb');

// رابط قاعدة البيانات الجديدة
const ATLAS_URI = 'mongodb+srv://abubaker:Baker123@cluster0.kamrxrt.mongodb.net/tabibiq?retryWrites=true&w=majority&appName=Cluster0';

async function اختبارقاعدةالبياناتالجديدة() {
  console.log('🔍 اختبار قاعدة البيانات الجديدة في الباكند...');
  console.log('📝 Atlas URI:', ATLAS_URI.replace(/\/\/.*@/, '//***:***@'));
  
  let client;
  
  try {
    // الاتصال بقاعدة البيانات
    console.log('📡 محاولة الاتصال...');
    client = new MongoClient(ATLAS_URI);
    await client.connect();
    console.log('✅ تم الاتصال بنجاح!');
    
    // اختبار قاعدة البيانات
    const db = client.db('tabibiq');
    console.log('📊 قاعدة البيانات: tabibiq');
    
    // قائمة المجموعات
    console.log('\n📋 المجموعات الموجودة:');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('   ⚠️ لا توجد مجموعات في قاعدة البيانات');
    } else {
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`   ${collection.name}: ${count} مستند`);
      }
    }
    
    // اختبار المجموعات المهمة
    console.log('\n🧪 اختبار المجموعات المهمة:');
    
    // اختبار المستخدمين
    const usersCount = await db.collection('users').countDocuments();
    console.log(`   👥 المستخدمين: ${usersCount} مستخدم`);
    
    // اختبار الأطباء
    const doctorsCount = await db.collection('doctors').countDocuments();
    console.log(`   👨‍⚕️ الأطباء: ${doctorsCount} طبيب`);
    
    // اختبار المدراء
    const adminsCount = await db.collection('admins').countDocuments();
    console.log(`   👨‍💼 المدراء: ${adminsCount} مدير`);
    
    // اختبار المواعيد
    const appointmentsCount = await db.collection('appointments').countDocuments();
    console.log(`   📅 المواعيد: ${appointmentsCount} موعد`);
    
    // اختبار المراكز الصحية
    const healthCentersCount = await db.collection('healthcenters').countDocuments();
    console.log(`   🏥 المراكز الصحية: ${healthCentersCount} مركز`);
    
    // اختبار الأطباء المميزين
    const featuredDoctorsCount = await db.collection('featureddoctors').countDocuments();
    console.log(`   ⭐ الأطباء المميزين: ${featuredDoctorsCount} طبيب`);
    
    // اختبار الرسائل
    const messagesCount = await db.collection('messages').countDocuments();
    console.log(`   💬 الرسائل: ${messagesCount} رسالة`);
    
    // اختبار الإشعارات
    const notificationsCount = await db.collection('notifications').countDocuments();
    console.log(`   🔔 الإشعارات: ${notificationsCount} إشعار`);
    
    // اختبار تذكيرات الأدوية
    const medicineRemindersCount = await db.collection('medicinereminders').countDocuments();
    console.log(`   💊 تذكيرات الأدوية: ${medicineRemindersCount} تذكير`);
    
    // اختبار العمليات الأساسية
    console.log('\n🧪 اختبار العمليات الأساسية...');
    
    // اختبار الإدراج
    const testCollection = db.collection('test_backend');
    const testDoc = { 
      message: 'اختبار الباكند مع قاعدة البيانات الجديدة', 
      timestamp: new Date(),
      test: true 
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ اختبار الإدراج: نجح');
    
    // اختبار القراءة
    const readResult = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ اختبار القراءة: نجح');
    
    // اختبار التحديث
    const updateResult = await testCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { updated: true } }
    );
    console.log('✅ اختبار التحديث: نجح');
    
    // اختبار الحذف
    const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ اختبار الحذف: نجح');
    
    console.log('\n🎉 جميع الاختبارات نجحت! قاعدة البيانات جاهزة للباكند');
    
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
    if (client) {
      await client.close();
      console.log('🔒 تم إغلاق الاتصال');
    }
  }
}

// تشغيل الاختبار
اختبارقاعدةالبياناتالجديدة().catch(console.error); 