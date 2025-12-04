/**
 * Utility functions for handling Arabic and English numerals
 */

// Mapping of Arabic-Indic digits (٠-٩) to English digits (0-9)
const ARABIC_TO_ENGLISH: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
}

// Mapping of English digits (0-9) to Arabic-Indic digits (٠-٩)
const ENGLISH_TO_ARABIC: Record<string, string> = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
}

/**
 * Convert Arabic-Indic numerals to English numerals
 * @param text - Text containing Arabic or English numerals
 * @returns Text with English numerals
 */
export const arabicToEnglish = (text: string): string => {
  if (!text) return text
  return text.split('').map(char => ARABIC_TO_ENGLISH[char] || char).join('')
}

/**
 * Convert English numerals to Arabic-Indic numerals
 * @param text - Text containing English numerals
 * @returns Text with Arabic-Indic numerals
 */
export const englishToArabic = (text: string): string => {
  if (!text) return text
  return text.split('').map(char => ENGLISH_TO_ARABIC[char] || char).join('')
}

/**
 * Check if a character is an Arabic-Indic digit
 */
export const isArabicDigit = (char: string): boolean => {
  return char in ARABIC_TO_ENGLISH
}

/**
 * Check if a character is an English digit
 */
export const isEnglishDigit = (char: string): boolean => {
  return /[0-9]/.test(char)
}

/**
 * Check if a character is any digit (Arabic or English)
 */
export const isDigit = (char: string): boolean => {
  return isArabicDigit(char) || isEnglishDigit(char)
}

/**
 * Normalize a number string to English digits
 * This is useful for input fields that need to work with both Arabic and English digits
 */
export const normalizeNumber = (value: string): string => {
  return arabicToEnglish(value)
}

