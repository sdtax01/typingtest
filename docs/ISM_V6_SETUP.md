# ISM V6 Marathi typing — setup and troubleshooting

**What this site does:** accepts the Unicode text that ISM V6 types into a normal browser text area.
**What it cannot do:** detect that ISM is running, read its mode/layout, or read the Scroll Lock state; a browser cannot do any of that.
It does not provide a second Marathi keyboard layout (that would fight with ISM).

## Setup (Windows, Chrome or Edge)
1. Install and open ISM V6.
2. Select text/font mode **Unicode Devanagari**.
3. Select keyboard layout **Typewriter**.
4. Turn Scroll Lock on **only if your ISM configuration needs it** (varies by installation — verify on your machine).
5. Open the website, go to **ISM V6 सेटअप**, click the diagnostic box.
6. Type the sample sentence: `माझे नाव मराठी टायपिंग चाचणी आहे. महाराष्ट्र ही संतांची आणि वीरांची भूमी आहे.`
7. Check the preview shows readable Marathi, match is ~100%, and there are no warnings.
8. Optionally press **"या ब्राउझरमध्ये चालते म्हणून नोंदवा"**. This stores a note in this browser only; it is not a guarantee.

## If it does not work
Open Notepad and type there first. If Notepad shows garbage/Latin letters, the problem is in ISM, not the website.
Other checks are on the diagnostic page (copyable checklist): ISM mode, focus, input language switch (Alt+Shift), extensions, another browser,
running ISM as Administrator. The diagnostic flags: empty input, U+FFFD, runs of `?`, Latin-only text, and Latin-1 "legacy font" symbols.

## Manual Windows QA checklist (must be done on the target PC — automated tests cannot prove ISM works)
Record: Windows version ____  ISM version ____  Browser + version ____  ISM mode/layout ____  Scroll Lock state ____

| # | Step | Expected | Pass? |
|---|---|---|---|
| 1 | Open ISM V6 | Running in tray | |
| 2 | Select Unicode Devanagari | — | |
| 3 | Select Typewriter layout | — | |
| 4 | Apply the Scroll Lock state your setup requires | — | |
| 5 | Open the app in Chrome/Edge | Loads | |
| 6 | Type the diagnostic sentence on `/ism-setup` | Readable Marathi, no warnings, match ≥ 95% | |
| 7 | Confirm conjuncts क्ष त्र ज्ञ, anusvara, chandrabindu, danda render and are counted | Correct | |
| 8 | Run a 1-minute practice test and finish | Result page appears | |
| 9 | Type a passage exactly | Accuracy 100%, 0 errors | |
| 10 | Type the same passage with one deliberate wrong matra | Exactly 1 substituted | |
| 11 | Skip one word | Missing count = that word's elements | |
| 12 | Compare the displayed numbers against a hand calculation for a short fixture | Equal | |
| 13 | Check results survive a page reload | Still shown | |

If your examination body counts characters differently (e.g. aksharas, or words of 5 keystrokes), set the counting unit and, if known,
the official elements-per-word conversion. Do not treat the default grapheme/elements-per-minute numbers as an official WPM.
