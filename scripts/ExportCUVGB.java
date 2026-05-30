import java.sql.*;
import java.io.*;

/**
 * Export all cuv_gb verse texts to a tab-separated file for opencc conversion.
 * Format: book_order | chapter | verse | book_id | text
 */
public class ExportCUVGB {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(url, "sa", "");

        // Get cuv_gb translation ID
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT ID FROM TRANSLATIONS WHERE CODE='cuv_gb'");
        rs.next();
        long gbId = rs.getLong(1);

        // Export all books
        rs = stmt.executeQuery(
            "SELECT B.BOOK_ID, B.ORDER_INDEX, B.CHAPTER_COUNT FROM BOOKS B WHERE B.TRANSLATION_ID=" + gbId + " ORDER BY B.ORDER_INDEX");

        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream("cuv_gb_export.tsv"), "UTF-8"));
        int count = 0;
        while (rs.next()) {
            String bookId = rs.getString(1);
            int orderIdx = rs.getInt(2);
            int chCount = rs.getInt(3);

            // Get verses for this book
            PreparedStatement ps = conn.prepareStatement(
                "SELECT CHAPTER, VERSE, TEXT FROM VERSES V " +
                "JOIN BOOKS B ON V.BOOK_ID=B.ID WHERE B.BOOK_ID=? AND B.TRANSLATION_ID=? " +
                "ORDER BY V.CHAPTER, V.VERSE");
            ps.setString(1, bookId);
            ps.setLong(2, gbId);
            ResultSet vr = ps.executeQuery();
            while (vr.next()) {
                int ch = vr.getInt(1);
                int v = vr.getInt(2);
                String text = vr.getString(3);
                // Escape special chars
                text = text.replace("\\", "\\\\").replace("\n", "\\n").replace("\t", "\\t");
                out.println(orderIdx + "\t" + ch + "\t" + v + "\t" + bookId + "\t" + text);
                count++;
            }
            vr.close();
            ps.close();
            if (orderIdx % 10 == 0) System.out.println("  Book " + orderIdx + "/66: " + bookId + " (" + count + " verses)");
        }
        out.close();
        conn.close();
        System.out.println("Exported " + count + " verses to cuv_gb_export.tsv");
    }
}