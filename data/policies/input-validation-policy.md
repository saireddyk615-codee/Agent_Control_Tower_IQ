# Input Validation Policy

## Section 2.1: Validate all external input

Applications must validate all external input before it is processed, stored, logged, or passed to another system.

## Section 2.2: Reject malformed IDs and unexpected types

Applications must reject malformed identifiers, unexpected data types, missing required fields, and values outside documented limits.

## Section 2.3: Use schema or type validation before database access

Routes must apply schema or type validation before any user-controlled value is used in a database operation.
