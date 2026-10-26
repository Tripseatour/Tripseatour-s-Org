/**
 * Utility to reliably extract and repair JSON from LLM / Gemini responses.
 * Handles common LLM JSON syntax issues such as:
 * - Markdown code blocks (```json ... ```)
 * - Leading/trailing commentary or whitespace
 * - Unescaped quotes inside string values (e.g. "description": "Tour with "VIP" speedboats")
 * - Trailing commas before } or ]
 * - Unescaped newlines or control characters inside strings
 * - Truncated JSON responses (unbalanced braces/brackets)
 */

export function safeParseLlmJson<T = any>(rawText: string, fallbackDefault?: T): T {
  if (!rawText || typeof rawText !== 'string') {
    if (fallbackDefault !== undefined) return fallbackDefault;
    throw new Error('Empty or invalid response received from AI model');
  }

  // 1. Remove markdown fences (```json ... ``` or ``` ... ```)
  let cleaned = rawText
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/m, '')
    .trim();

  // 2. Extract substring between first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 3. First attempt: standard JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch (_e1) {
    // Proceed to repair steps
  }

  // 4. Repair step 1: Strip trailing commas before } or ]
  let repaired = cleaned.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(repaired);
  } catch (_e2) {}

  // 5. Repair step 2: Normalize single-line and unescaped newlines inside strings
  // Replace literal control characters (except tab/newline where permissible)
  repaired = repaired
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    // Fix unescaped newlines between double quotes
    .replace(/(?<=:\s*"[^"]*)\r?\n(?=[^"]*",?)/g, '\\n');

  try {
    return JSON.parse(repaired);
  } catch (_e3) {}

  // 6. Repair step 3: Fix unescaped quotes inside string values
  repaired = repairUnescapedInnerQuotes(repaired);

  try {
    return JSON.parse(repaired);
  } catch (_e4) {}

  // 7. Repair step 4: Balance and close truncated JSON
  repaired = balanceAndCloseJson(repaired);

  try {
    return JSON.parse(repaired);
  } catch (_e5) {}

  // 8. Repair step 5: Regex fallback field extraction for Tour data
  const fallbackObj = regexExtractTourFields(cleaned);
  if (fallbackObj && (fallbackObj.titleTH || fallbackObj.titleEN || fallbackObj.priceAdult)) {
    return fallbackObj as T;
  }

  if (fallbackDefault !== undefined) {
    return fallbackDefault;
  }

  throw new Error('ไม่สามารถแปลงโครงสร้าง JSON จาก AI ได้ กรุณาลองสแกนใหม่อีกครั้ง');
}

/**
 * Escapes unescaped inner double quotes inside JSON string values.
 * e.g. "desc": "Visit "Maya Bay" and beach", -> "desc": "Visit \"Maya Bay\" and beach",
 */
function repairUnescapedInnerQuotes(jsonStr: string): string {
  // Regex looks for "key": "value" pattern where value might contain unescaped quotes
  // We scan char by char for precision
  const len = jsonStr.length;
  let inString = false;
  let isKey = false;
  let result = '';

  for (let i = 0; i < len; i++) {
    const char = jsonStr[i];
    const prevChar = i > 0 ? jsonStr[i - 1] : '';

    if (char === '"' && prevChar !== '\\') {
      if (!inString) {
        // String starts
        inString = true;
        // Check if this is a key (followed by optional spaces and colon)
        let j = i + 1;
        while (j < len && jsonStr[j] !== '"') {
          if (jsonStr[j] === '\\') j++;
          j++;
        }
        let k = j + 1;
        while (k < len && (jsonStr[k] === ' ' || jsonStr[k] === '\t' || jsonStr[k] === '\n')) k++;
        isKey = k < len && jsonStr[k] === ':';
        result += char;
      } else {
        // We are inside a string and encountered a unescaped quote.
        // Is it the real end of the string, or an inner unescaped quote?
        // Look ahead to see what follows:
        let nextNonSpace = '';
        for (let j = i + 1; j < len; j++) {
          const c = jsonStr[j];
          if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') {
            nextNonSpace = c;
            break;
          }
        }

        if (isKey) {
          // Keys end right before ':'
          inString = false;
          result += char;
        } else {
          // Values end before ',', '}', ']', or end of input
          if (nextNonSpace === ',' || nextNonSpace === '}' || nextNonSpace === ']' || nextNonSpace === '') {
            inString = false;
            result += char;
          } else {
            // It's an unescaped inner quote! Escape it
            result += '\\"';
          }
        }
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Closes unclosed quotes, brackets, and braces if JSON was truncated
 */
function balanceAndCloseJson(jsonStr: string): string {
  let str = jsonStr.trim();
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}') {
      if (stack.length && stack[stack.length - 1] === '{') stack.pop();
    } else if (char === ']') {
      if (stack.length && stack[stack.length - 1] === '[') stack.pop();
    }
  }

  if (inString) {
    str += '"';
  }

  // Remove any trailing comma
  str = str.replace(/,\s*$/, '');

  // Close remaining items in stack
  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') str += '}';
    else if (last === '[') str += ']';
  }

  return str;
}

/**
 * Last-resort fallback: extracts known tour fields using regex
 */
function regexExtractTourFields(text: string): any {
  const result: Record<string, any> = {};

  const extractString = (key: string): string | undefined => {
    const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
    }
    return undefined;
  };

  const extractNumber = (key: string): number | undefined => {
    const regex = new RegExp(`"${key}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  };

  const extractArray = (key: string): string[] => {
    const regex = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      const items: string[] = [];
      const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
      let m;
      while ((m = itemRegex.exec(match[1])) !== null) {
        if (m[1]) items.push(m[1].replace(/\\"/g, '"').trim());
      }
      return items;
    }
    return [];
  };

  result.titleTH = extractString('titleTH');
  result.titleEN = extractString('titleEN');
  result.titleZH = extractString('titleZH');
  result.titleRU = extractString('titleRU');

  result.category = extractString('category') || 'island';
  result.location = extractString('location');

  result.durationTH = extractString('durationTH');
  result.durationEN = extractString('durationEN');
  result.durationZH = extractString('durationZH');
  result.durationRU = extractString('durationRU');

  result.priceAdult = extractNumber('priceAdult');
  result.priceChild = extractNumber('priceChild');
  result.originalPriceAdult = extractNumber('originalPriceAdult');
  result.originalPriceChild = extractNumber('originalPriceChild');
  result.costAdult = extractNumber('costAdult');
  result.costChild = extractNumber('costChild');

  result.descTH = extractString('descTH');
  result.descEN = extractString('descEN');
  result.descZH = extractString('descZH');
  result.descRU = extractString('descRU');

  result.supplierName = extractString('supplierName');
  result.notes = extractString('notes');

  const highlights = extractArray('highlightsTH');
  if (highlights.length > 0) result.highlightsTH = highlights;

  const included = extractArray('includedItemsTH');
  if (included.length > 0) result.includedItemsTH = included;

  // Attempt to extract itinerary steps if available
  const itinMatch = text.match(/"itinerarySteps"\s*:\s*(\[[^\]]*\])/is);
  if (itinMatch && itinMatch[1]) {
    try {
      result.itinerarySteps = JSON.parse(itinMatch[1]);
    } catch (_) {}
  }

  return result;
}
