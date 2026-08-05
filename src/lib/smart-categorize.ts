// Built-in merchant → category knowledge base. Matched by substring against
// the transaction's cleaned merchant name (case-insensitive). Ordered doesn't
// matter for correctness — longest pattern wins on overlap — but patterns are
// grouped by category for readability.
//
// This is the "smart" tier of categorization: lowest precedence. A user rule
// or a manual tag always wins over a smart guess. See categorySource in
// lib/auto-tag.ts for the override chain.
const MERCHANT_CATEGORY_MAP: Record<string, string> = {
  // Travel — airlines, hotels, booking platforms
  'united airlines': 'Travel',
  'delta air': 'Travel',
  'american airlines': 'Travel',
  'southwest air': 'Travel',
  jetblue: 'Travel',
  'alaska airlines': 'Travel',
  'spirit airlines': 'Travel',
  'frontier airlines': 'Travel',
  'air canada': 'Travel',
  marriott: 'Travel',
  hilton: 'Travel',
  hyatt: 'Travel',
  'holiday inn': 'Travel',
  'best western': 'Travel',
  airbnb: 'Travel',
  vrbo: 'Travel',
  expedia: 'Travel',
  'booking.com': 'Travel',
  'hotels.com': 'Travel',
  kayak: 'Travel',
  amtrak: 'Travel',
  hertz: 'Travel',
  avis: 'Travel',
  'enterprise rent': 'Travel',
  'national car rental': 'Travel',
  'budget rent': 'Travel',
  tsa: 'Travel',

  // Groceries — supermarkets, warehouse clubs
  'whole foods': 'Groceries',
  "trader joe's": 'Groceries',
  safeway: 'Groceries',
  kroger: 'Groceries',
  publix: 'Groceries',
  wegmans: 'Groceries',
  aldi: 'Groceries',
  costco: 'Groceries',
  sprouts: 'Groceries',
  'harris teeter': 'Groceries',
  'stop & shop': 'Groceries',
  'food lion': 'Groceries',
  'h-e-b': 'Groceries',
  heb: 'Groceries',
  meijer: 'Groceries',
  vons: 'Groceries',
  ralphs: 'Groceries',
  albertsons: 'Groceries',
  "giant food": 'Groceries',
  instacart: 'Groceries',

  // Dining — restaurants, fast food, delivery
  starbucks: 'Dining',
  "mcdonald's": 'Dining',
  mcdonalds: 'Dining',
  chipotle: 'Dining',
  subway: 'Dining',
  'chick-fil-a': 'Dining',
  panera: 'Dining',
  'dunkin': 'Dining',
  'taco bell': 'Dining',
  "wendy's": 'Dining',
  'burger king': 'Dining',
  kfc: 'Dining',
  "domino's": 'Dining',
  'pizza hut': 'Dining',
  doordash: 'Dining',
  grubhub: 'Dining',
  'uber eats': 'Dining',
  postmates: 'Dining',
  'olive garden': 'Dining',
  'cheesecake factory': 'Dining',
  "applebee's": 'Dining',
  "panda express": 'Dining',
  "shake shack": 'Dining',
  'five guys': 'Dining',
  "in-n-out": 'Dining',
  sweetgreen: 'Dining',

  // Transport — rideshare, fuel, transit, parking
  uber: 'Transport',
  lyft: 'Transport',
  shell: 'Transport',
  chevron: 'Transport',
  exxon: 'Transport',
  mobil: 'Transport',
  'bp gas': 'Transport',
  citgo: 'Transport',
  speedway: 'Transport',
  arco: 'Transport',
  valero: 'Transport',
  parking: 'Transport',
  'metro transit': 'Transport',
  'mta': 'Transport',
  bart: 'Transport',
  caltrain: 'Transport',
  clipper: 'Transport',
  'toll': 'Transport',
  ezpass: 'Transport',
  'e-zpass': 'Transport',

  // Shopping — general retail, e-commerce
  'amazon.com': 'Shopping',
  amazon: 'Shopping',
  walmart: 'Shopping',
  target: 'Shopping',
  'best buy': 'Shopping',
  ikea: 'Shopping',
  'home depot': 'Shopping',
  "lowe's": 'Shopping',
  "macy's": 'Shopping',
  nordstrom: 'Shopping',
  'tj maxx': 'Shopping',
  marshalls: 'Shopping',
  ross: 'Shopping',
  gap: 'Shopping',
  'old navy': 'Shopping',
  zara: 'Shopping',
  'h&m': 'Shopping',
  etsy: 'Shopping',
  ebay: 'Shopping',
  'apple store': 'Shopping',
  nike: 'Shopping',
  adidas: 'Shopping',
  wayfair: 'Shopping',
  sephora: 'Shopping',
  ulta: 'Shopping',

  // Utilities — power, water, internet, phone
  'pg&e': 'Utilities',
  'con edison': 'Utilities',
  'duke energy': 'Utilities',
  comcast: 'Utilities',
  xfinity: 'Utilities',
  'at&t': 'Utilities',
  verizon: 'Utilities',
  't-mobile': 'Utilities',
  spectrum: 'Utilities',
  'water dept': 'Utilities',
  'water utility': 'Utilities',
  'electric company': 'Utilities',

  // Subscription — streaming, software, digital services
  netflix: 'Subscription',
  hulu: 'Subscription',
  'disney+': 'Subscription',
  'disney plus': 'Subscription',
  'hbo max': 'Subscription',
  spotify: 'Subscription',
  'apple music': 'Subscription',
  'apple tv': 'Subscription',
  'apple.com/bill': 'Subscription',
  'amazon prime': 'Subscription',
  'youtube premium': 'Subscription',
  'nytimes': 'Subscription',
  'new york times': 'Subscription',
  adobe: 'Subscription',
  icloud: 'Subscription',
  dropbox: 'Subscription',
  'microsoft 365': 'Subscription',
  'xbox game pass': 'Subscription',
  'playstation plus': 'Subscription',
  openai: 'Subscription',
  chatgpt: 'Subscription',
  anthropic: 'Subscription',

  // Entertainment — movies, live events, games
  'amc theatres': 'Entertainment',
  'regal cinemas': 'Entertainment',
  cinemark: 'Entertainment',
  steam: 'Entertainment',
  playstation: 'Entertainment',
  'xbox': 'Entertainment',
  nintendo: 'Entertainment',
  ticketmaster: 'Entertainment',
  stubhub: 'Entertainment',
  'eventbrite': 'Entertainment',

  // Healthcare — pharmacies, insurers, providers
  'cvs pharmacy': 'Healthcare',
  cvs: 'Healthcare',
  walgreens: 'Healthcare',
  'rite aid': 'Healthcare',
  'kaiser permanente': 'Healthcare',
  'blue cross': 'Healthcare',
  'urgent care': 'Healthcare',
  labcorp: 'Healthcare',
  'quest diagnostics': 'Healthcare',

  // Fitness
  'planet fitness': 'Fitness',
  equinox: 'Fitness',
  'la fitness': 'Fitness',
  peloton: 'Fitness',
  orangetheory: 'Fitness',
  crossfit: 'Fitness',
  '24 hour fitness': 'Fitness',
  "gold's gym": 'Fitness',

  // Education
  coursera: 'Education',
  udemy: 'Education',
  'student loan': 'Education',
  tuition: 'Education',

  // Bills — insurance, rent/mortgage
  geico: 'Bills',
  'state farm': 'Bills',
  progressive: 'Bills',
  allstate: 'Bills',
  mortgage: 'Bills',

  // Transfer — P2P payments
  venmo: 'Transfer',
  zelle: 'Transfer',
  'cash app': 'Transfer',
  'wire transfer': 'Transfer',
  paypal: 'Transfer',
};

