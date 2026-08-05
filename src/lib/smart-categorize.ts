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

// Guess a category name for a merchant string using the built-in knowledge
// base. Returns null when no pattern matches — callers should leave the
// transaction untagged rather than force a guess.
export function guessCategoryName(merchant: string): string | null {
  const lower = merchant.toLowerCase();
  for (const pattern of SORTED_PATTERNS) {
    if (lower.includes(pattern)) {
      return MERCHANT_CATEGORY_MAP[pattern];
    }
  }
  return null;
}
