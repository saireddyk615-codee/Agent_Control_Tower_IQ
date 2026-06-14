// Synthetic demo vulnerability only. Do not use in production.
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
}
