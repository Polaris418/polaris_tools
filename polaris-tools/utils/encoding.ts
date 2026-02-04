/**
 * UTF-8 Safe Base64 Encoding Utilities
 * 
 * This module provides UTF-8 safe base64 encoding functions to handle
 * Unicode characters that are incompatible with the native btoa() function.
 */

/**
 * Safely encodes a UTF-8 string to base64.
 * 
 * This function handles Unicode characters by first converting the UTF-8 string
 * to a byte array using TextEncoder, then converting those bytes to a binary string
 * that is compatible with btoa().
 * 
 * @param str - The UTF-8 string to encode
 * @returns Base64-encoded string
 * @throws Error if encoding fails
 * 
 * @example
 * ```typescript
 * const encoded = utf8ToBase64("Hello 世界");
 * // Returns: "SGVsbG8g5LiW55WM"
 * ```
 */
export function utf8ToBase64(str: string): string {
  // Handle empty string edge case
  if (str === '') {
    return '';
  }

  // Convert UTF-8 string to byte array
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  // Convert byte array to binary string (Latin1 compatible)
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }

  // Encode binary string to base64
  return btoa(binaryString);
}

/**
 * Encodes an SVG string to a data URI with proper error handling.
 * 
 * This function converts SVG markup to a base64-encoded data URI that can be
 * used directly in HTML img src attributes. It handles encoding errors gracefully
 * by returning a fallback placeholder SVG.
 * 
 * @param svg - The SVG string to encode
 * @returns Data URI string in format "data:image/svg+xml;base64,{base64_data}"
 *          or empty string if input is empty, or fallback placeholder on error
 * 
 * @example
 * ```typescript
 * const dataUri = encodeSvgToDataUri('<svg>...</svg>');
 * // Returns: "data:image/svg+xml;base64,PHN2Zz4uLi48L3N2Zz4="
 * ```
 */
export function encodeSvgToDataUri(svg: string): string {
  // Handle empty or invalid input
  if (!svg || typeof svg !== 'string') {
    return '';
  }

  try {
    const base64 = utf8ToBase64(svg);
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    // Log error with context for debugging
    console.error('SVG encoding error:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      inputLength: svg?.length,
      inputType: typeof svg,
      timestamp: new Date().toISOString(),
    });

    // Return fallback placeholder SVG (128x128 gray box with "?" icon)
    // This is a pre-encoded SVG to avoid recursive encoding errors
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM2NDc0OGIiIGZvbnQtc2l6ZT0iNDgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj4/PC90ZXh0Pjwvc3ZnPg==';
  }
}
