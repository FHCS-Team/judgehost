const { Router } = require("express");

const router = Router();

// POST /submissions - accept a simple submission payload
router.post("/", (req, res) => {
  const payload = req.body;
  // In scaffold: echo back accepted payload with fake id
  const id = "subm_" + Date.now();
  res.status(201).json({ id, received: payload });
});

module.exports = router;
