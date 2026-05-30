import java.sql.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/**
 * Import CUV Traditional (cuv_tw) from converted TSV into H2 database.
 * Input: cuv_tw_import.tsv (order, chapter, verse, book_id, text)
 */
public class ImportCUVTW {
    public static void main(String[] args) throws Exception {
        String tsvFile = args.length > 0 ? args[0] : "cuv_tw_import.tsv";
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";

        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(url, "sa", "");
        conn.setAutoCommit(false);
        Statement stmt = conn.createStatement();

        // 1. Clean up existing cuv_tw if any
        ResultSet rs = stmt.executeQuery("SELECT ID FROM TRANSLATIONS WHERE CODE='cuv_tw'");
        if (rs.next()) {
            long oldId = rs.getLong(1);
            System.out.println("Removing existing cuv_tw (ID=" + oldId + ")...");
            stmt.executeUpdate("DELETE FROM VERSES WHERE BOOK_ID IN (SELECT ID FROM BOOKS WHERE TRANSLATION_ID=" + oldId + ")");
            stmt.executeUpdate("DELETE FROM BOOKS WHERE TRANSLATION_ID=" + oldId);
            stmt.executeUpdate("DELETE FROM TRANSLATIONS WHERE ID=" + oldId);
            conn.commit();
        }

        // 2. Insert new translation
        PreparedStatement insTrans = conn.prepareStatement(
            "INSERT INTO TRANSLATIONS (CODE, NAME, LANGUAGE, ABBREVIATION, DESCRIPTION, IS_ACTIVE) " +
            "VALUES ('cuv_tw', 'Chinese Union Version (Traditional)', 'chinese', 'CUV-T', 'Traditional Chinese Union Version', TRUE)",
            Statement.RETURN_GENERATED_KEYS);
        insTrans.executeUpdate();
        ResultSet trs = insTrans.getGeneratedKeys();
        trs.next();
        long transId = trs.getLong(1);
        System.out.println("Created translation cuv_tw ID=" + transId);

        // 3. Get cuv_gb translation for book metadata reference
        rs = stmt.executeQuery("SELECT ID FROM TRANSLATIONS WHERE CODE='cuv_gb'");
        rs.next();
        long gbId = rs.getLong(1);

        // 4. Get book names from cuv_gb
        rs = stmt.executeQuery(
            "SELECT ID, BOOK_ID, NAME, ENGLISH_NAME, OSIS_ID, ORDER_INDEX, CHAPTER_COUNT " +
            "FROM BOOKS WHERE TRANSLATION_ID=" + gbId + " ORDER BY ORDER_INDEX");

        java.util.Map<String, long[]> bookMap = new java.util.LinkedHashMap<>(); // bookId -> [gbBookId, twBookId, chCount]
        java.util.Map<String, String> bookNames = new java.util.LinkedHashMap<>();

        PreparedStatement insBook = conn.prepareStatement(
            "INSERT INTO BOOKS (TRANSLATION_ID, BOOK_ID, NAME, ENGLISH_NAME, OSIS_ID, ORDER_INDEX, CHAPTER_COUNT) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);

        // Build a map of traditional book names from the TSV
        // We need opencc for book names too - read them from the first verse of each book
        java.util.Map<String, String> twBookNames = new java.util.LinkedHashMap<>();
        java.util.Map<String, String> gbBookNames = new java.util.LinkedHashMap<>();

        while (rs.next()) {
            String bookId = rs.getString("BOOK_ID");
            String name = rs.getString("NAME");
            String engName = rs.getString("ENGLISH_NAME");
            String osisId = rs.getString("OSIS_ID");
            int orderIdx = rs.getInt("ORDER_INDEX");
            int chCount = rs.getInt("CHAPTER_COUNT");
            gbBookNames.put(bookId, name);

            // For now, use simplified name (we'll update after reading TSV)
            insBook.setLong(1, transId);
            insBook.setString(2, bookId);
            insBook.setString(3, name); // placeholder
            insBook.setString(4, engName);
            insBook.setString(5, osisId);
            insBook.setInt(6, orderIdx);
            insBook.setInt(7, chCount);
            insBook.executeUpdate();
            ResultSet bkr = insBook.getGeneratedKeys();
            bkr.next();
            long twBookId = bkr.getLong(1);
            bookMap.put(bookId, new long[]{rs.getLong("ID"), twBookId, chCount});
        }
        System.out.println("Inserted " + bookMap.size() + " books.");

        // 5. Import verses from TSV
        PreparedStatement insVerse = conn.prepareStatement(
            "INSERT INTO VERSES (BOOK_ID, CHAPTER, VERSE, TEXT, VERSE_KEY) VALUES (?, ?, ?, ?, ?)");

        // Also need to update book names - we'll convert them using Python opencc
        // For now, just import verses
        int count = 0;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new FileInputStream(tsvFile), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split("\t", 5);
                if (parts.length < 5) continue;

                // int orderIdx = Integer.parseInt(parts[0]);
                int chapter = Integer.parseInt(parts[1]);
                int verse = Integer.parseInt(parts[2]);
                String bookId = parts[3];
                String text = parts[4].replace("\\n", "\n").replace("\\t", "\t").replace("\\\\", "\\");

                long[] bookInfo = bookMap.get(bookId);
                if (bookInfo == null) {
                    System.out.println("WARNING: Unknown book " + bookId);
                    continue;
                }
                long twBookId = bookInfo[1];
                String verseKey = bookId + "." + chapter + "." + verse;

                insVerse.setLong(1, twBookId);
                insVerse.setInt(2, chapter);
                insVerse.setInt(3, verse);
                insVerse.setString(4, text);
                insVerse.setString(5, verseKey);
                insVerse.executeUpdate();
                count++;

                if (count % 5000 == 0) {
                    conn.commit();
                    System.out.println("  " + count + " verses (" + bookId + " " + chapter + ":" + verse + ")");
                }
            }
        }

        // 6. Update book names to traditional using opencc via Python
        System.out.println("Converting book names to traditional...");
        ProcessBuilder pb = new ProcessBuilder("python", "-c",
            "from opencc import OpenCC; import sys; cc=OpenCC('s2t'); " +
            "for line in sys.stdin: sys.stdout.write(cc.convert(line))");
        Process p = pb.start();
        StringBuilder nameInput = new StringBuilder();
        for (String bookId : gbBookNames.keySet()) {
            nameInput.append(gbBookNames.get(bookId)).append("\n");
        }
        try (OutputStreamWriter w = new OutputStreamWriter(p.getOutputStream(), StandardCharsets.UTF_8)) {
            w.write(nameInput.toString());
        }
        BufferedReader pr = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8));
        int bi = 0;
        String[] bookIds = gbBookNames.keySet().toArray(new String[0]);
        String twName;
        PreparedStatement updBook = conn.prepareStatement("UPDATE BOOKS SET NAME=? WHERE TRANSLATION_ID=? AND BOOK_ID=?");
        while ((twName = pr.readLine()) != null && bi < bookIds.length) {
            updBook.setString(1, twName.trim());
            updBook.setLong(2, transId);
            updBook.setString(3, bookIds[bi]);
            updBook.executeUpdate();
            bi++;
        }
        p.waitFor();
        pr.close();
        System.out.println("Updated " + bi + " book names to traditional.");

        conn.commit();
        conn.close();
        System.out.println("\nDone! " + count + " verses imported for cuv_tw.");
    }
}