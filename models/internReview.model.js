const mongoose = require("mongoose");

const GoalSchema = new mongoose.Schema({
  perspective: { type: String, required: true },
  kpi:         { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, required: true },
  weight:      { type: Number, required: true },
  comment:     { type: String, default: "" },
  grade:       { type: String, default: "" }   // A / B / C / D
});

const ReviewSchema = new mongoose.Schema({
  internId:   { type: String, required: true },
  internName: { type: String, required: true },
  team:       { type: String, required: true },
  goals:      { type: [GoalSchema], default: [] },
  date:       { type: String, required: true }, // e.g. "2025-12-10"
});

module.exports = mongoose.model("Review", ReviewSchema);
