const fs = require('fs');
const p = 'D:/dev/github/bible-microservices/bible-monolith/src/main/kotlin/com/bible/monolith/kb/service/KbIndexService.kt';
let src = fs.readFileSync(p, 'utf8');

// Find exact boundaries
const startMarker = '/** Process library books incrementally';
const startIdx = src.indexOf(startMarker);
if (startIdx < 0) { console.log('start not found'); process.exit(1); }

// Find the end: the closing brace before "/** Process commentary"
const endMarker = '/** Process commentary';
const endIdx = src.indexOf(endMarker, startIdx);
if (endIdx < 0) { console.log('end marker not found'); process.exit(1); }

// The old function is from startIdx to the line before endMarker
// Find the } that closes processLibraryIncremental
const between = src.substring(startIdx, endIdx);
const lastBrace = between.lastIndexOf('}');
if (lastBrace < 0) { console.log('no closing brace'); process.exit(1); }

const oldFunc = between.substring(0, lastBrace + 1);
console.log('Old func length:', oldFunc.length);

// New multi-model version
const newFunc = `/** Process library books incrementally — extract, save, embed with ALL models, clear per book */
    private fun processLibraryIncremental(progressCallback: ((BuildProgress) -> Unit)?, zhOnly: Boolean = false) {
        log.info("--- Processing library books incrementally (all models) ---")
        
        val libDir = java.io.File(libraryPath)
        if (!libDir.exists()) {
            log.warn("Library path not found: {}", libraryPath)
            return
        }
        
        val modelIds = embeddingService.allModelIds.filter { 
            embeddingService.getProvider(it).isAvailable() 
        }
        log.info("  Models for library: {}", modelIds)
        
        // Ensure collections for all models
        for (modelId in modelIds) {
            val provider = embeddingService.getProvider(modelId)
            val collection = embeddingService.collectionName(modelId, "library")
            zvecBridge.ensureCollection(collection, provider.dimension)
        }
        
        var totalProcessed = 0
        var totalErrors = 0
        
        for (bookDir in libDir.listFiles { f -> f.isDirectory } ?: emptyArray()) {
            val metaFile = java.io.File(bookDir, "meta.json")
            if (!metaFile.exists()) continue
            
            try {
                val meta = com.fasterxml.jackson.databind.ObjectMapper().readTree(metaFile)
                val bookCode = bookDir.name
                val bookTitle = meta.get("title")?.asText() ?: bookCode
                val category = meta.get("category")?.asText() ?: "其他"
                val language = meta.get("language")?.asText() ?: "zh"
                
                // zhOnly: skip non-Chinese books
                if (zhOnly) {
                    val isCJK = bookTitle.any { it.code in 0x4e00..0x9fff }
                    if (language != "zh" && !isCJK) {
                        log.info("  Skipping non-Chinese book: {} ({})", bookCode, language)
                        continue
                    }
                }
                
                // Phase 1: Extract & save all docs for this book to H2
                val bookDocs = mutableListOf<KbDocument>()
                
                for (chapterFile in bookDir.listFiles { f -> f.name.endsWith(".json") && f.name != "meta.json" } ?: emptyArray()) {
                    val chapterJson = com.fasterxml.jackson.databind.ObjectMapper().readTree(chapterFile)
                    val chapterId = chapterFile.nameWithoutExtension
                    val chapterTitle = chapterJson.get("title")?.asText() ?: chapterId
                    val content = chapterJson.get("content")?.asText() ?: continue
                    
                    val chunks = chunkText(content, 400, 80)
                    for ((idx, chunk) in chunks.withIndex()) {
                        bookDocs.add(KbDocument(
                            sourceType = "library",
                            sourceRef = "$bookCode/$chapterId",
                            title = "$bookTitle — $chapterTitle",
                            content = if (chunks.size == 1) content else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "$bookCode/$chapterId",
                            bookCode = bookCode,
                            category = category,
                            language = language
                        ))
                    }
                }
                
                if (bookDocs.isEmpty()) continue
                docRepo.saveAll(bookDocs)
                docRepo.flush()
                
                // Phase 2: Index with each model (batch by batch, clear memory between models)
                for (modelId in modelIds) {
                    val provider = embeddingService.getProvider(modelId)
                    val collection = embeddingService.collectionName(modelId, "library")
                    val batchSize = 50
                    var modelProcessed = 0
                    var modelErrors = 0
                    
                    for (batch in bookDocs.chunked(batchSize)) {
                        try {
                            val texts = batch.map { it.chunkText ?: it.content }
                            val vectors = provider.embedBatch(texts)
                            zvecBridge.batchInsert(collection, batch, vectors)
                            batch.forEach { doc -> doc.setVecId(modelId, "library_" + doc.sourceRef + "_" + doc.chunkIndex) }
                            modelProcessed += batch.size
                        } catch (e: Exception) {
                            modelErrors += batch.size
                            log.warn("Library {} embed failed: {}", modelId, e.message)
                        }
                    }
                    
                    docRepo.saveAll(bookDocs)
                    docRepo.flush()
                    log.info("    {} / {}: {} chunks indexed", bookCode, modelId, modelProcessed)
                    
                    if (modelId == modelIds.first()) {
                        totalProcessed += modelProcessed
                        progressCallback?.invoke(BuildProgress("library", modelId, totalProcessed, -1, totalErrors))
                    }
                }
                
                bookDocs.clear()
            } catch (e: Exception) {
                log.warn("Failed to parse library book {}: {}", bookDir.name, e.message)
            }
        }
        
        // Flush all model collections
        for (modelId in modelIds) {
            zvecBridge.flush(embeddingService.collectionName(modelId, "library"))
        }
        log.info("  Library total: {} docs indexed, {} errors", totalProcessed, totalErrors)
    }`;

src = src.substring(0, startIdx) + newFunc + src.substring(startIdx + oldFunc.length);
fs.writeFileSync(p, src, 'utf8');
console.log('SUCCESS: replaced processLibraryIncremental with multi-model version');
console.log('Old:', oldFunc.length, 'chars, New:', newFunc.length, 'chars');