// Longest-pattern-first so specific matches ("apple store") beat generic ones.
const SORTED_PATTERNS = Object.keys(MERCHANT_CATEGORY_MAP).sort(
  (a, b) => b.length - a.length
);

// Broad, generic keyword fallback for merchants the brand dictionary above
// doesn't recognize — mostly small/independent businesses (e.g. "Sushi Chef")
// that will never appear in a curated chain list. Matched as whole words
// (not substrings) so e.g. "bar" doesn't false-positive inside "Barclays".
const GENERIC_KEYWORD_MAP: Record<string, string> = {
  // Dining
  sushi: 'Dining',
  restaurant: 'Dining',
  bistro: 'Dining',
  grill: 'Dining',
  grille: 'Dining',
  kitchen: 'Dining',
  eatery: 'Dining',
  diner: 'Dining',
  cafe: 'Dining',
  café: 'Dining',
  coffee: 'Dining',
  bar: 'Dining',
  pub: 'Dining',
  tavern: 'Dining',
  pizzeria: 'Dining',
  pizza: 'Dining',
  bbq: 'Dining',
  taqueria: 'Dining',
  taco: 'Dining',
  noodle: 'Dining',
  noodles: 'Dining',
  ramen: 'Dining',
  deli: 'Dining',
  bakery: 'Dining',
  brewery: 'Dining',
  food: 'Dining',

  // Groceries
  grocery: 'Groceries',
  groceries: 'Groceries',
  market: 'Groceries',
  supermarket: 'Groceries',

  // Fitness
  gym: 'Fitness',
  fitness: 'Fitness',
  yoga: 'Fitness',
  pilates: 'Fitness',
  crossfit: 'Fitness',

  // Healthcare
  pharmacy: 'Healthcare',
  clinic: 'Healthcare',
  dental: 'Healthcare',
  dentist: 'Healthcare',
  doctor: 'Healthcare',
  hospital: 'Healthcare',
  medical: 'Healthcare',

  // Travel
  hotel: 'Travel',
  motel: 'Travel',
  resort: 'Travel',
  airline: 'Travel',
  airlines: 'Travel',
  airport: 'Travel',
  airways: 'Travel',

  // Transport
  parking: 'Transport',
  garage: 'Transport',
  transit: 'Transport',
  taxi: 'Transport',

  // Shopping
  salon: 'Shopping',
  boutique: 'Shopping',
};

