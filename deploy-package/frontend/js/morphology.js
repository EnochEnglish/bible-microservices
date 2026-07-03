
// ============================================================
//  Bible Microservices — Morphology Parsers
//  Parses Hebrew (OSHB/Weston) and Greek (Robinson) morph codes
//  into human-readable descriptions.
// ============================================================

// ── Greek Robinson Morphology Parser ──
// Format: V-AAI-3S  or A-NSM  or ADV
var ROBINSON = {
  // Part of Speech
  pos: {
    "V": "Verb", "N": "Noun", "A": "Adjective", "P": "Pronoun",
    "T": "Article", "R": "Relative Pronoun", "C": "Conjunction",
    "D": "Demonstrative", "I": "Interjection", "X": "Indefinite",
    "K": "Correlative", "ADV": "Adverb", "CONJ": "Conjunction",
    "PREP": "Preposition", "PRT": "Particle", "HEB": "Hebrew",
    "INJ": "Interjection", "COND": "Conditional", "ARAM": "Aramaic",
    "F": null // F-xxx prefix handled separately
  },
  // Verb: tense (first char(s) of field 2)
  tense: {
    "P": "Present", "I": "Imperfect", "F": "Future",
    "A": "Aorist", "2A": "2nd Aorist", "R": "Perfect",
    "2R": "2nd Perfect", "L": "Pluperfect"
  },
  // Verb: voice (after tense)
  voice: { "A": "Active", "M": "Middle", "P": "Passive", "D": "Middle Deponent", "O": "Passive Deponent" },
  // Verb: mood (after voice)
  mood: { "I": "Indicative", "S": "Subjunctive", "O": "Optative", "M": "Imperative", "N": "Infinitive", "P": "Participle" },
  // Noun/Adj: case
  nounCase: { "N": "Nominative", "G": "Genitive", "D": "Dative", "A": "Accusative", "V": "Vocative" },
  // Number
  number: { "S": "Singular", "P": "Plural" },
  // Gender
  gender: { "M": "Masculine", "F": "Feminine", "N": "Neuter" },
  // Person (for verbs)
  person: { "1": "1st Pers.", "2": "2nd Pers.", "3": "3rd Pers." }
};

function parseGreekMorph(code) {
  if (!code) return null;
  var upper = code.toUpperCase().trim();
  var parts = upper.split(/\s+/)[0].split("-"); // take first segment, ignore robinson: suffix
  if (parts.length === 0) return null;

  var pos = parts[0];
  var posName = ROBINSON.pos[pos] || pos;

  // Single-part codes (ADV, CONJ, PREP, etc.)
  if (parts.length === 1) {
    if (ROBINSON.pos[pos]) return posName;
    return null;
  }

  // Multi-part codes
  var field2 = parts[1];
  var field3 = parts[2] || "";
  var field4 = parts[3] || "";

  // ── Verb parsing ──
  if (pos === "V" && field2.length >= 3) {
    var tStart = 0;
    // Handle 2nd aorist/perfect prefixes
    if (field2.charAt(0) === "2") { tStart = 1; field2 = "2" + field2.charAt(1); }
    var tenseCode = field2.substring(tStart, tStart + (field2.charAt(tStart) === "I" ? 1 : 1));
    // Actually: field2[0]=tense, field2[1]=voice, field2[2]=mood
    var tenseLetter = field2.charAt(0);
    var voiceLetter = field2.charAt(1);
    var moodLetter = field2.charAt(2);

    // Detect 2-prefix tenses
    if (tenseLetter === "2") {
      var actualTense = "2" + voiceLetter;
      var actualVoice = moodLetter;
      var actualMood = field2.charAt(3) || "";
      tenseLetter = actualTense;
      voiceLetter = actualVoice;
      moodLetter = actualMood;
    } else if (voiceLetter === "A" && moodLetter === "I" && field2.length === 3) {
      // Standard A I format (e.g., AAI)
    }

    var tense = ROBINSON.tense[tenseLetter] || tenseLetter;
    var voice = ROBINSON.voice[voiceLetter] || voiceLetter;
    var mood = ROBINSON.mood[moodLetter] || moodLetter;

    var person = "";
    var number = "";
    if (field3.length >= 2) {
      person = ROBINSON.person[field3.charAt(0)] || field3.charAt(0);
      number = ROBINSON.number[field3.charAt(1)] || field3.charAt(1);
    }

    var desc = posName + " — " + tense + " " + voice + " " + mood;
    if (person) desc += " · " + person + " " + number;
    return desc;
  }

  // ── Noun/Adjective/Pronoun parsing ──
  // field2 = case+number+gender (e.g., NSM, GSF, APM)
  if (field2.length >= 3) {
    var c = ROBINSON.nounCase[field2.charAt(0)] || field2.charAt(0);
    var n = ROBINSON.number[field2.charAt(1)] || field2.charAt(1);
    var g = ROBINSON.gender[field2.charAt(2)] || field2.charAt(2);
    return posName + " — " + c + " " + n + " " + g;
  }
  if (field2.length === 2 && field2.charAt(1) === "I") {
    // OI = Vocative Interjection-like
    return posName + " — Vocative";
  }

  return posName + " (" + parts.slice(1).join("-") + ")";
}


