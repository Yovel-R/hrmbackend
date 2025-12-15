const express = require("express");
const router = express.Router();
const { hrSignup, hrLogin } = require("../controllers/HrLoginController");

router.post("/signup", hrSignup);
router.post("/login", hrLogin);

module.exports = router;
