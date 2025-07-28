# Tabib IQ Frontend

Frontend application for Tabib IQ medical consultation platform built with React.

## 🚀 Features

- **Multi-language Support**: Arabic, Kurdish, and English
- **User Authentication**: Login and registration for patients and doctors
- **Doctor Management**: Doctor profiles, appointments, and dashboard
- **Patient Portal**: Appointment booking, profile management
- **Admin Dashboard**: User and doctor management
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API running

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tabib-iq-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Create `.env` file in the root directory
   - Add the following variables:
     ```env
     REACT_APP_API_URL=https://api.tabib-iq.com/api
     ```

4. **Start the development server**
   ```bash
   npm start
   ```

The application will open at `http://localhost:3000`

## 🚀 Building for Production

```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/          # React components
├── pages/              # Page components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── utils/              # Utility functions
├── locales/            # Translation files
├── App.js              # Main app component
└── index.js            # Entry point
```

## 🌐 Deployment

### Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically

### Netlify
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically

### Render
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically

## 🔧 Configuration

### Environment Variables
- `REACT_APP_API_URL`: Backend API URL

### Language Support
The application supports three languages:
- Arabic (ar)
- Kurdish (ku)
- English (en)

## 📱 Pages

- **Login**: User authentication
- **Register**: User registration
- **Home**: Main dashboard for patients
- **Doctor Dashboard**: Doctor management interface
- **Admin Dashboard**: Administrative interface
- **Profile**: User profile management
- **Appointments**: Appointment management

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