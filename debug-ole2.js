const fs = require('fs');
const iconv = require('iconv-lite');

const buf = fs.readFileSync('D:\\dev\\usebible.com\\html\\blessed\\chinese\\download\\badgood\\badgood-ch.doc');
const sectorSize = 512;

// FAT
const difEntries = [];
for (let i = 0; i < 109; i++) {
    const entry = buf.readInt32LE(76 + i * 4);
    if (entry < 0) break;
    difEntries.push(entry);
}
const fat = [];
for (const fatSector of difEntries) {
    const offset = (fatSector + 1) * sectorSize;
    for (let i = 0; i < sectorSize / 4; i++) {
        fat.push(buf.readInt32LE(offset + i * 4));
    }
}

function readStream(startSector, size) {
    const sectors = [];
    let current = startSector;
    let safety = 0;
    while (current >= 0 && current < fat.length && safety < 1000) {
        sectors.push(buf.slice((current+1)*sectorSize, (current+2)*sectorSize));
        const next = fat[current];
        if (next === -2) break;
        current = next;
        safety++;
    }
    const result = Buffer.concat(sectors);
    return size > 0 && size < result.length ? result.slice(0, size) : result;
}

// WordDocument stream
const wordDoc = readStream(8, 9937);
const fcMin = wordDoc.readInt32LE(24);
const fcMac = wordDoc.readInt32LE(28);
console.log('fcMin:', fcMin, 'fcMac:', fcMac);

const textData = wordDoc.slice(fcMin, fcMac);

// Show hex of first 32 bytes
let hex = '';
for (let i = 0; i < 32 && i < textData.length; i++) {
    hex += textData[i].toString(16).padStart(2, '0') + ' ';
}
console.log('Hex:', hex);

// The hex shows: e7 c8 ce ba ab b4 b2 bd a3 b8 f4 d2
// In GBK: e7c8=缛 ceba=魏 abc4=缧 b2bd=步 a3b8=? f4d2=?
// But expected text should be "坏消息与好消息" or similar
// Actually e7c8 in GBK = 缛? Let me check: 
// GBK e7c8 -> Unicode should be... let me try swapping bytes

// Try interpreting as big-endian GBK (swap byte pairs)
const swapped = Buffer.alloc(textData.length);
for (let i = 0; i < textData.length - 1; i += 2) {
    swapped[i] = textData[i+1];
    swapped[i+1] = textData[i];
}
const textSwapped = iconv.decode(swapped, 'gbk');
const cnSwapped = (textSwapped.match(/[\u4e00-\u9fff]/g) || []).length;
console.log('Swapped GBK:', cnSwapped, 'Chinese, first 200:', textSwapped.substring(0, 200));

// Also try UTF-16LE directly
const text16 = textData.toString('utf16le');
const cn16 = (text16.match(/[\u4e00-\u9fff]/g) || []).length;
console.log('UTF-16LE:', cn16, 'Chinese, first 200:', text16.substring(0, 200));

// And UTF-16BE
const textBE = textData.toString('utf16be');
const cnBE = (textBE.match(/[\u4e00-\u9fff]/g) || []).length;
console.log('UTF-16BE:', cnBE, 'Chinese, first 200:', textBE.substring(0, 200));

// Actually, Word 6/95 Chinese stores text as single-byte GBK
// But fcMin/fcMac in Word 6 point to byte offsets
// Let me try straight GBK
const textGbk = iconv.decode(textData, 'gbk');
const cnGbk = (textGbk.match(/[\u4e00-\u9fff]/g) || []).length;
console.log('GBK direct:', cnGbk, 'Chinese, first 200:', textGbk.substring(0, 200));

// Maybe it's actually UTF-16LE and fcMin/fcMac are in characters not bytes
const text16FromOffset = wordDoc.slice(fcMin * 2, Math.min(fcMac * 2, wordDoc.length)).toString('utf16le');
const cn16Offset = (text16FromOffset.match(/[\u4e00-\u9fff]/g) || []).length;
console.log('UTF-16LE (char offset):', cn16Offset, 'Chinese, first 200:', text16FromOffset.substring(0, 200));
