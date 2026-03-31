
/**
 * normalizeString
 * Cleans a string for consistent comparison.
 */
export const normalizeString = (s: string): string => {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
};

/**
 * matchTermInText
 * Internal helper to check if a single query term matches a piece of text.
 */
const matchTermInText = (term: string, text: string): boolean => {
  const lowerText = text.toLowerCase();
  const isNumeric = /^\d+$/.test(term);
  
  // 1. Tokenization for Strong Matching
  const normalizedText = lowerText.replace(/([a-z])([0-9])/g, '$1 $2').replace(/([0-9])([a-z])/g, '$1 $2');
  const tokens = normalizedText.split(/[^a-z0-9]/).filter(Boolean);
  const unnormalizedTokens = lowerText.split(/[^a-z0-9]/).filter(Boolean);
  const exactTokens = lowerText.split(/\s+/).filter(Boolean);
  
  // Strong match: Prefix of any token
  const isStrong = tokens.some(t => t.startsWith(term)) || 
                   unnormalizedTokens.some(t => t.startsWith(term)) ||
                   exactTokens.some(t => t.startsWith(term));
  
  if (isStrong) return true;
  
  // 2. Loose 'includes' match (Weak Match)
  if (isNumeric) {
    if (term.length >= 3 && lowerText.includes(term)) return true;
  } else {
    if (term.length >= 2 && lowerText.includes(term)) return true;
  }
  
  return false;
};

/**
 * parseSearchQuery
 * Extracts quoted phrases and regular terms from a query string.
 */
const parseSearchQuery = (query: string) => {
  const quotedRegex = /"([^"]+)"/g;
  const quotedPhrases: string[] = [];
  let match;
  const lowerQuery = query.toLowerCase();
  
  while ((match = quotedRegex.exec(lowerQuery)) !== null) {
    quotedPhrases.push(match[1].trim());
  }
  
  const remainingQuery = lowerQuery.replace(quotedRegex, ' ').trim();
  const regularTerms = remainingQuery.split(/\s+/).filter(Boolean);
  
  return { quotedPhrases, regularTerms };
};

/**
 * matchesSearchTerms
 * Checks if a string contains all terms (quoted and regular) from a search query.
 */
export const matchesSearchTerms = (text: string | null | undefined, query: string): boolean => {
  if (!query) return true;
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  const { quotedPhrases, regularTerms } = parseSearchQuery(query);
  
  // All quoted phrases must be found as complete phrases/tokens
  const allQuotedMatch = quotedPhrases.every(phrase => {
    // Exact match of the field
    if (lowerText === phrase) return true;
    
    // Check if phrase exists as a distinct part of the text
    // We use word boundaries or non-alphanumeric check
    const index = lowerText.indexOf(phrase);
    if (index === -1) return false;
    
    // Verify boundaries to ensure "otc 1" doesn't match "otc 10"
    const charBefore = index > 0 ? lowerText[index - 1] : null;
    const charAfter = index + phrase.length < lowerText.length ? lowerText[index + phrase.length] : null;
    
    const isStartOk = !charBefore || /[^a-z0-9]/.test(charBefore);
    const isEndOk = !charAfter || /[^a-z0-9]/.test(charAfter);
    
    return isStartOk && isEndOk;
  });
  
  if (!allQuotedMatch) return false;
  
  // All regular terms must match using standard logic
  return regularTerms.every(term => matchTermInText(term, text));
};

/**
 * matchesAnySearchField
 * Checks if all terms from the query are satisfied across the provided fields.
 */
export const matchesAnySearchField = (fields: (string | undefined | null)[], query: string): boolean => {
  if (!query) return true;
  const { quotedPhrases, regularTerms } = parseSearchQuery(query);
  
  // Each quoted phrase must be found exactly in AT LEAST ONE field as a whole phrase
  const allQuotedSatisfied = quotedPhrases.every(phrase => {
    return fields.some(field => {
      if (!field) return false;
      const lowerField = field.toLowerCase();
      if (lowerField === phrase) return true;
      
      const index = lowerField.indexOf(phrase);
      if (index === -1) return false;
      
      const charBefore = index > 0 ? lowerField[index - 1] : null;
      const charAfter = index + phrase.length < lowerField.length ? lowerField[index + phrase.length] : null;
      
      const isStartOk = !charBefore || /[^a-z0-9]/.test(charBefore);
      const isEndOk = !charAfter || /[^a-z0-9]/.test(charAfter);
      
      return isStartOk && isEndOk;
    });
  });
  
  if (!allQuotedSatisfied) return false;
  
  // Each regular term must be found in AT LEAST ONE field
  return regularTerms.every(term => {
    return fields.some(field => field && matchTermInText(term, field));
  });
};

/**
 * diceCoefficient
 * Calculates the similarity between two strings using bigram overlap.
 * Returns a value between 0 and 1.
 */
export const diceCoefficient = (s1: string, s2: string): number => {
  const clean1 = normalizeString(s1);
  const clean2 = normalizeString(s2);
  
  if (clean1 === clean2) return 1;
  if (clean1.length < 2 || clean2.length < 2) return 0;

  const getBigrams = (s: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(clean1);
  const b2 = getBigrams(clean2);
  let intersect = 0;
  
  for (const b of b1) {
    if (b2.has(b)) intersect++;
  }
  
  return (2 * intersect) / (b1.size + b2.size);
};

/**
 * toTitleCase
 * Converts a string to Title Case (e.g., "shelf a" -> "Shelf A").
 */
export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

/**
 * formatFileSize
 * Formats a file size in bytes to a human-readable string (KB, MB, GB).
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
