const mongoose = require("mongoose");

const InternSchema = new mongoose.Schema({
  internid: { type: String, default: "" },
  fullName: { type: String, required: true },
  college: { type: String, required: true },
  year: { type: String, required: true },
  department: { type: String, required: true },
  role: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, default: "" },
  contact: { type: String, required: true },
  emergencyContact: { type: String, required: true },
  onboardingDate: { type: String, default: ""},
  endDate: { type: String, default: ""},
  linkedin: { type: String, required: true },


  // New backend auto-field
  status: { type: String, default: "initial" },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Intern", InternSchema);
