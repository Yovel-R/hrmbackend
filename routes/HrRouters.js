// routes/HrRouters.js
const express = require("express");
const router = express.Router();
const { hrSignup, hrLogin, savePolicyUrl, getPolicyUrl } =
  require("../controllers/HrLoginController");

router.post("/signup", hrSignup);
router.post("/login", hrLogin);
router.post("/policy/save", savePolicyUrl);
router.get("/policy", getPolicyUrl);

module.exports = router;