// ── Hebrew OSHB/Weston Morphology Table ──
var HEBREW_MORPH = {
  // Qal — H8798–H8804
  "H8798": "Qal Infinitive Absolute",
  "H8799": "Qal Imperfect — simple action, ongoing/incomplete",
  "H8800": "Qal Infinitive Construct",
  "H8801": "Qal Participle passive",
  "H8802": "Qal Participle active — continuous/ongoing state",
  "H8803": "Qal Imperative",
  "H8804": "Qal Perfect — simple action completed",
  // Niphal — H8735–H8738
  "H8735": "Niphal Perfect — passive/reflexive completed",
  "H8736": "Niphal Imperative",
  "H8737": "Niphal Imperfect — passive/reflexive ongoing",
  "H8738": "Niphal Participle",
  "H8739": "Niphal Infinitive Absolute",
  "H8740": "Niphal Infinitive Construct",
  // Piel — H8840–H8845
  "H8840": "Piel Infinitive Absolute",
  "H8841": "Piel Infinitive Construct",
  "H8842": "Piel Participle",
  "H8843": "Piel Imperative",
  "H8844": "Piel Imperfect — intensive, ongoing",
  "H8845": "Piel Perfect — intensive action completed",
  // Pual — H8846–H8853
  "H8846": "Pual Infinitive Construct",
  "H8847": "Pual Participle",
  "H8848": "Pual Imperative",
  "H8849": "Pual Imperfect — passive intensive ongoing",
  "H8850": "Pual Imperfect — passive intensive ongoing (alt)",
  "H8851": "Pual Imperfect — passive intensive ongoing (alt2)",
  "H8852": "Pual Perfect — passive intensive completed",
  "H8853": "Pual Perfect — passive intensive completed (alt)",
  // Hiphil — H8688–H8694
  "H8688": "Hiphil Perfect — causative completed",
  "H8689": "Hiphil Imperfect — causative ongoing",
  "H8690": "Hiphil Imperative",
  "H8691": "Hiphil Participle",
  "H8692": "Hiphil Infinitive Absolute",
  "H8693": "Hiphil Infinitive Construct",
  "H8694": "Hiphil Imperfect (jussive)",
  // Hophal — H8714–H8719
  "H8714": "Hophal Perfect — passive causative completed",
  "H8715": "Hophal Imperfect — passive causative ongoing",
  "H8716": "Hophal Imperative",
  "H8717": "Hophal Participle",
  "H8718": "Hophal Infinitive Absolute",
  "H8719": "Hophal Infinitive Construct",
  // Hithpael — H8685–H8687
  "H8685": "Hithpael Perfect — reflexive action completed",
  "H8686": "Hithpael Imperfect — reflexive ongoing",
  "H8687": "Hithpael Imperative",
  // Additional forms from actual data
  "H8761": "Qal Imperfect (cohortative)",
  "H8762": "Qal Imperfect (jussive)",
  "H8763": "Qal Imperfect (waw-consecutive)",
  "H8764": "Hiphil Imperfect (waw-consecutive)",
  "H8765": "Hiphil Perfect (waw-consecutive)",
  "H8787": "Hithpael Participle"
};

function parseHebrewMorph(code) {
  if (!code) return null;
  var upper = code.toUpperCase().trim();
  // Strip T prefix if present
  if (upper.charAt(0) === "T") upper = upper.substring(1);
  if (HEBREW_MORPH[upper]) return HEBREW_MORPH[upper];
  return null;
}


// ── Unified morph description ──
// Returns HTML description for any morph code
function describeMorph(morph, lang) {
  if (!morph) return null;
  lang = lang || "en";
  var upper = morph.toUpperCase().trim();

  // 1. Check Hebrew table
  var hDesc = parseHebrewMorph(upper);
  if (hDesc) {
    return '<div class="st-head">' + escHtml(morph) + '</div><div class="st-def">' + escHtml(hDesc) + '</div>';
  }

  // 2. Parse Greek via Robinson system
  var gDesc = parseGreekMorph(upper);
  if (gDesc) {
    return '<div class="st-head">' + escHtml(morph) + '</div><div class="st-def">' + escHtml(gDesc) + '</div>';
  }

  // 3. Fallback: generic label
  if (/^T?H\d+$/.test(upper)) {
    var label = lang === "zh" ? "希伯来文形态码" : "Hebrew Morphology";
    return '<div class="st-head">' + escHtml(upper) + '</div><div class="st-def"><em>' + label + '</em></div>';
  }
  if (/^T?G\d+$/.test(upper)) {
    var label2 = lang === "zh" ? "希腊文形态码" : "Greek Morphology";
    return '<div class="st-head">' + escHtml(upper) + '</div><div class="st-def"><em>' + label2 + '</em></div>';
  }

  return null;
}


// ── Expand MORPH_QUICK to full table (for backward compat) ──
var MORPH_QUICK = {};
for (var k in HEBREW_MORPH) { if (HEBREW_MORPH.hasOwnProperty(k)) { MORPH_QUICK[k] = HEBREW_MORPH[k]; } }
// Also add Greek quick entries via parseGreekMorph for common codes
function _buildGreekQuick() {
  var commonGreek = ["V-AAI-3S","V-PAI-3S","V-AAN","V-API-3S","V-FAI-3S","N-NSM","A-NSM","P-GSM","T-NSM"];
  for (var i = 0; i < commonGreek.length; i++) {
    var desc = parseGreekMorph(commonGreek[i]);
    if (desc) MORPH_QUICK[commonGreek[i]] = desc;
  }
}
_buildGreekQuick();
