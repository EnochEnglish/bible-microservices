import java.sql.*;

public class CheckSchema {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(url, "sa", "");
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SHOW COLUMNS FROM TRANSLATIONS");
        System.out.println("TRANSLATIONS columns:");
        while (rs.next()) System.out.println("  " + rs.getString(1) + " " + rs.getString(2));
        rs = stmt.executeQuery("SHOW COLUMNS FROM BOOKS");
        System.out.println("BOOKS columns:");
        while (rs.next()) System.out.println("  " + rs.getString(1) + " " + rs.getString(2));
        rs = stmt.executeQuery("SHOW COLUMNS FROM VERSES");
        System.out.println("VERSES columns:");
        while (rs.next()) System.out.println("  " + rs.getString(1) + " " + rs.getString(2));
        rs = stmt.executeQuery("SELECT * FROM translations LIMIT 2");
        System.out.println("\nSample translations:");
        while (rs.next()) {
            for (int i = 1; i <= rs.getMetaData().getColumnCount(); i++)
                System.out.print(rs.getString(i) + " | ");
            System.out.println();
        }
        conn.close();
    }
}