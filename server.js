const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

const corsOptions = {
  origin: ['https://tabib-iq.com', 'https://www.tabib-iq.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple health check endpoint (for Railway/Render)
app.get('/api/health', (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus
    });
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: 'unknown',
      note: 'Server is running but database status unknown'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    health: '/api/health'
  });
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF and document files are allowed!'));
    }
  }
});

// User Schema
const userSchema = new mongoose.Schema({
  first_name: { type: String },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  user_type: { type: String, enum: ['user', 'doctor', 'admin'], default: 'user' },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  avatar: { type: String },
  image: { type: String },
  active: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Doctor Schema
const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  password: { type: String },
  name: { type: String },
  phone: { type: String },
  specialty: { type: String },
  specialization: { type: String },
  province: { type: String },
  area: { type: String },
  clinicLocation: { type: String },
  image: { type: String },
  idFront: { type: String },
  idBack: { type: String },
  syndicateFront: { type: String },
  syndicateBack: { type: String },
  about: { type: String },
  bio: { type: String },
  workTimes: [{
    day: String,
    from: String,
    to: String
  }],
  availableDays: [String],
  availableHours: {
    start: String,
    end: String
  },
  experienceYears: { type: Number },
  experience: { type: Number },
  consultationFee: { type: Number },
  isIndependent: { type: Boolean },
  status: { type: String, default: 'pending' },
  isVerified: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  is_featured: { type: Boolean, default: false },
  user_type: { type: String, default: 'doctor' },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  serviceType: { type: String },
  date: { type: String },
  appointmentDate: { type: Date },
  time: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  type: { type: String, enum: ['consultation', 'follow-up', 'normal'], default: 'consultation' },
  notes: { type: String },
  symptoms: { type: String },
  prescription: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tabib IQ API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      test: '/api/test-db',
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login'
      },
      doctors: {
        list: '/api/doctors',
        create: '/api/doctors',
        get: '/api/doctors/:id'
      },
      appointments: {
        create: '/api/appointments',
        patient: '/api/appointments/patient/:patientId',
        doctor: '/api/appointments/doctor/:doctorId',
        update: '/api/appointments/:id/status'
      }
    }
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working!', timestamp: new Date().toISOString() });
});

// Check user authentication status
app.post('/api/check-auth', async (req, res) => {
  try {
    if (!User) {
      return res.status(503).json({ 
        authenticated: false, 
        message: 'Database not connected' 
      });
    }
    
    const { userId } = req.body;
    
    console.log('🔍 Checking auth for userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ 
        authenticated: false, 
        message: 'No user ID provided' 
      });
    }
    
    const user = await User.findById(userId);
    console.log('🔍 User found in database:', !!user);
    
    if (!user) {
      return res.status(401).json({ 
        authenticated: false, 
        message: 'User not found in database' 
      });
    }
    
    res.json({ 
      authenticated: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        user_type: user.user_type || user.role
      }
    });
  } catch (error) {
    console.error('❌ check-auth error:', error);
    res.status(500).json({ 
      authenticated: false, 
      message: 'Server error' 
    });
  }
});



