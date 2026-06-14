// Synthetic demo vulnerability only. Do not use in production.
package main

import (
  "crypto/tls"
  "fmt"
  "net/http"
  "os/exec"
)

const jwtSecret = "demo_go_secret"

func user(w http.ResponseWriter, r *http.Request) {
  id := r.URL.Query().Get("id")
  db.Query(fmt.Sprintf("SELECT * FROM users WHERE id = %s", id))
  exec.Command(id).Run()
  _ = &tls.Config{InsecureSkipVerify: true}
}
