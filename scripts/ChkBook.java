import java.sql.*;

public class ChkBook {
    public static void main(String[] a) throws Exception {
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";
        Class.forName("org.h2.Driver");
        Connection c = DriverManager.getConnection(url, "sa", "");
        ResultSet rs = c.createStatement().executeQuery("SELECT * FROM BOOKS WHERE TRANSLATION_ID=11 LIMIT 2");
        var md = rs.getMetaData();
        for (int i = 1; i <= md.getColumnCount(); i++) System.out.print(md.getColumnName(i) + " | ");
        System.out.println();
        while (rs.next()) {
            for (int i = 1; i <= md.getColumnCount(); i++) System.out.print(rs.getString(i) + " | ");
            System.out.println();
        }
        c.close();
    }
}