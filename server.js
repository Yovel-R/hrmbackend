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
app.use('/api/employeeAttanance', require('./routes/EmployeeAttendance'));
app.use("/api/employee-leave", require("./routes/employeeLeave.routes"));
app.use("/api/employee-reviews", require("./routes/employeeReview.routes"));
app.use("/api/employee-resignations", require("./routes/employee-resignation-routes"));
app.use('/api/employee-terminations', require('./routes/employeeTermination.routes'));
app.use('/api/leave-counter', require('./routes/leaveCounter.routes'));



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

