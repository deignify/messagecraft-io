/**
 * Normalize a phone number by stripping all non-digit characters.
 * Ensures +919999999999 and 9999999999 are treated as the same number.
 */
export function normalizePhone(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  return digits;
}

/**
 * Check if two phone numbers are the same after normalization.
 */
export function isSamePhone(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  // Match if one ends with the other (handles country code differences)
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

/**
 * Format phone to E.164 style if it has enough digits.
 * If it starts with country code, add +. Otherwise keep as-is.
 */
export function formatPhoneE164(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length >= 10) {
    return '+' + digits;
  }
  return digits;
}

/**
 * Find duplicate contacts by normalized phone number.
 * Returns groups of contacts that share the same normalized number.
 */
export function findDuplicates<T extends { phone: string; id: string }>(
  contacts: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const contact of contacts) {
    const normalized = normalizePhone(contact.phone);
    // Try matching with last 10 digits for country-code agnostic matching
    const key = normalized.length >= 10 ? normalized.slice(-10) : normalized;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(contact);
  }

  // Only return groups with actual duplicates
  const duplicates = new Map<string, T[]>();
  for (const [key, group] of groups) {
    if (group.length > 1) {
      duplicates.set(key, group);
    }
  }

  return duplicates;
}
