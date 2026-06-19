package com.bible.monolith.support

import org.crosswire.jsword.book.Book
import org.crosswire.jsword.book.BookException
import org.crosswire.jsword.index.Index
import org.crosswire.jsword.index.IndexManager
import org.crosswire.jsword.index.IndexPolicy
import org.crosswire.jsword.index.IndexPolicyAdapter
import java.net.URI

/**
 * Stub IndexManager for read-only SWORD module access.
 *
 * JSword requires an IndexManager for book registration.
 * Since we only need read access (browse modules, fetch passages),
 * this stub satisfies the contract without actual Lucene indexing.
 */
class StubIndexManager : IndexManager {

    private var policy: IndexPolicy = IndexPolicyAdapter()

    override fun isIndexed(book: Book): Boolean = false

    override fun getIndex(book: Book): Index? = null

    override fun needsReindexing(book: Book): Boolean = true

    override fun scheduleIndexCreation(book: Book) {
        // no-op: no indexing needed for read-only browse API
    }

    override fun installDownloadedIndex(book: Book, tempDest: URI?) {
        // no-op
    }

    override fun deleteIndex(book: Book) {
        // no-op
    }

    override fun closeAllIndexes() {
        // no-op
    }

    override fun getIndexPolicy(): IndexPolicy = policy

    override fun setIndexPolicy(policy: IndexPolicy?) {
        this.policy = policy ?: IndexPolicyAdapter()
    }

    companion object {
        /**
         * Inject this stub into IndexManagerFactory using reflection.
         * Must be called BEFORE any JSword class is loaded (before Books.<clinit>).
         */
        fun install() {
            try {
                val factoryClass = Class.forName("org.crosswire.jsword.index.IndexManagerFactory")
                val instanceField = factoryClass.getDeclaredField("instance")
                instanceField.isAccessible = true
                instanceField.set(null, StubIndexManager())
            } catch (e: Exception) {
                // Log and continue — JSword will fail later with a clearer error
                System.err.println("[StubIndexManager] WARNING: Could not install: ${e.message}")
            }
        }
    }
}
