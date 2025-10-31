/**
 * Utility function to normalize image URLs
 * Handles:
 * - Base64 data URLs (data:image/...)
 * - External URLs (http/https)
 * - Relative paths (/uploads/...)
 */
export function normalizeImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl || !imageUrl.trim()) {
    return ''
  }

  const url = imageUrl.trim()

  // Base64 data URL - return as-is
  if (url.startsWith('data:')) {
    return url
  }

  // External URL - return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // Relative path - prepend base URL
  const baseUrl = 'https://khawam-pro-production.up.railway.app'
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`
  }

  // Bare filename or path - add leading slash and prepend base URL
  return `${baseUrl}/${url}`
}