// User Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role
    });
    
    await user.save();
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔍 محاولة تسجيل دخول:', { email });
    
    // Find user in users collection
    let user = await User.findOne({ email });
    console.log('🔍 تم البحث في users collection:', !!user);
    
    // If not found in users, check doctors collection
    if (!user) {
      const doctor = await Doctor.findOne({ email });
      console.log('🔍 تم البحث في doctors collection:', !!doctor);
      if (doctor) {
        user = {
          _id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          password: doctor.password,
          role: 'doctor',
          user_type: 'doctor',
          avatar: doctor.image
        };
      }
    }
    
    // If not found in doctors, check admins collection
    if (!user) {
      const admin = await mongoose.connection.db.collection('admins').findOne({ email });
      console.log('🔍 تم البحث في admins collection:', !!admin);
      if (admin) {
        user = {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          password: admin.password,
          role: 'admin',
          user_type: 'admin'
        };
      }
    }
    
    if (!user) {
      console.log('❌ لم يتم العثور على المستخدم');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    console.log('🔍 فحص كلمة المرور');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔍 تطابق كلمة المرور:', isMatch);
    
    if (!isMatch) {
      console.log('❌ كلمة المرور غير صحيحة');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const responseData = {
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name || user.first_name,
        email: user.email,
        role: user.role || user.user_type,
        avatar: user.avatar || user.image
      }
    };
    
    console.log('✅ تم تسجيل الدخول بنجاح:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin login endpoint (for backward compatibility)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin in admins collection
    const admin = await mongoose.connection.db.collection('admins').findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    res.json({
      message: 'Admin login successful',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        user_type: 'admin'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Doctor Routes
app.post('/api/doctors', upload.single('license'), async (req, res) => {
  try {
    const { userId, specialization, experience, bio, consultationFee, availableDays, availableHours } = req.body;
    
    // Check if user exists and is a doctor
    const user = await User.findById(userId);
    if (!user || user.role !== 'doctor') {
      return res.status(400).json({ message: 'Invalid user or user is not a doctor' });
    }
    
    // Check if doctor profile already exists
    const existingDoctor = await Doctor.findOne({ userId });
    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor profile already exists' });
    }
    
    const doctor = new Doctor({
      userId,
      specialization,
      license: req.file ? req.file.filename : req.body.license,
      experience,
      bio,
      consultationFee,
      availableDays: JSON.parse(availableDays || '[]'),
      availableHours: JSON.parse(availableHours || '{}')
    });
    
    await doctor.save();
    
    res.status(201).json({
      message: 'Doctor profile created successfully',
      doctor
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find({ 
      $or: [
        { status: 'approved' },
        { isVerified: true }
      ],
      $or: [
        { active: true },
        { isAvailable: true }
      ]
    }).select('-password -idFront -idBack -syndicateFront -syndicateBack');
    
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'name email avatar phone')
      .select('-license');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/admin/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find({}).select('-password -idFront -idBack -syndicateFront -syndicateBack');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/doctors/:id/approve', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', isVerified: true },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({ message: 'Doctor approved successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/doctors/:id/reject', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({ message: 'Doctor rejected successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/doctors/:id/feature', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { is_featured: true },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({ message: 'Doctor featured successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/doctors/:id/unfeature', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { is_featured: false },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({ message: 'Doctor unfeatured successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/admin/toggle-account/user/:id', async (req, res) => {
  try {
    const { disabled } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { disabled },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/admin/toggle-account/doctor/:id', async (req, res) => {
  try {
    const { disabled } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { disabled },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({ message: 'Doctor status updated successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Health Centers Routes
app.get('/api/health-centers', async (req, res) => {
  try {
    // Placeholder - you can add a HealthCenter model later
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/health-centers', async (req, res) => {
  try {
    // Placeholder - you can add a HealthCenter model later
    res.status(201).json({ message: 'Health center created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/health-centers/:id', async (req, res) => {
  try {
    // Placeholder - you can add a HealthCenter model later
    res.json({ message: 'Health center deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    
    console.log('🔍 requireAuth - patientId:', patientId);
    
    if (!patientId) {
      console.log('❌ No patientId provided');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user exists in database
    const user = await User.findById(patientId);
    console.log('🔍 requireAuth - user found:', !!user);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ message: 'User not found in database' });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ requireAuth error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Appointment Routes
app.post('/api/appointments', requireAuth, async (req, res) => {
  try {
    const { patientId, doctorId, date, time, type, notes, symptoms } = req.body;
    
    console.log('🔍 Booking appointment:', { patientId, doctorId, date, time });
    
    // Check if patient and doctor exist
    const patient = await User.findById(patientId);
    const doctor = await Doctor.findById(doctorId);
    
    console.log('🔍 Patient found:', !!patient);
    console.log('🔍 Doctor found:', !!doctor);
    
    if (!patient || !doctor) {
      console.log('❌ Invalid patient or doctor');
      return res.status(400).json({ message: 'Invalid patient or doctor' });
    }
    
    // Check if appointment time is available
    const existingAppointment = await Appointment.findOne({
      doctorId,
      date,
      time,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'Appointment time not available' });
    }
    
    const appointment = new Appointment({
      patientId,
      doctorId,
      date,
      time,
      type,
      notes,
      symptoms
    });
    
    await appointment.save();
    
    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/appointments/patient/:patientId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.params.patientId })
      .populate('doctorId')
      .populate('patientId', 'name email')
      .sort({ date: 1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/appointments/doctor/:doctorId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.params.doctorId })
      .populate('patientId', 'name email phone')
      .sort({ date: 1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Middleware to check if user exists in database
const requireUserExists = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      return res.status(401).json({ message: 'User ID required' });
    }
    
    // Check if user exists in database
    const user = await User.findById(patientId);
    if (!user) {
      return res.status(401).json({ message: 'User not found in database' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Get booked appointments for a specific doctor on a specific date
app.get('/api/appointments/:doctorId/:date', requireUserExists, async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    
    const appointments = await Appointment.find({
      doctorId: doctorId,
      date: date,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all appointments (for admin)
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find({})
      .populate('userId', 'name email')
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/appointments/:id/status', async (req, res) => {
  try {
    const { status, prescription } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        prescription,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json({
      message: 'Appointment status updated successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({ message: 'Something went wrong!', error: error.message });
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      message: 'Database connection test',
      status: statusText[dbStatus] || 'unknown',
      readyState: dbStatus,
      timestamp: new Date().toISOString(),
      database: mongoose.connection.name || 'Not connected'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test static files endpoint
app.get('/api/test-files', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'uploads');
    
    let files = [];
    if (fs.existsSync(uploadsDir)) {
      files = fs.readdirSync(uploadsDir).filter(file => 
        !file.startsWith('.') && file !== '.gitkeep'
      );
    }
    
    res.json({
      message: 'Static files test',
      uploadsDirectory: uploadsDir,
      filesCount: files.length,
      files: files.slice(0, 10), // Show first 10 files
      timestamp: new Date().toISOString(),
      staticPath: '/uploads'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Files test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/test-db',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/doctors',
      'POST /api/doctors',
      'GET /api/doctors/:id',
      'POST /api/appointments',
      'GET /api/appointments/patient/:patientId',
      'GET /api/appointments/doctor/:doctorId',
      'PUT /api/appointments/:id/status'
    ]
  });
});

// Suppress deprecation warnings
process.noDeprecation = true;

// Start server
const PORT = process.env.PORT || 5000;

// Initialize models after database connection
let User, Doctor, Appointment;

const startServer = async () => {
  try {
    console.log('🔄 Starting server...');
    
    // Start server first
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Root endpoint: http://localhost:${PORT}/`);
    });
    
    // Set timeout for connections
    server.timeout = 30000; // 30 seconds
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      }
    });
    
    // Try to connect to database (but don't fail if it doesn't work)
    try {
      console.log('🔄 Connecting to database...');
      await connectDB();
      
      // Initialize models after successful database connection
      User = mongoose.model('User', userSchema);
      Doctor = mongoose.model('Doctor', doctorSchema);
      Appointment = mongoose.model('Appointment', appointmentSchema);
      console.log('✅ Models initialized successfully');
      
    } catch (dbError) {
      console.error('❌ Database connection failed, but server is running:', dbError.message);
      console.log('⚠️ Server will continue without database connection');
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  });
});

startServer(); 