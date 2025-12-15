const express = require("express");
const router = express.Router();
const Review = require("../models/internReview.model");

// Add validation
router.post("/submit-review", async (req, res) => {
  try {
    req.body.date = new Date().toISOString().split("T")[0];
    const review = new Review(req.body);
    await review.save();
    res.json({ success: true, message: "Review saved", id: review._id });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to save review" });
  }
});

// GET latest review for an intern (used by HR screen)
// GET /api/reviews/:internId?month=2025-12
router.get("/:internId", async (req, res) => {
  try {
    const internId = req.params.internId;
    const { month } = req.query; // "yyyy-MM"
    const query = { internId };

    if (month) query.date = new RegExp(`^${month}`); // matches "2025-12-10"

    const review = await Review.findOne(query).sort({ date: -1 }).lean();

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.json(review);
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch review" });
  }
});


// PUT: HR updates grades for each goal on that review
// PUT /api/reviews/:internId/grade?month=2025-12
router.put("/:internId/grade", async (req, res) => {
  try {
    const internId = req.params.internId;
    const { month } = req.query;
    const { goals } = req.body; // [{ _id, grade }]

    if (!Array.isArray(goals) || goals.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Goals array with _id and grade is required" });
    }

    const query = { internId };
    if (month) query.date = new RegExp(`^${month}`);

    const review = await Review.findOne(query);

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    const gradeMap = new Map(
      goals
          .filter(g => g._id && typeof g.grade === "string")
          .map(g => [String(g._id), g.grade])
    );

    review.goals.forEach(goal => {
      const id = String(goal._id);
      if (gradeMap.has(id)) {
        goal.grade = gradeMap.get(id);
      }
    });

    await review.save();

    res.json({ success: true, message: "Grades updated", review });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update grades" });
  }
});


// GET current-month self review for an intern
// GET /api/reviews/self/:internId
router.get("/self/:internId", async (req, res) => {
  try {
    const internId = req.params.internId;

    // current month in yyyy-MM
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    const query = {
      internId,
      date: new RegExp(`^${monthStr}`), // matches "2025-12-10"
    };

    const review = await Review.findOne(query).sort({ date: -1 }).lean();

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found for this month" });
    }

    return res.json(review);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch self review" });
  }
});


module.exports = router;


