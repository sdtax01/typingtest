/** Marathi sample strings used by tests and diagnostics. Keep as literal Unicode. */
export const DIAGNOSTIC_SENTENCE =
  'माझे नाव मराठी टायपिंग चाचणी आहे. महाराष्ट्र ही संतांची आणि वीरांची भूमी आहे.';

export const segmentationFixtures: { name: string; text: string; akshara: string[]; codePoints: number }[] = [
  { name: 'simple word', text: 'मराठी', akshara: ['म', 'रा', 'ठी'], codePoints: 5 },
  { name: 'independent vowels', text: 'अआइ', akshara: ['अ', 'आ', 'इ'], codePoints: 3 },
  { name: 'conjunct kSha', text: 'क्ष', akshara: ['क्ष'], codePoints: 3 },
  { name: 'conjunct tra', text: 'त्र', akshara: ['त्र'], codePoints: 3 },
  { name: 'conjunct jnya', text: 'ज्ञ', akshara: ['ज्ञ'], codePoints: 3 },
  { name: 'triple conjunct', text: 'महाराष्ट्र', akshara: ['म', 'हा', 'रा', 'ष्ट्र'], codePoints: 10 },
  { name: 'anusvara', text: 'संतांची', akshara: ['सं', 'तां', 'ची'], codePoints: 7 },
  { name: 'chandrabindu', text: 'माँ', akshara: ['माँ'], codePoints: 3 },
  { name: 'nukta (NFC of U+0958)', text: 'क़', akshara: ['क़'], codePoints: 1 },
  { name: 'danda and spaces', text: 'आहे। ठीक', akshara: ['आ', 'हे', '।', ' ', 'ठी', 'क'], codePoints: 8 },
  { name: 'line break', text: 'अ\nब', akshara: ['अ', '\n', 'ब'], codePoints: 3 },
  { name: 'mixed latin digits', text: 'टेस्ट 12 ab!', akshara: ['टे', 'स्ट', ' ', '1', '2', ' ', 'a', 'b', '!'], codePoints: 12 },
];
