/**
 * Distribution License:
 * JSword is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License, version 2.1 or later
 * as published by the Free Software Foundation. This program is distributed
 * in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * © CrossWire Bible Society, 2005 - 2016
 */
package org.crosswire.jsword.index.lucene;

import java.net.URI;
import org.crosswire.jsword.book.Book;
import org.crosswire.jsword.book.BookException;
import org.crosswire.jsword.index.Index;
import org.crosswire.jsword.index.IndexManager;
import org.crosswire.jsword.index.IndexPolicy;
import org.crosswire.jsword.index.IndexPolicyAdapter;

/**
 * Stub implementation of IndexManager that satisfies JSword's plugin
 * contract without requiring Lucene dependencies.
 * All indexing operations are no-ops — we only need read access to modules.
 */
public class LuceneIndexManager implements IndexManager {

    private IndexPolicy policy = new IndexPolicyAdapter();

    @Override
    public boolean isIndexed(Book book) { return false; }

    @Override
    public Index getIndex(Book book) throws BookException { return null; }

    @Override
    public boolean needsReindexing(Book book) { return false; }

    @Override
    public void scheduleIndexCreation(Book book) { /* no-op */ }

    @Override
    public void installDownloadedIndex(Book book, URI tempDest) { /* no-op */ }

    @Override
    public void deleteIndex(Book book) { /* no-op */ }

    @Override
    public void closeAllIndexes() { /* no-op */ }

    @Override
    public IndexPolicy getIndexPolicy() { return policy; }

    @Override
    public void setIndexPolicy(IndexPolicy policy) {
        this.policy = policy != null ? policy : new IndexPolicyAdapter();
    }
}
