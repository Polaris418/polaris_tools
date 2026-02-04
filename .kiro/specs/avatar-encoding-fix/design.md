# Design Document: Avatar Encoding Fix

## Overview

This design addresses a critical bug where SVG avatar encoding fails due to UTF-8 character incompatibility with JavaScript's `btoa()` function. The current implementation in `Profile.tsx` (line ~65) and `AvatarStylePicker.tsx` (line ~100) uses `btoa()` which only supports Latin1 characters (0-255), causing `InvalidCharacterError` when DiceBear SVG avatars contain UTF-8 characters.

The solution implements a UTF-8 safe base64 encoding utility that properly handles Unicode characters by first converting the UTF-8 string to a byte sequence, then encoding those bytes to base64. This approach is compatible with all modern browsers and maintains backward compatibility with existing avatar displays.

## Architecture

### Current Implementation (Problematic)

```typescript
// Profile.tsx - Line ~65
const avatarDataUri = useMemo(() => {
  try {
    if (!avatarSvg) return '';
    return `data:image/svg+xml;base64,${btoa(avatarSvg)}`; // ❌ Fails with UTF-8
  } catch (error) {
    console.error('Avatar Data URI conversion error:', error);
    return 'data:image/svg+xml;base64,...'; // Fallback
  }
}, [avatarSvg]);

// AvatarStylePicker.tsx - Line ~100
const previewSvg = useMemo(() => {
  try {
    const avatar = createAvatar(style.style, { seed: username, size: 80 });
    return `data:image/svg+xml;base64,${btoa(avatar.toString())}`; // ❌ Fails with UTF-8
  } catch (error) {
    console.error(`Avatar preview generation error for ${style.id}:`, error);
    return '';
  }
}, [style.id, username]);
```

### Proposed Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Layer                           │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │  Profile.tsx     │         │ AvatarStylePicker    │     │
│  │  - avatarDataUri │         │ - previewSvg         │     │
│  └────────┬─────────┘         └──────────┬───────────┘     │
│           │                               │                  │
│           └───────────┬───────────────────┘                  │
│                       │                                      │
│                       ▼                                      │
│           ┌───────────────────────┐                         │
│           │  Utility Layer        │                         │
│           │  encodeSvgToDataUri() │                         │
│           └───────────┬───────────┘                         │
│                       │                                      │
│                       ▼                                      │
│           ┌───────────────────────┐                         │
│           │  Core Encoding        │                         │
│           │  utf8ToBase64()       │                         │
│           └───────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Core Encoding Function: `utf8ToBase64()`

**Location**: `polaris-tools/utils/encoding.ts`

**Purpose**: Convert UTF-8 strings to base64 using a browser-compatible approach

