// Synthetic demo vulnerability only. Do not use in production.
use std::env;
use std::process::Command;

const API_SECRET: &str = "demo_rust_secret";
fn main() {
    let args: Vec<String> = env::args().collect();
    Command::new(args[1].clone()).arg(&args[2]).status().unwrap();
    unsafe { std::ptr::read(args.as_ptr()); }
}