const SORTED_GENERIC_KEYWORDS = Object.keys(GENERIC_KEYWORD_MAP).sort(
  (a, b) => b.length - a.length
);

function guessCategoryNameGeneric(merchant: string): string | null {
  const words = merchant.toLowerCase().match(/[a-z0-9]+/g) || [];
  const wordSet = new Set(words);
  for (const keyword of SORTED_GENERIC_KEYWORDS) {
    if (wordSet.has(keyword)) return GENERIC_KEYWORD_MAP[keyword];
  }
  return null;
}

// Guess a category name for a merchant string using the built-in knowledge
// base, falling back to generic keyword matching for merchants too small/
// independent to appear in a curated chain list. Returns null when nothing
// matches — callers should leave the transaction untagged rather than force
// a guess.
export function guessCategoryName(merchant: string): string | null {
  const lower = merchant.toLowerCase();
  for (const pattern of SORTED_PATTERNS) {
    if (lower.includes(pattern)) {
      return MERCHANT_CATEGORY_MAP[pattern];
    }
  }
  return guessCategoryNameGeneric(merchant);
}

// Maps Plaid's personal_finance_category (fetched via
// include_personal_finance_category on every transaction sync, but
// previously discarded) to our own category taxonomy. This is Plaid's own
// per-transaction ML classification — more accurate than any static merchant
// list, especially for the long tail of small/independent merchants a brand
// dictionary will never cover. Takes precedence over guessCategoryName when
// available; see lib/auto-tag.ts for where these tiers combine.
const PFC_DETAILED_OVERRIDES: Record<string, string> = {
  FOOD_AND_DRINK_GROCERIES: 'Groceries',
  RENT_AND_UTILITIES_RENT: 'Bills',
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: 'Education',
  PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS: 'Fitness',
  GENERAL_SERVICES_EDUCATION: 'Education',
};

const PFC_PRIMARY_MAP: Record<string, string> = {
  INCOME: 'Income',
  LOAN_DISBURSEMENTS: 'Transfer',
  LOAN_PAYMENTS: 'Bills',
  TRANSFER_IN: 'Transfer',
  TRANSFER_OUT: 'Transfer',
  BANK_FEES: 'Bills',
  ENTERTAINMENT: 'Entertainment',
  FOOD_AND_DRINK: 'Dining',
  GENERAL_MERCHANDISE: 'Shopping',
  HOME_IMPROVEMENT: 'Shopping',
  MEDICAL: 'Healthcare',
  PERSONAL_CARE: 'Healthcare',
  GENERAL_SERVICES: 'Bills',
  GOVERNMENT_AND_NON_PROFIT: 'Bills',
  TRANSPORTATION: 'Transport',
  TRAVEL: 'Travel',
  RENT_AND_UTILITIES: 'Utilities',
  // OTHER has no confident mapping — fall through to merchant-name guessing.
};

export function mapPfcToCategoryName(
  primary?: string | null,
  detailed?: string | null
): string | null {
  if (detailed && PFC_DETAILED_OVERRIDES[detailed]) return PFC_DETAILED_OVERRIDES[detailed];
  if (primary && PFC_PRIMARY_MAP[primary]) return PFC_PRIMARY_MAP[primary];
  return null;
}

// Detects money moving between the household's own accounts — a transfer
// between two of your own accounts, or a credit card payment — so callers
// can exclude it from income/expense totals. Deliberately narrow: only the
// unambiguous cases (Plaid's own transfer direction categories, and the
// credit-card-payment detailed subtype of LOAN_PAYMENTS). Other loan
// payments (mortgage, student loan, personal loan) are real expenses, not
// transfers, and are left alone.
export function mapPfcToTransferType(
  primary?: string | null,
  detailed?: string | null
): 'transfer' | 'credit_card_payment' | null {
  if (detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT') return 'credit_card_payment';
  if (primary === 'TRANSFER_IN' || primary === 'TRANSFER_OUT') return 'transfer';
  return null;
}
