import java.sql.*;

public class FixBookNames {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(url, "sa", "");

        // Get cuv_tw translation ID
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT ID FROM TRANSLATIONS WHERE CODE='cuv_tw'");
        rs.next();
        long twId = rs.getLong(1);
        System.out.println("cuv_tw ID=" + twId);

        // Get all book names from cuv_gb
        rs = stmt.executeQuery("SELECT ID FROM TRANSLATIONS WHERE CODE='cuv_gb'");
        rs.next();
        long gbId = rs.getLong(1);

        rs = stmt.executeQuery(
            "SELECT B.BOOK_ID, B.NAME FROM BOOKS B WHERE B.TRANSLATION_ID=" + gbId + " ORDER BY B.ORDER_INDEX");

        java.util.List<String> bookIds = new java.util.ArrayList<>();
        java.util.List<String> gbNames = new java.util.ArrayList<>();
        while (rs.next()) {
            bookIds.add(rs.getString(1));
            gbNames.add(rs.getString(2));
        }
        System.out.println("Found " + bookIds.size() + " books to convert");

        // Use opencc to convert all at once
        ProcessBuilder pb = new ProcessBuilder("python", "-c",
            "from opencc import OpenCC; import sys; cc=OpenCC('s2t'); [sys.stdout.write(cc.convert(l)+'\\n') for l in sys.stdin]");
        Process p = pb.start();
        StringBuilder input = new StringBuilder();
        for (String n : gbNames) input.append(n).append("\n");
        try (java.io.OutputStreamWriter w = new java.io.OutputStreamWriter(p.getOutputStream(), java.nio.charset.StandardCharsets.UTF_8)) {
            w.write(input.toString());
        }
        java.io.BufferedReader pr = new java.io.BufferedReader(
            new java.io.InputStreamReader(p.getInputStream(), java.nio.charset.StandardCharsets.UTF_8));
        String[] twNames = new String[bookIds.size()];
        for (int i = 0; i < bookIds.size(); i++) {
            twNames[i] = pr.readLine();
            if (twNames[i] != null) twNames[i] = twNames[i].trim();
        }
        p.waitFor();

        // Update DB
        PreparedStatement upd = conn.prepareStatement("UPDATE BOOKS SET NAME=? WHERE TRANSLATION_ID=? AND BOOK_ID=?");
        for (int i = 0; i < bookIds.size(); i++) {
            if (twNames[i] != null && !twNames[i].isEmpty()) {
                upd.setString(1, twNames[i]);
                upd.setLong(2, twId);
                upd.setString(3, bookIds.get(i));
                upd.executeUpdate();
            }
        }
        conn.commit();
        conn.close();
        System.out.println("Updated " + bookIds.size() + " book names.");
    }
}