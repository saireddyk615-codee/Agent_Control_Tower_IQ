<?php
// Synthetic demo vulnerability only. Do not use in production.
$api_secret = "demo_php_secret";
$id = $_GET["id"];
$db->query("SELECT * FROM users WHERE id = " . $_GET["id"]);
system($_POST["cmd"]);
move_uploaded_file($_FILES["upload"]["tmp_name"], "uploads/" . $_FILES["upload"]["name"]);
