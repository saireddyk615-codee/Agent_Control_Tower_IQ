// Synthetic demo vulnerability only. Do not use in production.
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
}
