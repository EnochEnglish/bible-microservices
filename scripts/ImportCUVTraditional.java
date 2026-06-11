import java.sql.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/**
 * Generate CUV Traditional (cuv_tw) by converting cuv_gb via API + JDBC direct insert.
 */
public class ImportCUVTraditional {
    static final String DB_URL = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";
    static final String API_BASE = "http://localhost:8080/api/v1/bible";

    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(DB_URL, "sa", "");
        conn.setAutoCommit(false);

        // 1. Check if cuv_tw already exists
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT ID FROM TRANSLATIONS WHERE CODE='cuv_tw'");
        if (rs.next()) {
            long oldId = rs.getLong(1);
            System.out.println("Removing existing cuv_tw (ID=" + oldId + ")...");
            stmt.execute("DELETE FROM VERSES WHERE BOOK_ID IN (SELECT ID FROM BOOKS WHERE TRANSLATION_ID=" + oldId + ")");
            stmt.execute("DELETE FROM BOOKS WHERE TRANSLATION_ID=" + oldId);
            stmt.execute("DELETE FROM TRANSLATIONS WHERE ID=" + oldId);
            conn.commit();
        }

        // 2. Insert new translation
        stmt.execute("INSERT INTO TRANSLATIONS (CODE, NAME, LANGUAGE, ABBREVIATION, DESCRIPTION, IS_ACTIVE) " +
            "VALUES ('cuv_tw', 'Chinese Union Version (Traditional)', 'chinese', 'CUV-T', 'ShortNameLower traditional', TRUE)");
        rs = stmt.executeQuery("CALL IDENTITY()");
        rs.next();
        long transId = rs.getLong(1);
        System.out.println("Created translation cuv_tw with ID=" + transId);

        // 3. Get CUV Simplified translation ID for book lookup
        rs = stmt.executeQuery("SELECT ID, CODE FROM TRANSLATIONS WHERE CODE='cuv_gb'");
        rs.next();
        long gbId = rs.getLong(1);

        // 4. Get all cuv_gb books
        rs = stmt.executeQuery(
            "SELECT B.ID, B.BOOK_ID, B.NAME, B.ORDER_INDEX, B.CHAPTER_COUNT " +
            "FROM BOOKS B WHERE B.TRANSLATION_ID=" + gbId + " ORDER BY B.ORDER_INDEX");
        PreparedStatement insBook = conn.prepareStatement(
            "INSERT INTO BOOKS (TRANSLATION_ID, BOOK_ID, NAME, ENGLISH_NAME, OSIS_ID, ORDER_INDEX, CHAPTER_COUNT) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
        PreparedStatement insVerse = conn.prepareStatement(
            "INSERT INTO VERSES (BOOK_ID, CHAPTER, VERSE, TEXT, VERSE_KEY) VALUES (?, ?, ?, ?, ?)");

        int totalVerses = 0, bookCount = 0;
        while (rs.next()) {
            long gbBookId = rs.getLong(1);
            String bookId = rs.getString(2);
            String bookName = rs.getString(3);
            int orderIdx = rs.getInt(4);
            int chapterCount = rs.getInt(5);

            // Convert book name to traditional
            String twName = openccConvert(bookName);

            // Insert book
            insBook.setLong(1, transId);
            insBook.setString(2, bookId);
            insBook.setString(3, twName);
            insBook.setString(4, bookName); // english_name stays the same
            insBook.setString(5, bookId);   // osis_id
            insBook.setInt(6, orderIdx);
            insBook.setInt(7, chapterCount);
            insBook.executeUpdate();
            ResultSet bkr = insBook.getGeneratedKeys();
            bkr.next();
            long twBookId = bkr.getLong(1);

            // Get each chapter from cuv_gb via API and insert converted verses
            String chapterUrl = API_BASE + "/cuv_gb/" + bookId + "/";
            for (int ch = 1; ch <= chapterCount; ch++) {
                String resp = httpGet(chapterUrl + ch);
                // Parse JSON manually (simple approach)
                // Extract verse objects: "verse":N,"text":"..." 
                int verseStart = 0;
                while ((verseStart = resp.indexOf("\"verse\":", verseStart)) >= 0) {
                    int vNumEnd = resp.indexOf(",", verseStart);
                    String vNumStr = resp.substring(verseStart + 8, vNumEnd).trim();
                    int verseNum = Integer.parseInt(vNumStr);

                    int textStart = resp.indexOf("\"text\":\"", vNumEnd);
                    if (textStart < 0) break;
                    textStart += 8;
                    int textEnd = resp.indexOf("\"", textStart);
                    // Handle escaped quotes in text
                    while (textEnd > textStart && resp.charAt(textEnd - 1) == '\\') {
                        textEnd = resp.indexOf("\"", textEnd + 1);
                    }
                    String text = resp.substring(textStart, textEnd);
                    text = text.replace("\\\"", "\"").replace("\\n", "\n");

                    // Convert to traditional
                    String twText = openccConvert(text);
                    String verseKey = bookId + "." + ch + "." + verseNum;

                    insVerse.setLong(1, twBookId);
                    insVerse.setInt(2, ch);
                    insVerse.setInt(3, verseNum);
                    insVerse.setString(4, twText);
                    insVerse.setString(5, verseKey);
                    insVerse.executeUpdate();
                    totalVerses++;

                    verseStart = textEnd + 1;
                }
            }
            bookCount++;
            if (bookCount % 10 == 0) {
                conn.commit();
                System.out.println("  [" + bookCount + "/66] " + bookId + ": " + twName + " (" + totalVerses + " verses)");
            }
        }

        conn.commit();
        conn.close();
        System.out.println("\nDone! " + bookCount + " books, " + totalVerses + " verses imported.");
    }

    static String httpGet(String url) throws Exception {
        URL u = new URL(url);
        HttpURLConnection c = (HttpURLConnection) u.openConnection();
        c.setRequestMethod("GET");
        c.setConnectTimeout(5000);
        c.setReadTimeout(10000);
        try (BufferedReader r = new BufferedReader(
                new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }

    /** Convert simplified Chinese to traditional via subprocess calling Python opencc */
    static String openccConvert(String text) throws Exception {
        // Write text to temp file, call python, read result
        ProcessBuilder pb = new ProcessBuilder("python", "-c",
            "from opencc import OpenCC; import sys; cc=OpenCC('s2t'); sys.stdout.write(cc.convert(sys.stdin.read()))");
        Process p = pb.start();
        try (OutputStreamWriter w = new OutputStreamWriter(p.getOutputStream(), StandardCharsets.UTF_8)) {
            w.write(text);
        }
        StringBuilder out = new StringBuilder();
        try (BufferedReader r = new BufferedReader(
                new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) out.append(line).append("\n");
        }
        p.waitFor();
        String result = out.toString().trim();
        // Python might add trailing newline
        if (result.endsWith("\n")) result = result.substring(0, result.length() - 1);
        return result.isEmpty() ? text : result; // fallback to original if empty
    }
}