**Implementation Strategy**:
- Use `TextEncoder` to convert UTF-8 string to Uint8Array
- Convert byte array to binary string
- Use `btoa()` on the binary string (safe since it's now Latin1)
- Handle edge cases (empty strings, invalid input)

**Interface**:
```typescript
/**
 * Safely encodes a UTF-8 string to base64
 * @param str - The UTF-8 string to encode
 * @returns Base64-encoded string
 * @throws Error if encoding fails
 */
function utf8ToBase64(str: string): string
```

**Algorithm**:
```
Input: UTF-8 string (e.g., "Hello 世界")
  ↓
Step 1: TextEncoder.encode(str)
  → Uint8Array [72, 101, 108, 108, 111, 32, 228, 184, 150, 231, 149, 140]
  ↓
Step 2: Convert bytes to binary string
  → String.fromCharCode(...bytes)
  → Binary string (Latin1 compatible)
  ↓
Step 3: btoa(binaryString)
  → Base64 string
  ↓
Output: "SGVsbG8g5LiW55WM"
```

### 2. High-Level Utility: `encodeSvgToDataUri()`

**Location**: `polaris-tools/utils/encoding.ts`

**Purpose**: Convert SVG strings to data URIs with proper error handling

**Interface**:
```typescript
/**
 * Encodes an SVG string to a data URI
 * @param svg - The SVG string to encode
 * @returns Data URI string or fallback placeholder
 */
function encodeSvgToDataUri(svg: string): string
```

**Implementation**:
```typescript
function encodeSvgToDataUri(svg: string): string {
  if (!svg) return '';
  
  try {
    const base64 = utf8ToBase64(svg);
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('SVG encoding error:', error);
    // Return fallback placeholder SVG
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM2NDc0OGIiIGZvbnQtc2l6ZT0iNDgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj4/PC90ZXh0Pjwvc3ZnPg==';
  }
}
```

### 3. Component Updates

**Profile.tsx** - Update `avatarDataUri` computation:
```typescript
// Before (Line ~65)
const avatarDataUri = useMemo(() => {
  try {
    if (!avatarSvg) return '';
    return `data:image/svg+xml;base64,${btoa(avatarSvg)}`;
  } catch (error) {
    // ... error handling
  }
}, [avatarSvg]);

// After
const avatarDataUri = useMemo(() => {
  return encodeSvgToDataUri(avatarSvg);
}, [avatarSvg]);
```

**AvatarStylePicker.tsx** - Update `previewSvg` computation:
```typescript
// Before (Line ~100)
const previewSvg = useMemo(() => {
  try {
    const avatar = createAvatar(style.style, { seed: username, size: 80 });
    return `data:image/svg+xml;base64,${btoa(avatar.toString())}`;
  } catch (error) {
    console.error(`Avatar preview generation error for ${style.id}:`, error);
    return '';
  }
}, [style.id, username]);

// After
const previewSvg = useMemo(() => {
  try {
    const avatar = createAvatar(style.style, { seed: username, size: 80 });
    return encodeSvgToDataUri(avatar.toString());
  } catch (error) {
    console.error(`Avatar preview generation error for ${style.id}:`, error);
    return '';
  }
}, [style.id, username]);
```

## Data Models

### Input Data
- **SVG String**: UTF-8 encoded string containing SVG markup
  - May contain Unicode characters (emoji, special symbols, non-Latin scripts)
  - Generated by DiceBear library
  - Example: `<svg xmlns="http://www.w3.org/2000/svg">...</svg>`

### Intermediate Data
- **Byte Array**: Uint8Array representation of UTF-8 string
  - Each element is a byte (0-255)
  - Represents the UTF-8 encoding of the input string

### Output Data
- **Data URI**: String in format `data:image/svg+xml;base64,{base64_data}`
  - Used directly in HTML `src` attributes
  - Compatible with all modern browsers
  - Example: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Round-Trip Encoding Integrity

*For any* valid UTF-8 string (including SVG markup), encoding to base64 then decoding back to UTF-8 should produce an equivalent string to the original.

**Validates: Requirements 1.1, 4.1, 5.1, 5.2**

**Rationale**: This is a classic round-trip property that validates the core correctness of the encoding function. If we can encode any UTF-8 string and decode it back to get the same string, we know the encoding preserves all information including Unicode characters, SVG structure, and attributes. This property subsumes several individual requirements:
- UTF-8 to base64 conversion correctness (1.1)
- Latin1 backward compatibility (4.1) - since Latin1 is a subset of UTF-8
- SVG structure preservation (5.2) - if round-trip succeeds, structure is preserved
- Encoding integrity (5.1)

### Property 2: Unicode Character Support

*For any* string containing Unicode characters (emoji, non-Latin scripts, special symbols), the encoding function should complete without throwing errors and produce a valid base64 string.

**Validates: Requirements 1.2**

**Rationale**: This property specifically tests that the encoder handles the full Unicode character set without errors. While the round-trip property validates correctness, this property ensures robustness across diverse character sets including emoji (🎨, 😀), Chinese (世界), Arabic (مرحبا), and other Unicode ranges.

### Property 3: Invalid Input Handling

*For any* invalid input (null, undefined, non-string types), the encoding function should handle the error gracefully without crashing and return an appropriate fallback value.

**Validates: Requirements 1.4**

**Rationale**: This property ensures the encoder is defensive and handles edge cases gracefully. Real-world applications may pass unexpected values, and the function should degrade gracefully rather than crash the application.

### Edge Cases

The following edge cases will be handled by the property test generators and explicit unit tests:

- **Empty String** (1.3): When encoding an empty string, the function should return an empty string
- **Very Long Strings**: Strings exceeding typical SVG sizes should encode correctly
- **Special SVG Characters**: SVG-specific characters like `<`, `>`, `"`, `'` should be preserved
- **Whitespace**: Leading/trailing whitespace and internal whitespace should be preserved

## Error Handling

### Error Categories

1. **Encoding Errors**
   - **Cause**: Unexpected failure in TextEncoder or btoa()
   - **Handling**: Catch exception, log error with context, return fallback placeholder
   - **User Impact**: User sees placeholder avatar instead of crash

2. **Invalid Input Errors**
   - **Cause**: null, undefined, or non-string input
   - **Handling**: Return empty string or fallback based on context
   - **User Impact**: Graceful degradation, no visible error

3. **Browser Compatibility Errors**
   - **Cause**: TextEncoder not available (very old browsers)
   - **Handling**: Feature detection, fallback to alternative encoding
   - **User Impact**: Avatars still work in older browsers

### Error Logging

All errors should be logged with sufficient context for debugging:

```typescript
console.error('SVG encoding error:', {
  errorMessage: error.message,
  inputLength: svg?.length,
  inputType: typeof svg,
  timestamp: new Date().toISOString(),
  stack: error.stack,
});
```

### Fallback Strategy

When encoding fails, return a base64-encoded placeholder SVG:
- Gray background (#e2e8f0)
- Question mark icon in center
- Dimensions: 128x128
- Pre-encoded to avoid recursive encoding errors

## Testing Strategy

This feature will use a dual testing approach combining unit tests and property-based tests to ensure comprehensive coverage.

### Property-Based Testing

Property-based tests will validate universal correctness properties across many generated inputs. We will use **fast-check** (for TypeScript/JavaScript) as the property-based testing library.

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with format: **Feature: avatar-encoding-fix, Property {N}: {property_text}**

**Property Tests**:

1. **Property 1: Round-Trip Encoding Integrity**
   - Generate random UTF-8 strings (including Unicode)
   - Encode to base64, then decode back
   - Assert: decoded string equals original string
   - Tag: `Feature: avatar-encoding-fix, Property 1: Round-trip encoding integrity`

2. **Property 2: Unicode Character Support**
   - Generate strings with various Unicode ranges (emoji, CJK, Arabic, etc.)
   - Encode each string
   - Assert: No errors thrown, result is valid base64 string
   - Tag: `Feature: avatar-encoding-fix, Property 2: Unicode character support`

3. **Property 3: Invalid Input Handling**
   - Generate invalid inputs (null, undefined, numbers, objects)
   - Call encoding function
   - Assert: No errors thrown, returns fallback value
   - Tag: `Feature: avatar-encoding-fix, Property 3: Invalid input handling`

### Unit Testing

Unit tests will validate specific examples, edge cases, and integration points.

**Test Cases**:

1. **Empty String Edge Case**
   - Input: `""`
   - Expected: `""`
   - Validates: Requirement 1.3

2. **Simple ASCII SVG**
   - Input: `<svg><rect/></svg>`
   - Expected: Valid data URI
   - Validates: Basic functionality

3. **SVG with Unicode Characters**
   - Input: SVG containing emoji or special characters
   - Expected: Valid data URI, no errors
   - Validates: Requirement 1.2

4. **Component Integration**
   - Test Profile.tsx uses encodeSvgToDataUri
   - Test AvatarStylePicker.tsx uses encodeSvgToDataUri
   - Validates: Requirements 2.1, 3.1

5. **Error Fallback**
   - Mock encoding failure
   - Verify fallback placeholder is returned
   - Validates: Requirement 1.4

### Test File Structure

```
polaris-tools/utils/
  ├── encoding.ts              # Implementation
  ├── encoding.test.ts         # Unit tests
  └── encoding.property.test.ts # Property-based tests

polaris-tools/pages/
  └── Profile.test.tsx         # Integration tests

polaris-tools/components/
  └── AvatarStylePicker.test.tsx # Integration tests
```

### Testing Balance

- **Property tests** handle comprehensive input coverage (100+ random inputs per property)
- **Unit tests** focus on specific examples, edge cases, and integration points
- Together they provide confidence in both general correctness and specific behaviors
