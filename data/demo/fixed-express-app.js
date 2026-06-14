/* eslint-disable @typescript-eslint/no-require-imports */
// Synthetic safer application for SecureGuard-LM IQ demonstrations only.
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const db = require("./demo-db");

const app = express();
const trustedOrigins = new Set(["https://portal.secureguard.example"]);
const JWT_SECRET = process.env.JWT_SECRET;
const uploadDirectory = path.resolve("/var/lib/secureguard/uploads");
const allowedMimeTypes = new Set(["image/png", "image/jpeg"]);
const allowedExtensions = new Set([".png", ".jpg", ".jpeg"]);

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured");
}

const upload = multer({
  dest: uploadDirectory,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isAllowed = allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(extension);
    callback(isAllowed ? null : new Error("Unsupported file type"), isAllowed);
  },
});

app.use(express.json({ limit: "32kb" }));
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || trustedOrigins.has(origin));
    },
  }),
);

app.get("/users/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const user = await db.query("SELECT * FROM users WHERE id = $1", [Number(req.params.id)]);
  return res.json(user);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid credentials format" });
  }

  const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "15m" });
  return res.json({ token });
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Valid file required" });
  }

  const safeName = `${crypto.randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;
  const safePath = path.resolve(uploadDirectory, safeName);
  if (!safePath.startsWith(`${uploadDirectory}${path.sep}`)) {
    return res.status(400).json({ error: "Invalid upload path" });
  }

  return res.json({ fileId: safeName });
});

app.listen(3000);
