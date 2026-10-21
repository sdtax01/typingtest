import type { Lesson, Passage } from '../lib/types';

/** Bundled starter content (original text). Used in local mode and as an offline fallback. */
export const bundledPassages: Passage[] = [
  {
    id: 'p-intro',
    title: 'ओळख आणि सराव',
    difficulty: 'beginner',
    version: 1,
    published: true,
    text: 'माझे नाव राज आहे. मी पुण्यात राहतो. मला मराठी टायपिंग शिकायला आवडते. रोज सराव केला की वेग वाढतो आणि चुका कमी होतात.',
  },
  {
    id: 'p-words',
    title: 'रोजचे शब्द',
    difficulty: 'beginner',
    version: 1,
    published: true,
    text: 'घर, वाट, शाळा, पाणी, झाड, फूल, पक्षी, आकाश, पाऊस, ढग, नदी, डोंगर, शेत, गाव, शहर, बाजार, रस्ता, दिवा, पुस्तक, वही.',
  },
  {
    id: 'p-maharashtra',
    title: 'महाराष्ट्र',
    difficulty: 'intermediate',
    version: 1,
    published: true,
    text: 'महाराष्ट्र ही संतांची आणि वीरांची भूमी आहे. येथे अनेक किल्ले, नद्या आणि डोंगर आहेत. सह्याद्रीच्या कुशीत वसलेले हे राज्य आपल्या संस्कृतीसाठी ओळखले जाते.',
  },
  {
    id: 'p-student',
    title: 'विद्यार्थी आणि अभ्यास',
    difficulty: 'intermediate',
    version: 1,
    published: true,
    text: 'विद्यार्थ्यांनी नियमित अभ्यास करावा. परीक्षेत यश मिळवण्यासाठी कष्ट, चिकाटी आणि योग्य नियोजन आवश्यक आहे. शिक्षकांचे मार्गदर्शन मिळाल्यास अडचणी सहज सुटतात.',
  },
  {
    id: 'p-office',
    title: 'कार्यालयीन कामकाज',
    difficulty: 'advanced',
    version: 1,
    published: true,
    text: 'कार्यालयीन कामकाजात वेळेचे नियोजन अत्यंत महत्त्वाचे असते. पत्रव्यवहार करताना भाषा सोपी, स्पष्ट आणि सौजन्यपूर्ण असावी. प्रत्येक कागदपत्राची नोंद वहीत केली जाते.',
  },
  {
    id: 'p-constitution',
    title: 'नागरिकांचे हक्क',
    difficulty: 'advanced',
    version: 1,
    published: true,
    text: 'भारतीय संविधानाने प्रत्येक नागरिकाला समान हक्क दिले आहेत. स्वातंत्र्य, समता आणि बंधुता ही लोकशाहीची मूलभूत तत्त्वे आहेत. सुजाण नागरिक म्हणून आपले कर्तव्य पार पाडणे महत्त्वाचे आहे.',
  },
];

export const bundledLessons: Lesson[] = [
  { id: 'l-1', title: 'धडा १ — ओळख', passageId: 'p-intro', difficulty: 'beginner', mode: 'practice', durationSec: 180, minAccuracy: 85, minNetSpeed: 0, requireCompletion: true, segmentation: 'grapheme', published: true, sortOrder: 1 },
  { id: 'l-2', title: 'धडा २ — रोजचे शब्द', passageId: 'p-words', difficulty: 'beginner', mode: 'practice', durationSec: 180, minAccuracy: 90, minNetSpeed: 0, requireCompletion: true, segmentation: 'grapheme', published: true, sortOrder: 2 },
  { id: 'l-3', title: 'धडा ३ — महाराष्ट्र', passageId: 'p-maharashtra', difficulty: 'intermediate', mode: 'practice', durationSec: 300, minAccuracy: 92, minNetSpeed: 0, requireCompletion: true, segmentation: 'grapheme', published: true, sortOrder: 3 },
  { id: 'l-4', title: 'धडा ४ — विद्यार्थी', passageId: 'p-student', difficulty: 'intermediate', mode: 'practice', durationSec: 300, minAccuracy: 92, minNetSpeed: 0, requireCompletion: true, segmentation: 'grapheme', published: true, sortOrder: 4 },
  { id: 'l-5', title: 'धडा ५ — कार्यालयीन', passageId: 'p-office', difficulty: 'advanced', mode: 'practice', durationSec: 300, minAccuracy: 95, minNetSpeed: 0, requireCompletion: true, segmentation: 'grapheme', published: true, sortOrder: 5 },
  { id: 'e-1', title: 'सराव परीक्षा — ५ मिनिटे', passageId: 'p-constitution', difficulty: 'advanced', mode: 'exam', durationSec: 300, minAccuracy: 95, minNetSpeed: 0, requireCompletion: false, segmentation: 'grapheme', published: true, sortOrder: 10 },
];

export const difficultyLabel: Record<string, string> = {
  beginner: 'सोपे · Beginner',
  intermediate: 'मध्यम · Intermediate',
  advanced: 'कठीण · Advanced',
};
