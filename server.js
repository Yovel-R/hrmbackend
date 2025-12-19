// // const express = require('express');
// // const cors = require('cors');
// // const mongoose = require('mongoose');
// // const hrRoutes = require('./routes/HrRouters');
// // const internRoutes = require("./routes/internRoutes");
// // const attendanceRoutes = require("./routes/attendanceroutes");
// // const internReviewRoute = require("./routes/internReview.route.js");
// // const leaveRoutes = require("./routes/leave.routes");
// // const resignationRoutes = require("./routes/resignation.routes.js");

// // const multer = require('multer');
// // const { google } = require('googleapis');
// // const fs = require('fs');
// // const { PassThrough } = require('stream');


// // require('dotenv').config();

// // const app = express();
// // app.use(cors({ origin: '*' }));
// // app.use(express.json());


// // // Multer Memory Storage
// // const upload = multer({ storage: multer.memoryStorage() });

// // // MongoDB Connection
// // mongoose.connect('mongodb://127.0.0.1:27017/hrdb')
// //     .then(() => console.log('MongoDB connected for HR'))
// //     .catch(err => console.error('MongoDB connection error:', err));

// // app.use('/api/hr', hrRoutes);
// // app.use("/api/intern", internRoutes);
// // app.use("/api/attendance", attendanceRoutes);
// // app.use("/api/reviews", internReviewRoute);
// // app.use("/api/leave", leaveRoutes);
// // app.use("/api/resignation", resignationRoutes);


// // // ============================
// // // 🚀 GOOGLE DRIVE SETUP
// // // ============================
// // const credentialsPath = './service-account-key.json';

// // let drive = null;
// // const COMPANY_FOLDER_ID = '1iB8I7-0W2hCcFEMFX3I4t5cJPIEpGdgX';
// // const COMPANY_EMAIL = 'demohr1234@gmail.com';

// // if (!fs.existsSync(credentialsPath)) {
// //   console.error('❌ service-account-key.json NOT FOUND!');
// // } else {
// //   const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// //   const auth = new google.auth.GoogleAuth({
// //     credentials,
// //     scopes: ['https://www.googleapis.com/auth/drive'],
// //   });

// //   drive = google.drive({ version: 'v3', auth });
// // }

// // // ============================
// // // 🚀 UPLOAD ROUTE (FULLY FIXED)
// // // ============================
// // app.post('/api/upload', upload.single('file'), async (req, res) => {
// //   try {
// //     if (!drive) {
// //       return res.status(500).json({ success: false, message: "Google Drive not initialized" });
// //     }

// //     const { internId, documentType, originalName } = req.body;

// //     if (!req.file) {
// //       return res.status(400).json({ success: false, message: "No file uploaded" });
// //     }

// //     console.log(`📤 Uploading: ${originalName}`);

// //     // Convert buffer → stream
// //     const bufferStream = new PassThrough();
// //     bufferStream.end(req.file.buffer);

// //     const fileMetadata = {
// //       name: originalName,
// //       parents: [COMPANY_FOLDER_ID],
// //     };

// //     const media = {
// //       mimeType: req.file.mimetype,
// //       body: bufferStream,   // 🔥 FIXED
// //     };

// //     // Upload file to Drive
// //     const driveFile = await drive.files.create({
// //       requestBody: fileMetadata,
// //       media: media,
// //     });

// //     // Make file readable
// //     await drive.permissions.create({
// //       fileId: driveFile.data.id,
// //       requestBody: {
// //         role: 'reader',
// //         type: 'user',
// //         emailAddress: COMPANY_EMAIL,
// //       },
// //     });

// //     console.log(`✅ File uploaded → Drive ID: ${driveFile.data.id}`);

// //     res.json({
// //       success: true,
// //       driveUrl: `https://drive.google.com/file/d/${driveFile.data.id}/view`,
// //     });

// //   } catch (error) {
// //     console.error("❌ Google Drive Error:", error.message);
// //     res.status(500).json({ success: false, message: error.message });
// //   }
// // });

// // // TEST ROUTE
// // app.get('/ping', (req, res) => {
// //   res.json({ alive: true, timestamp: new Date().toISOString() });
// // });

// // // Server Start
// // app.listen(5001, '0.0.0.0', () => {
// //   console.log('🚀 HR Server Running: http://0.0.0.0:5001');
// //   console.log('📱 Flutter USB: http://10.198.94.180:5001');
// //   console.log('📤 Google Drive Uploads READY!');
// // });
// // server.js
// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const multer = require('multer');
// const { google } = require('googleapis');
// const fs = require('fs');
// const { PassThrough } = require('stream');
// require('dotenv').config();

// // ============================
// // MongoDB Connection
// // ============================
// mongoose.connect('mongodb://127.0.0.1:27017/hrdb')
//   .then(() => console.log('MongoDB connected for HR'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // ============================
// // Express App
// // ============================
// const app = express();
// app.use(cors({ origin: '*' }));
// app.use(express.json());

// // your other routes...
// const hrRoutes = require('./routes/HrRouters');
// const internRoutes = require("./routes/internRoutes");
// const attendanceRoutes = require("./routes/attendanceroutes");
// const internReviewRoute = require("./routes/internReview.route.js");
// const leaveRoutes = require("./routes/leave.routes");
// const resignationRoutes = require("./routes/resignation.routes.js");
// const emailRoutes = require("./routes/send-documents");

// app.use('/api/hr', hrRoutes);
// app.use("/api/intern", internRoutes);
// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/reviews", internReviewRoute);
// app.use("/api/leave", leaveRoutes);
// app.use("/api/resignation", resignationRoutes);
// app.use("/api", emailRoutes);

// // ============================
// // Multer (memory storage)
// // ============================
// const upload = multer({ storage: multer.memoryStorage() });


// // ============================
// // Start Server
// // ============================
// const PORT = 5001;
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`🚀 HR Server Running on http://0.0.0.0:${PORT}`);
// });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================
// MongoDB Atlas Connection
// ============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB error:', err));


// ============================
// Routes
// ============================
app.use('/api/hr', require('./routes/HrRouters'));
app.use('/api/intern', require('./routes/internRoutes'));
app.use('/api/attendance', require('./routes/attendanceroutes'));
app.use('/api/reviews', require('./routes/internReview.route'));
app.use('/api/leave', require('./routes/leave.routes'));
app.use('/api/resignation', require('./routes/resignation.routes'));
app.use('/api', require('./routes/send-documents'));
app.use('/api/employee', require('./routes/EmployeeRouter'));

// ============================
// Test Route
// ============================
app.get('/', (req, res) => {
  res.send('HRM Backend is running');
});


// ============================
// Start Server
// ============================
const PORT = process.env.PORT || 5001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

