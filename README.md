# Tabib IQ Backend API

Backend API for Tabib IQ medical consultation platform built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication**: Register, login, and profile management
- **Doctor Management**: Doctor registration, profiles, and verification
- **Appointment System**: Create, manage, and track appointments
- **File Upload**: Support for images and documents
- **Health Check**: API health monitoring endpoint
- **CORS Support**: Cross-origin resource sharing configuration

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tabib-iq-backend
   ```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
   - Copy `env.example` to `.env`
   - Update the following variables:
     ```env
     PORT=5000
     NODE_ENV=development
     MONGO_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     CORS_ORIGIN=https://tabib-iq.com,https://www.tabib-iq.com,http://localhost:3000
     MAX_FILE_SIZE=5242880
     UPLOAD_PATH=./uploads
     ```

4. **Create uploads directory**
```bash
   mkdir uploads
```

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Endpoints

### Root
- `GET /` - API information and available endpoints

### Health Check
- `GET /api/health` - Check API health status
- `GET /api/test-db` - Test database connection

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Doctors
- `POST /api/doctors` - Create doctor profile
- `GET /api/doctors` - Get all verified doctors
- `GET /api/doctors/:id` - Get specific doctor

### Appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/patient/:patientId` - Get patient appointments
- `GET /api/appointments/doctor/:doctorId` - Get doctor appointments
- `PUT /api/appointments/:id/status` - Update appointment status

## 🗄️ Database Schema

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: String (patient/doctor/admin),
  avatar: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Doctor Schema
```javascript
{
  userId: ObjectId (ref: User),
  specialization: String,
  license: String,
  experience: Number,
  bio: String,
  consultationFee: Number,
  availableDays: [String],
  availableHours: { start: String, end: String },
  rating: Number,
  totalRatings: Number,
  isVerified: Boolean,
  isAvailable: Boolean
}
```

### Appointment Schema
```javascript
{
  patientId: ObjectId (ref: User),
  doctorId: ObjectId (ref: Doctor),
  date: Date,
  time: String,
  status: String (pending/confirmed/cancelled/completed),
  type: String (consultation/follow-up),
  notes: String,
  symptoms: String,
  prescription: String,
  createdAt: Date
}
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CORS_ORIGIN`: Allowed CORS origins
- `MAX_FILE_SIZE`: Maximum file upload size in bytes
- `UPLOAD_PATH`: Directory for uploaded files

## 📁 Project Structure

```
tabib-iq-backend/
├── server.js          # Main application file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
├── env.example       # Environment variables template
├── env.production    # Production environment variables
├── uploads/          # File upload directory
├── README.md         # This file
├── .gitignore        # Git ignore rules
├── Procfile          # Heroku configuration
├── railway.json      # Railway configuration
├── render.yaml       # Render configuration
└── vercel.json       # Vercel configuration
```

## 🚀 Deployment

### Railway (Recommended)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CORS_ORIGIN=https://tabib-iq.com,https://www.tabib-iq.com
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=./uploads
   ```
3. Deploy automatically

### Render
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Set environment variables in Vercel dashboard

### Heroku
1. Install Heroku CLI
2. Run: `heroku create`
3. Set environment variables: `heroku config:set KEY=value`
4. Deploy: `git push heroku main`

## 🔍 Health Check

The API includes health check endpoints:

### Root endpoint (`GET /`)
```json
{
  "message": "Tabib IQ API is running!",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "endpoints": {
    "health": "/api/health",
    "auth": {
      "register": "/api/auth/register",
      "login": "/api/auth/login"
    },
    "doctors": {
      "list": "/api/doctors",
      "create": "/api/doctors",
      "get": "/api/doctors/:id"
    },
    "appointments": {
      "create": "/api/appointments",
      "patient": "/api/appointments/patient/:patientId",
      "doctor": "/api/appointments/doctor/:doctorId",
      "update": "/api/appointments/:id/status"
    }
  }
}
```

### Health check (`GET /api/health`)
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "uptime": 123.456,
  "environment": "production"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository. 