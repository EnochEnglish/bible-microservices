const fs = require('fs');
const p = 'D:/dev/github/bible-microservices/bible-monolith/src/main/kotlin/com/bible/monolith/kb/service/KbIndexService.kt';
let src = fs.readFileSync(p, 'utf8');

// Fix 1: batch >= 100 case
const old1 = [
  'zvecBridge.batchInsert(collection, batchDocs, vectors)',
  '                            totalProcessed += batchDocs.size',
  '                            moduleCount += batchDocs.size',
  '                        } catch (e: Exception) {',
  '                            totalErrors += batchDocs.size',
  '                            log.warn("Dict embed failed: {}", e.message)',
  '                        }',
  '                        batchDocs.clear()',
  '                        progressCallback?.invoke(BuildProgress("dictionary", "tfidf_256", totalProcessed, -1, totalErrors))'
].join('\n');

const new1 = [
  'zvecBridge.batchInsert(collection, batchDocs, vectors)',
  '                            batchDocs.forEach { doc -> doc.setVecId("tfidf_256", "dictionary_${doc.sourceRef}_${doc.chunkIndex}") }',
  '                            docRepo.saveAll(batchDocs)',
  '                            totalProcessed += batchDocs.size',
  '                            moduleCount += batchDocs.size',
  '                        } catch (e: Exception) {',
  '                            totalErrors += batchDocs.size',
  '                            log.warn("Dict embed failed: {}", e.message)',
  '                        }',
  '                        batchDocs.clear()',
  '                        progressCallback?.invoke(BuildProgress("dictionary", "tfidf_256", totalProcessed, -1, totalErrors))'
].join('\n');

if (src.includes(old1)) {
    src = src.replace(old1, new1);
    console.log('Fixed dict batch >= 100: added setVecId + saveAll');
} else {
    console.log('NOT FOUND: dict batch >= 100');
}

// Fix 2: remaining batch case
const old2 = [
  'zvecBridge.batchInsert(collection, batchDocs, vectors)',
  '                        totalProcessed += batchDocs.size',
  '                        moduleCount += batchDocs.size',
  '                    } catch (e: Exception) {',
  '                        totalErrors += batchDocs.size',
  '                    }',
  '                    batchDocs.clear()'
].join('\n');

const new2 = [
  'zvecBridge.batchInsert(collection, batchDocs, vectors)',
  '                        batchDocs.forEach { doc -> doc.setVecId("tfidf_256", "dictionary_${doc.sourceRef}_${doc.chunkIndex}") }',
  '                        docRepo.saveAll(batchDocs)',
  '                        totalProcessed += batchDocs.size',
  '                        moduleCount += batchDocs.size',
  '                    } catch (e: Exception) {',
  '                        totalErrors += batchDocs.size',
  '                    }',
  '                    batchDocs.clear()'
].join('\n');

if (src.includes(old2)) {
    src = src.replace(old2, new2);
    console.log('Fixed dict remaining: added setVecId + saveAll');
} else {
    console.log('NOT FOUND: dict remaining');
}

fs.writeFileSync(p, src, 'utf8');
console.log('Done');
