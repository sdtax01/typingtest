import { evaluate } from '../engine';

export interface InputDiagnosis {
  length: number;
  codePoints: { ch: string; hex: string }[];
  devanagariCount: number;
  warnings: string[];
  matchPercent: number | null;
}

const DEVA = /[ऀ-ॿ]/;

/** Pure inspection of text that the browser actually received. It cannot know whether ISM or Scroll Lock is on. */
export function diagnoseInput(text: string, expected: string): InputDiagnosis {
  const cps = Array.from(text).map((ch) => ({ ch, hex: 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0') }));
  const deva = cps.filter((c) => DEVA.test(c.ch)).length;
  const warnings: string[] = [];
  if (text.length === 0) warnings.push('अजून कोणतेही अक्षर मिळालेले नाही (रिकामे). मजकूर-क्षेत्रात क्लिक करून टाइप करा.');
  if (text.includes('�')) warnings.push('बदली चिन्ह (U+FFFD) आढळले: मजकूर चुकीच्या encoding मध्ये येत आहे.');
  if (/\?{2,}/.test(text)) warnings.push('"??" सारखी चिन्हे आढळली: ISM ने Unicode ऐवजी असमर्थित आउटपुट पाठवले असू शकते.');
  if (text.length > 0 && deva === 0) warnings.push('एकही देवनागरी अक्षर नाही: कीबोर्ड इंग्रजी मोडमध्ये असू शकतो किंवा ISM Unicode Devanagari मोडमध्ये नाही.');
  if (/[\u0080-ÿ]/.test(text) && deva === 0) warnings.push('Latin-1 विशेष चिन्हे दिसली: ISM जुना (legacy) फॉन्ट मोड वापरत असू शकतो.');
  let matchPercent: number | null = null;
  if (text.length > 0) {
    matchPercent = evaluate({ reference: expected, entered: text, elapsedMs: 60000, policy: { segmentation: 'grapheme', referenceScope: 'typed-prefix' } }).accuracy;
  }
  return { length: cps.length, codePoints: cps, devanagariCount: deva, warnings, matchPercent };
}

export const TROUBLESHOOTING_CHECKLIST = [
  'ISM V6 चालू आहे आणि टास्कबारमध्ये दिसते.',
  'ISM मध्ये मजकूर/फॉन्ट मोड "Unicode Devanagari" निवडला आहे.',
  'कीबोर्ड लेआउट "Typewriter" निवडला आहे.',
  'तुमच्या ISM सेटअपला आवश्यक असल्यास Scroll Lock चालू करा (हे वेबसाइट तपासू शकत नाही).',
  'ब्राउझरचे मजकूर-क्षेत्र फोकसमध्ये आहे (क्लिक करा, कर्सर दिसला पाहिजे).',
  'Notepad मध्ये टाइप करून पहा: तिथे वाचनीय मराठी येते का?',
  'Notepad मध्ये चालते पण ब्राउझरमध्ये नाही: दुसरा ब्राउझर (Chrome/Edge) वापरा आणि ISM ला Administrator म्हणून चालवून पहा.',
  'Windows मध्ये दुसरा मराठी/इंग्रजी इनपुट भाषा-स्विच (Alt+Shift) चुकून चालू नाही ना, ते पहा.',
  'ब्राउझर एक्सटेंशन्स (भाषांतर/ग्रामर) बंद करून पहा.',
  'वरील सर्व नंतरही चालत नसेल: Windows आवृत्ती, ISM आवृत्ती, ब्राउझर आवृत्ती आणि या पानावरील कोड पॉइंट्स नोंदवा.',
];
