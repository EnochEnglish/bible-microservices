import java.sql.*;

/**
 * Fix cuv_tw book names by copying from cuv_gb.
 */
public class FixTWNames {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL;AUTO_SERVER=TRUE";
        Class.forName("org.h2.Driver");
        // Use AUTO_SERVER to allow concurrent access
        Connection conn = DriverManager.getConnection(url, "sa", "");
        conn.setAutoCommit(false);
        Statement stmt = conn.createStatement();

        // Get IDs
        ResultSet rs = stmt.executeQuery("SELECT ID FROM TRANSLATIONS WHERE CODE='cuv_gb'");
        rs.next();
        long gbId = rs.getLong(1);
        rs = stmt.executeQuery("SELECT ID FROM TRANSLATIONS WHERE CODE='cuv_tw'");
        rs.next();
        long twId = rs.getLong(1);
        System.out.println("gb=" + gbId + " tw=" + twId);

        // Copy names from cuv_gb to cuv_tw
        PreparedStatement upd = conn.prepareStatement(
            "UPDATE BOOKS SET NAME=(SELECT NAME FROM BOOKS B2 WHERE B2.TRANSLATION_ID=? AND B2.BOOK_ID=BOOKS.BOOK_ID) WHERE TRANSLATION_ID=?");
        upd.setLong(1, gbId);
        upd.setLong(2, twId);
        int n = upd.executeUpdate();
        conn.commit();

        // Verify
        rs = stmt.executeQuery("SELECT BOOK_ID, NAME FROM BOOKS WHERE TRANSLATION_ID=" + twId + " ORDER BY ORDER_INDEX LIMIT 5");
        while (rs.next()) {
            System.out.println(rs.getString(1) + ": " + rs.getString(2));
        }
        conn.close();
        System.out.println("Done. Updated " + n + " books.");
    }
}