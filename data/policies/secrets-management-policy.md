# Secrets Management Policy

## Section 1.1: Do not store secrets in source code

Credentials, signing keys, API tokens, and other secrets must not be embedded in source code or committed to version control.

## Section 1.2: Use environment variables or managed secret stores

Applications must load secrets from environment variables or an approved managed secret store.

## Section 1.3: Rotate secrets if accidental exposure is detected

Any secret suspected of accidental exposure must be revoked or rotated promptly and the incident must be documented.
