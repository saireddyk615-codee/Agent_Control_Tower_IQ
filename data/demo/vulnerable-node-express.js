/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
// Synthetic demo vulnerability only. Do not use in production.
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const db = require("./demo-db");
const app = express();
const JWT_SECRET = "demo_fake_secret_do_not_use";
const upload = multer({ dest: "public/uploads/" });
app.use(cors({ origin: "*" }));
app.get("/users/:id", async (req, res) => {
  const user = await db.query("SELECT * FROM users WHERE id = " + req.params.id);
  res.json(user);
});
app.post("/upload", upload.single("file"), (req, res) => res.json(req.file));
