# Synthetic demo vulnerability only. Do not use in production.
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
    return pickle.loads(payload)
