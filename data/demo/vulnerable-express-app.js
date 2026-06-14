/* eslint-disable @typescript-eslint/no-require-imports */
// Synthetic demo vulnerability only. Do not use in production.
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const db = require("./demo-db");

const app = express();
const upload = multer({ dest: "public/uploads/" });
const JWT_SECRET = "demo_fake_secret_do_not_use";

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/users/:id", async (req, res) => {
  const query = "SELECT * FROM users WHERE id = " + req.params.id;
  const user = await db.query(query);
  res.json(user);
});

app.post("/login", async (req, res) => {
  const query =
    "SELECT * FROM users WHERE email = '" +
    req.body.email +
    "' AND password = '" +
    req.body.password +
    "'";
  const user = await db.query(query);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token });
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ uploadedPath: req.file.path });
});

app.listen(3000);
