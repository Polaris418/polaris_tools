# Requirements Document

## Introduction

This specification addresses a critical bug in the user profile page where SVG avatar encoding fails due to UTF-8 character incompatibility with the `btoa()` function. The current implementation uses `btoa()` which only supports Latin1 characters, causing runtime errors when DiceBear SVG avatars contain UTF-8 characters. This fix will implement a UTF-8 safe base64 encoding solution.

## Glossary

- **Avatar_Encoder**: The utility function that converts SVG strings to base64-encoded data URIs
- **Profile_Page**: The user profile page component that displays user avatars
- **Avatar_Style_Picker**: The component that allows users to preview and select avatar styles
- **Data_URI**: A URI scheme that allows embedding data inline using base64 encoding (format: `data:image/svg+xml;base64,{encoded_data}`)
- **UTF-8**: Unicode character encoding that supports all Unicode characters
- **Latin1**: Character encoding limited to the first 256 Unicode characters

## Requirements

### Requirement 1: UTF-8 Safe Base64 Encoding

**User Story:** As a developer, I want a UTF-8 safe base64 encoding function, so that SVG avatars with Unicode characters can be properly encoded without runtime errors.

#### Acceptance Criteria

1. THE Avatar_Encoder SHALL convert UTF-8 strings to base64-encoded strings
2. WHEN the Avatar_Encoder receives a string containing Unicode characters, THE Avatar_Encoder SHALL encode it without throwing errors
3. WHEN the Avatar_Encoder receives an empty string, THE Avatar_Encoder SHALL return an empty string
4. WHEN the Avatar_Encoder receives invalid input, THE Avatar_Encoder SHALL handle the error gracefully and return a fallback value

### Requirement 2: Profile Page Avatar Display

**User Story:** As a user, I want my avatar to display correctly on the profile page, so that I can see my selected avatar style without errors.

#### Acceptance Criteria

1. WHEN the Profile_Page renders an avatar, THE Profile_Page SHALL use the Avatar_Encoder to create the data URI
2. WHEN an avatar contains UTF-8 characters, THE Profile_Page SHALL display the avatar without errors
3. WHEN the Profile_Page encounters an encoding error, THE Profile_Page SHALL display a fallback avatar or error state

### Requirement 3: Avatar Style Picker Preview

**User Story:** As a user, I want to preview different avatar styles, so that I can choose the style I prefer.

#### Acceptance Criteria

1. WHEN the Avatar_Style_Picker renders preview avatars, THE Avatar_Style_Picker SHALL use the Avatar_Encoder to create data URIs
2. WHEN preview avatars contain UTF-8 characters, THE Avatar_Style_Picker SHALL display all previews without errors
3. WHEN the Avatar_Style_Picker encounters an encoding error, THE Avatar_Style_Picker SHALL display a fallback preview or error indicator

### Requirement 4: Backward Compatibility

**User Story:** As a developer, I want the encoding fix to maintain backward compatibility, so that existing avatars continue to display correctly.

#### Acceptance Criteria

1. WHEN the Avatar_Encoder processes Latin1-only strings, THE Avatar_Encoder SHALL produce valid base64 output
2. WHEN existing avatar data URIs are rendered, THE system SHALL display them correctly
3. THE Avatar_Encoder SHALL produce output compatible with all modern browsers

### Requirement 5: Round-Trip Encoding Integrity

**User Story:** As a developer, I want to ensure encoding integrity, so that SVG data is not corrupted during the encoding process.

#### Acceptance Criteria

1. WHEN an SVG string is encoded then decoded, THE system SHALL produce an equivalent SVG string
2. THE Avatar_Encoder SHALL preserve all SVG structure and attributes during encoding
3. WHEN the encoded data URI is used in an img src attribute, THE browser SHALL render the SVG correctly
