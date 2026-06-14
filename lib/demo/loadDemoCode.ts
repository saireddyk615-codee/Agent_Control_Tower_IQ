export const vulnerableExpressCode = `// Synthetic demo vulnerability only. Do not use in production.
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
  const query = "SELECT * FROM users WHERE email = '" + req.body.email + "'";
  const user = await db.query(query);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token });
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ uploadedPath: req.file.path });
});

app.listen(3000);`;

export const fixedExpressCode = `// Synthetic safer application for SecureGuard-LM IQ demonstrations only.
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const db = require("./demo-db");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
const trustedOrigins = new Set(["https://portal.secureguard.example"]);
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
  if (!/^\\d+$/.test(req.params.id)) {
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

  const safeName = \`\${crypto.randomUUID()}\${path.extname(req.file.originalname).toLowerCase()}\`;
  const safePath = path.resolve(uploadDirectory, safeName);
  if (!safePath.startsWith(\`\${uploadDirectory}\${path.sep}\`)) {
    return res.status(400).json({ error: "Invalid upload path" });
  }

  return res.json({ fileId: safeName });
});

app.listen(3000);`;

export interface DemoCodeSample {
  id: string;
  label: string;
  filename: string;
  code: string;
}

export const demoCodeSamples: DemoCodeSample[] = [
  { id: "javascript", label: "JavaScript / Express", filename: "app.js", code: vulnerableExpressCode },
  {
    id: "python",
    label: "Python / FastAPI",
    filename: "main.py",
    code: `# Synthetic demo vulnerability only. Do not use in production.
from fastapi import FastAPI, Request
import pickle
import sqlite3
import subprocess
app = FastAPI(debug=True)
JWT_SECRET = "demo_python_secret"
@app.get("/users/{user_id}")
def user(user_id: str):
    db = sqlite3.connect("demo.db")
    return db.execute(f"SELECT * FROM users WHERE id = {user_id}").fetchall()
@app.get("/run")
def run(request: Request):
    return subprocess.run(request.query_params["cmd"], shell=True)
@app.post("/restore")
def restore(payload: bytes):
    return pickle.loads(payload)`,
  },
  {
    id: "java",
    label: "Java / Spring Boot",
    filename: "UserController.java",
    code: `// Synthetic demo vulnerability only. Do not use in production.
@RestController
public class UserController {
  private static final String API_SECRET = "demo_java_secret";
  @GetMapping("/users")
  public Object user(@RequestParam String id) throws Exception {
    String query = "SELECT * FROM users WHERE id = " + id;
    statement.executeQuery(query);
    Runtime.getRuntime().exec(id);
    return new ObjectInputStream(request.getInputStream()).readObject();
  }
}`,
  },
  {
    id: "csharp",
    label: "C# / ASP.NET",
    filename: "Program.cs",
    code: `// Synthetic demo vulnerability only. Do not use in production.
using Microsoft.AspNetCore.Mvc;
using System.Data.SqlClient;
using System.Diagnostics;
public class UserController : ControllerBase {
  private const string JwtSecret = "demo_csharp_secret";
  [HttpGet]
  public void Get(string id) {
    var command = new SqlCommand("SELECT * FROM users WHERE id = " + id);
    Process.Start(id);
    handler.ServerCertificateCustomValidationCallback = (_, _, _, _) => true;
  }
}`,
  },
  {
    id: "go",
    label: "Go / HTTP API",
    filename: "main.go",
    code: `// Synthetic demo vulnerability only. Do not use in production.
package main
import ("crypto/tls"; "fmt"; "net/http"; "os/exec")
const jwtSecret = "demo_go_secret"
func user(w http.ResponseWriter, r *http.Request) {
  id := r.URL.Query().Get("id")
  db.Query(fmt.Sprintf("SELECT * FROM users WHERE id = %s", id))
  exec.Command(id).Run()
  _ = &tls.Config{InsecureSkipVerify: true}
}`,
  },
  {
    id: "php",
    label: "PHP / Web App",
    filename: "app.php",
    code: `<?php
// Synthetic demo vulnerability only. Do not use in production.
$api_secret = "demo_php_secret";
$db->query("SELECT * FROM users WHERE id = " . $_GET["id"]);
system($_POST["cmd"]);
move_uploaded_file($_FILES["upload"]["tmp_name"], "uploads/" . $_FILES["upload"]["name"]);`,
  },
  {
    id: "cpp",
    label: "C++ / System Utility",
    filename: "main.cpp",
    code: `// Synthetic demo vulnerability only. Do not use in production.
#include <cstdlib>
#include <cstring>
#include <cstdio>
const char* api_secret = "demo_cpp_secret";
int main(int argc, char** argv) {
  char buffer[16];
  strcpy(buffer, argv[1]);
  sprintf(buffer, "%s", argv[2]);
  return system(argv[1]);
}`,
  },
  {
    id: "rust",
    label: "Rust / CLI",
    filename: "main.rs",
    code: `// Synthetic demo vulnerability only. Do not use in production.
use std::env;
use std::process::Command;
const API_SECRET: &str = "demo_rust_secret";
fn main() {
  let args: Vec<String> = env::args().collect();
  Command::new(args[1].clone()).arg(&args[2]).status().unwrap();
  unsafe { std::ptr::read(args.as_ptr()); }
}`,
  },
];
