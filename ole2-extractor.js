// OLE2 Compound Document parser + Word 6/95 text extractor
// Uses iconv-lite for GBK decoding
const fs = require('fs');
const iconv = require('iconv-lite');

function extractDocText(filePath) {
    const buf = fs.readFileSync(filePath);
    
    // Check format
    if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) {
        return extractOle2Text(buf);
    }
    
    // Try RTF
    const headText = buf.toString('latin1', 0, 10);
    if (headText.startsWith('{\\rtf')) {
        return extractRtfText(buf.toString('latin1'));
    }
    
    // Try plain UTF-8
    return buf.toString('utf8');
}

function extractOle2Text(buf) {
    const sectorSize = 1 << buf.readUInt16LE(30);
    const firstDirSector = buf.readInt32LE(48);
    
    // Read DIF
    const difEntries = [];
    for (let i = 0; i < 109; i++) {
        const entry = buf.readInt32LE(76 + i * 4);
        if (entry < 0) break;
        difEntries.push(entry);
    }
    // Additional DIF sectors
    const firstDifSector = buf.readInt32LE(68);
    const difSectorCount = buf.readInt32LE(72);
    let nextDif = firstDifSector;
    for (let d = 0; d < difSectorCount && nextDif >= 0; d++) {
        const offset = (nextDif + 1) * sectorSize;
        for (let i = 0; i < sectorSize / 4 - 1; i++) {
            const entry = buf.readInt32LE(offset + i * 4);
            if (entry >= 0) difEntries.push(entry);
        }
        nextDif = buf.readInt32LE(offset + sectorSize - 4);
    }
    
    // Read FAT
    const fat = [];
    for (const fatSector of difEntries) {
        const offset = (fatSector + 1) * sectorSize;
        for (let i = 0; i < sectorSize / 4; i++) {
            fat.push(buf.readInt32LE(offset + i * 4));
        }
    }
    
    // Read directory
    function readSectorChain(startSector, size) {
        const sectors = [];
        let current = startSector;
        let safety = 0;
        while (current >= 0 && current < fat.length && safety < 10000) {
            sectors.push(buf.slice((current+1)*sectorSize, (current+2)*sectorSize));
            const next = fat[current];
            if (next === -2) break;
            current = next;
            safety++;
        }
        const result = Buffer.concat(sectors);
        return size > 0 && size < result.length ? result.slice(0, size) : result;
    }
    
    const dirData = readSectorChain(firstDirSector, -1);
    
    // Parse directory entries
    const entries = [];
    const entrySize = 128;
    for (let i = 0; i < Math.floor(dirData.length / entrySize); i++) {
        const offset = i * entrySize;
        const nameLen = dirData.readUInt16LE(offset + 64);
        if (nameLen === 0) continue;
        const entry = {
            name: dirData.toString('utf16le', offset, offset + Math.min(nameLen - 2, 64)),
            type: dirData[offset + 66],
            startSector: dirData.readInt32LE(offset + 116),
            size: dirData.readInt32LE(offset + 120)
        };
        entries.push(entry);
    }
    
    // Find WordDocument stream
    const wordDocEntry = entries.find(e => e.name === 'WordDocument');
    if (!wordDocEntry) return '';
    
    const wordDoc = readSectorChain(wordDocEntry.startSector, wordDocEntry.size);
    
    // Parse FIB
    const nFib = wordDoc.readUInt16LE(2);
    
    // Word 6/95 format (nFib <= 0x00BF)
    // fcMin at offset 24, fcMac at offset 28
    const fcMin = wordDoc.readInt32LE(24);
    const fcMac = wordDoc.readInt32LE(28);
    
    if (fcMin > 0 && fcMac > fcMin && fcMac <= wordDoc.length) {
        const textData = wordDoc.slice(fcMin, fcMac);
        
        // Word 6/95 Chinese: text is byte-swapped GBK (big-endian GBK)
        // Swap each byte pair then decode as GBK
        const swapped = Buffer.alloc(textData.length);
        for (let i = 0; i < textData.length - 1; i += 2) {
            swapped[i] = textData[i+1];
            swapped[i+1] = textData[i];
        }
        if (textData.length % 2 === 1) swapped[textData.length-1] = textData[textData.length-1];
        const textGbk = iconv.decode(swapped, 'gbk');
        const cnGbk = (textGbk.match(/[\u4e00-\u9fff]/g) || []).length;
        if (cnGbk > 5) return textGbk;
        
        // Try straight GBK (some docs not byte-swapped)
        const textGbkDirect = iconv.decode(textData, 'gbk');
        const cnGbkDirect = (textGbkDirect.match(/[\u4e00-\u9fff]/g) || []).length;
        if (cnGbkDirect > 5) return textGbkDirect;
        
        // Try UTF-16LE
        const text16 = textData.toString('utf16le');
        const cn16 = (text16.match(/[\u4e00-\u9fff]/g) || []).length;
        if (cn16 > 5) return text16;
        
        // Fallback: CP1252
        return iconv.decode(textData, 'cp1252');
    }
    
    // Word 97+ format (nFib >= 0x00C1)
    // Text starts at offset 0x0800, stored as UTF-16LE
    if (nFib >= 0x00C1) {
        // Read fibRgLw for ccpText
        const csw = wordDoc.readUInt16LE(32);
        const cslwOffset = 32 + 2 + csw * 2;
        const cslw = wordDoc.readUInt16LE(cslwOffset);
        const fibRgLwOffset = cslwOffset + 2;
        const ccpText = wordDoc.readInt32LE(fibRgLwOffset + 12);
        
        const textStart = 0x0800;
        if (textStart < wordDoc.length) {
            const flags = wordDoc.readUInt16LE(10);
            const isComplex = (flags & 0x0004) !== 0;
            
            if (!isComplex) {
                // Unicode (UTF-16LE)
                const textData = wordDoc.slice(textStart, Math.min(textStart + ccpText * 2, wordDoc.length));
                return textData.toString('utf16le');
            } else {
                // 8-bit encoded, use GBK for Chinese
                const textData = wordDoc.slice(textStart, Math.min(textStart + ccpText, wordDoc.length));
                return iconv.decode(textData, 'gbk');
            }
        }
    }
    
    return '';
}

