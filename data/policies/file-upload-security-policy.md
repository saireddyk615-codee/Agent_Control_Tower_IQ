# File Upload Security Policy

## Section 3.1: Validate file type and extension

Upload handlers must validate both the declared MIME type and file extension against an explicit allowlist.

## Section 3.2: Enforce file size limits

Upload handlers must reject files that exceed the documented maximum size.

## Section 3.3: Normalize paths and prevent path traversal

Applications must normalize upload paths, generate server-controlled filenames, and verify that resolved paths remain inside the approved upload directory.

## Section 3.4: Store uploads outside executable directories when possible

Uploaded files should be stored outside public or executable application directories whenever possible.
