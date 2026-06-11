// Extract Strong's H → Hebrew word mapping from morphhb package
const path = require('path');
const fs = require('fs');
const morphhb = require('morphhb');

const strongsMap = new Map(); // H1234 → Set(hebrew words with niqqud)
const strongsPlain = new Map(); // H1234 → Set(hebrew words without niqqud)

// morphhb structure: { bookName: [ [verse1Words], [verse2Words], ... ] }
// Each word: ["בְּרֵאשִׁית", "c/H/7225", "HR/Ncfsa"]

function stripNiqqud(word) {
  // Remove Hebrew niqqud (vowel points) and cantillation marks
  // Unicode ranges: 0591-05AF (cantillation), 05B0-05BB (niqqud/vowels), 05C4-05C7
  return word.replace(/[\u0591-\u05AF\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '')
             .replace(/\u05C4/g, '')  // hataf marks
             .replace(/[\u05B0-\u05BB]/g, ''); // vowel points
}

function extractStrongs(lemma) {
  // Lemma format: "c/H/7225" or "c/m/7225" or "7225"
  const match = lemma.match(/([Hh])?\/?(\d+)$/);
  if (match) {
    return match[2]; // just the number
  }
  const match2 = lemma.match(/^(\d+)$/);
  if (match2) return match2[1];
  return null;
}

const books = Object.keys(morphhb);
console.log(`Processing ${books.length} books...`);

let totalWords = 0;
let mappedWords = 0;

for (const bookName of books) {
  const chapters = morphhb[bookName];
  if (!Array.isArray(chapters)) continue;
  
  for (const chapter of chapters) {
    if (!Array.isArray(chapter)) continue;
    for (const verse of chapter) {
      if (!Array.isArray(verse)) continue;
      for (const word of verse) {
        totalWords++;
        if (!Array.isArray(word) || word.length < 2) continue;
        
        const [hebWord, lemma] = word;
        const sid = extractStrongs(lemma);
        if (!sid) continue;
        
        mappedWords++;
        const pure = hebWord.replace(/[\u05C3]/g, ''); // remove sof pasuq
        
        if (!strongsMap.has(sid)) strongsMap.set(sid, new Set());
        strongsMap.get(sid).add(pure);
        
        if (!strongsPlain.has(sid)) strongsPlain.set(sid, new Set());
        strongsPlain.get(sid).add(stripNiqqud(pure));
      }
    }
  }
}

console.log(`Total words: ${totalWords}`);
console.log(`Mapped: ${mappedWords}`);
console.log(`Unique Strong's numbers: ${strongsMap.size}`);

// Convert to plain objects for JSON
const output = {};
const outputPlain = {};
for (const [sid, words] of strongsMap) {
  output[sid] = [...words].sort();
}
for (const [sid, words] of strongsPlain) {
  outputPlain[sid] = [...words].sort();
}

const outDir = path.join(__dirname, '..', 'data', 'sword-dicts');
fs.mkdirSync(outDir, { recursive: true });

// Save with niqqud (vowel points)
fs.writeFileSync(
  path.join(outDir, 'strongs_hebrew_words.json'),
  JSON.stringify(output, null, 2),
  'utf-8'
);

// Save niqqud-less version for search
fs.writeFileSync(
  path.join(outDir, 'strongs_hebrew_words_plain.json'),
  JSON.stringify(outputPlain, null, 2),
  'utf-8'
);

// Show samples
const sorted = [...strongsMap.keys()].sort((a, b) => a - b);
console.log('\nSample entries:');
for (let i = 0; i < 12; i++) {
  const sid = sorted[i];
  const words = [...strongsMap.get(sid)].slice(0, 3);
  console.log(`  H${sid}: ${words.join(' | ')}`);
}

console.log(`\nTotal mapped entries saved.`);
console.log(`File sizes: ${(fs.statSync(path.join(outDir, 'strongs_hebrew_words.json')).size / 1024).toFixed(1)} KB, ${(fs.statSync(path.join(outDir, 'strongs_hebrew_words_plain.json')).size / 1024).toFixed(1)} KB`);