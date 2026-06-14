// Synthetic demo vulnerability only. Do not use in production.
#include <cstdlib>
#include <cstring>
#include <cstdio>

const char* api_secret = "demo_cpp_secret";
int main(int argc, char** argv) {
  char buffer[16];
  strcpy(buffer, argv[1]);
  sprintf(buffer, "%s", argv[2]);
  return system(argv[1]);
}