function extractRtfText(rtf) {
    // Handle GBK-encoded RTF (common for Chinese RTF files)
    // RTF escapes non-ASCII as \'XX hex pairs
    let result = '';
    let i = 0;
    let gbkBuffer = [];
    
    function flushGbk() {
        if (gbkBuffer.length > 0) {
            const buf = Buffer.from(gbkBuffer);
            try {
                result += iconv.decode(buf, 'gbk');
            } catch(e) {
                result += buf.toString('latin1');
            }
            gbkBuffer = [];
        }
    }
    
    while (i < rtf.length) {
        if (rtf[i] === '\\') {
            flushGbk();
            const next = rtf[i+1];
            if (next === 'u') {
                const m = rtf.substring(i).match(/^\\u(-?\d+)/);
                if (m) {
                    let code = parseInt(m[1]);
                    if (code < 0) code += 65536;
                    result += String.fromCharCode(code);
                    i += m[0].length;
                    if (rtf[i] === '?') i++;
                    continue;
                }
            }
            if (next === "'") {
                const m = rtf.substring(i).match(/^\\'([0-9a-fA-F]{2})/);
                if (m) {
                    gbkBuffer.push(parseInt(m[1], 16));
                    i += m[0].length;
                    continue;
                }
            }
            const cm = rtf.substring(i).match(/^\\([a-zA-Z]+)(-?\d*)\s?/);
            if (cm) {
                if (cm[1].includes('par')) result += '\n';
                if (cm[1].includes('tab')) result += '\t';
                if (cm[1] === 'fonttbl' || cm[1] === 'colortbl' || cm[1] === 'stylesheet') {
                    // Skip these tables
                    let braceCount = 1;
                    i += cm[0].length;
                    while (i < rtf.length && braceCount > 0) {
                        if (rtf[i] === '{') braceCount++;
                        if (rtf[i] === '}') braceCount--;
                        i++;
                    }
                    continue;
                }
                i += cm[0].length;
                continue;
            }
            i += 2;
            continue;
        }
        flushGbk();
        if (rtf[i] === '{' || rtf[i] === '}') { i++; continue; }
        if (rtf[i] !== '\r' && rtf[i] !== '\n') result += rtf[i];
        i++;
    }
    flushGbk();
    return result;
}

// Test
if (require.main === module) {
    const filePath = process.argv[2] || 'D:\\dev\\usebible.com\\html\\blessed\\chinese\\download\\badgood\\badgood-ch.doc';
    const text = extractDocText(filePath);
    const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    console.log(`Length: ${text.length}, Chinese: ${chineseCount}`);
    console.log('First 300:', text.substring(0, 300));
}

module.exports = { extractDocText };
