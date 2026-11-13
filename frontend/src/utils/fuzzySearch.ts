// Sri Lanka Districts and Major Cities
export const SRI_LANKA_LOCATIONS = [
  'Entire Sri Lanka (All Country)',
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Ratnapura',
  'Kegalle',
  'Dehiwala-Mount Lavinia',
  'Moratuwa',
  'Negombo',
  'Sri Jayawardenepura Kotte',
];

// Standard Services Catalog for Sri Lanka Marketplace
export const POPULAR_SERVICES = [
  { name: 'House Cleaning & Maid Services', category: 'Cleaning', keywords: ['cleaning', 'cleaner', 'housekeeper', 'maid', 'deep cleaning', 'sanitization', 'sweeping'] },
  { name: 'Plumbing & Pipe Repair', category: 'Plumbing', keywords: ['plumbing', 'plumber', 'pipe', 'leak', 'drain', 'water line', 'tap repair'] },
  { name: 'Electrical & Home Wiring', category: 'Electrical', keywords: ['electrical', 'electrician', 'wiring', 'fuse', 'generator', 'solar', 'switchboard'] },
  { name: 'Masonry & Construction', category: 'Masonry', keywords: ['masonry', 'mason', 'construction', 'bricklaying', 'plastering', 'concrete', 'tile laying'] },
  { name: 'Carpentry & Woodwork', category: 'Carpentry', keywords: ['carpentry', 'carpenter', 'woodwork', 'furniture', 'doors', 'roof woodwork'] },
  { name: 'AC Repair & Refrigeration', category: 'Appliance Repair', keywords: ['ac repair', 'air conditioner', 'fridge', 'refrigerator', 'cooling', 'hvac'] },
  { name: 'Painting & Waterproofing', category: 'Painting', keywords: ['painting', 'painter', 'waterproofing', 'wall paint', 'color wash'] },
  { name: 'Gardening & Landscaping', category: 'Gardening', keywords: ['gardening', 'gardener', 'landscaping', 'grass cutting', 'tree trimming', 'lawn'] },
  { name: 'Vehicle Repair & Mechanics', category: 'Automotive', keywords: ['mechanic', 'vehicle repair', 'car repair', 'bike repair', 'auto', 'engine'] },
  { name: 'Transport & Delivery Services', category: 'Transport', keywords: ['transport', 'delivery', 'driver', 'lorry hire', 'mover', 'packers'] },
  { name: 'Welding & Metal Fabrication', category: 'Welding', keywords: ['welding', 'welder', 'metal work', 'iron gates', 'grills'] },
  { name: 'Catering & Cooking Services', category: 'Catering', keywords: ['catering', 'cook', 'chef', 'food delivery', 'event buffet'] },
  { name: 'Tailoring & Garment Sewing', category: 'Tailoring', keywords: ['tailoring', 'tailor', 'sewing', 'alterations', 'dressmaking'] },
  { name: 'IT & Computer Repair', category: 'IT & Technology', keywords: ['computer repair', 'laptop', 'software', 'networking', 'wifi', 'cctv'] },
  { name: 'Beauty, Salon & Bridal Care', category: 'Beauty', keywords: ['salon', 'haircut', 'makeup', 'bridal', 'beautician', 'massage'] },
  { name: 'Security & Watchmen', category: 'Security', keywords: ['security guard', 'watchman', 'surveillance', 'bodyguard'] },
];

/**
 * Calculates Levenshtein Distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const row = Array.from({ length: s2.length + 1 }, (_, i) => i);

  for (let i = 1; i <= s1.length; i++) {
    let prev = i;
    for (let j = 1; j <= s2.length; j++) {
      let val: number;
      if (s1[i - 1] === s2[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[s2.length] = prev;
  }

  return row[s2.length];
}

/**
 * Computes similarity ratio between 0.0 and 1.0.
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1.0 - dist / maxLen;
}

/**
 * Checks if search input matches target keyword by:
 * 1. Exact match or includes
 * 2. Prefix match (e.g., 'clea' -> 'cleaning')
 * 3. Substring match (e.g., 'leaning' -> 'cleaning')
 * 4. Fuzzy typo match (e.g., 'celaning' -> 'cleaning')
 */
export function matchesFuzzy(input: string, target: string): boolean {
  if (!input || !target) return false;
  const q = input.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (t.includes(q)) return true;
  if (q.includes(t)) return true;

  // Prefix match
  if (t.startsWith(q) || q.startsWith(t)) return true;

  // Words inside target
  const words = t.split(/[\s/&,-]+/);
  for (const w of words) {
    if (w.startsWith(q) || q.startsWith(w)) return true;
    if (w.includes(q) || q.includes(w)) return true;
    // Typo match on word with length >= 4
    if (Math.min(q.length, w.length) >= 3) {
      const sim = stringSimilarity(q, w);
      if (sim >= 0.65) return true;
      const dist = levenshteinDistance(q, w);
      if (dist <= 2) return true;
    }
  }

  // Full string typo check
  if (q.length >= 4 && t.length >= 4) {
    if (stringSimilarity(q, t) >= 0.6) return true;
  }

  return false;
}

/**
 * Suggests standard canonical keywords for common misspelled queries.
 * e.g., 'celaning' -> 'cleaning', 'clea' -> 'cleaning', 'leaning' -> 'cleaning'
 */
export function normalizeServiceQuery(query: string): string {
  if (!query) return '';
  const clean = query.trim().toLowerCase();

  // Known target dictionary
  const dictionary = [
    { target: 'cleaning', triggers: ['celaning', 'clea', 'leaning', 'clen', 'clenning', 'clean'] },
    { target: 'plumbing', triggers: ['plubing', 'plumb', 'plumbin', 'plumber', 'pulmbing'] },
    { target: 'electrical', triggers: ['electrian', 'elect', 'electical', 'electrician', 'electric'] },
    { target: 'carpentry', triggers: ['carpinter', 'carpen', 'carpenter', 'carpanter'] },
    { target: 'masonry', triggers: ['masan', 'masn', 'mason', 'masonary', 'baas'] },
    { target: 'painting', triggers: ['paintr', 'paintin', 'painter', 'paniting'] },
    { target: 'gardening', triggers: ['gardn', 'gardning', 'gardener', 'gradening'] },
    { target: 'mechanic', triggers: ['mechnic', 'machanic', 'mechanic', 'auto mechanic'] },
    { target: 'transport', triggers: ['transpot', 'trnsport', 'driver', 'drver', 'delivery'] },
    { target: 'welding', triggers: ['weldr', 'welden', 'welder', 'wellding'] },
    { target: 'catering', triggers: ['catring', 'caterer', 'cook', 'cooking'] },
    { target: 'ac repair', triggers: ['ac', 'air con', 'refrigerator', 'fridge repair'] },
  ];

  for (const item of dictionary) {
    if (item.target === clean || item.triggers.some((tr) => matchesFuzzy(clean, tr))) {
      return item.target;
    }
  }

  return query;
}

