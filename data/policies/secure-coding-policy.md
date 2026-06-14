# Secure Coding Policy

## Section 5.1: Prefer parameterized database queries

Database access must use parameterized queries or prepared statements for all untrusted values.

## Section 5.2: Avoid unsafe string concatenation in queries

Applications must not construct database queries by concatenating user-controlled strings.

## Section 5.3: Require human review for high-risk security changes

High-risk security changes and generated remediations require human review before merge or deployment.
