# Implementation Plan: Avatar Encoding Fix

## Overview

This plan implements a UTF-8 safe base64 encoding solution to fix the avatar encoding bug where `btoa()` fails with Unicode characters. The implementation creates a new utility module with encoding functions and updates the affected components to use the new safe encoding method.

## Tasks

- [x] 1. Create UTF-8 safe encoding utility module
  - Create `polaris-tools/utils/encoding.ts` with `utf8ToBase64()` and `encodeSvgToDataUri()` functions
  - Implement UTF-8 to base64 conversion using TextEncoder and btoa()
  - Add error handling for invalid inputs with fallback placeholder
  - Add JSDoc documentation for both functions
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 1.1 Write property test for round-trip encoding integrity
  - **Property 1: Round-Trip Encoding Integrity**
  - **Validates: Requirements 1.1, 4.1, 5.1, 5.2**
  - Generate random UTF-8 strings including Unicode characters
  - Encode to base64 then decode back to UTF-8
  - Assert decoded string equals original
  - Configure test to run 100+ iterations
  - _Requirements: 1.1, 4.1, 5.1, 5.2_

- [ ]* 1.2 Write property test for Unicode character support
  - **Property 2: Unicode Character Support**
  - **Validates: Requirements 1.2**
  - Generate strings with various Unicode ranges (emoji, CJK, Arabic)
  - Encode each string and verify no errors thrown
  - Assert result is valid base64 string
  - Configure test to run 100+ iterations
  - _Requirements: 1.2_

- [ ]* 1.3 Write property test for invalid input handling
  - **Property 3: Invalid Input Handling**
  - **Validates: Requirements 1.4**
  - Generate invalid inputs (null, undefined, numbers, objects)
  - Call encoding function and verify no errors thrown
  - Assert returns appropriate fallback value
  - Configure test to run 100+ iterations
  - _Requirements: 1.4_

- [ ]* 1.4 Write unit tests for encoding utility
  - Test empty string edge case returns empty string
  - Test simple ASCII SVG produces valid data URI
  - Test SVG with Unicode characters produces valid data URI
  - Test error fallback returns placeholder SVG
  - _Requirements: 1.3, 1.4_

- [x] 2. Update Profile.tsx to use safe encoding
  - Import `encodeSvgToDataUri` from `utils/encoding`
  - Replace `btoa(avatarSvg)` with `encodeSvgToDataUri(avatarSvg)` in avatarDataUri useMemo (line ~65)
  - Remove try-catch block since error handling is now in the utility
  - Simplify the useMemo to just call the utility function
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 2.1 Write integration test for Profile.tsx avatar encoding
  - Test that Profile component renders without errors when avatar contains Unicode
  - Test that avatarDataUri uses the safe encoding function
  - Test that encoding errors display fallback avatar
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Update AvatarStylePicker.tsx to use safe encoding
  - Import `encodeSvgToDataUri` from `utils/encoding`
  - Replace `btoa(avatar.toString())` with `encodeSvgToDataUri(avatar.toString())` in previewSvg useMemo (line ~100)
  - Keep try-catch for avatar generation errors (separate from encoding errors)
  - Update error handling to use the safe encoding function
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 3.1 Write integration test for AvatarStylePicker encoding
  - Test that preview avatars render without errors when containing Unicode
  - Test that previewSvg uses the safe encoding function
  - Test that encoding errors display fallback preview
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all unit tests and property tests
  - Verify no encoding errors in browser console
  - Test with various DiceBear avatar styles
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check library with 100+ iterations per test
- The encoding utility handles all error cases with graceful fallbacks
- Backward compatibility is maintained - existing avatars continue to work
