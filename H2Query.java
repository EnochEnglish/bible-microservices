import java.sql.*;

public class H2Query {
    public static void main(String[] args) throws Exception {
        String dbPath = args[0];
        String sql = args[1];
        Class.forName("org.h2.Driver");
        try (Connection conn = DriverManager.getConnection("jdbc:h2:file:" + dbPath, "sa", "");
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            ResultSetMetaData meta = rs.getMetaData();
            int cols = meta.getColumnCount();
            while (rs.next()) {
                for (int i = 1; i <= cols; i++) {
                    if (i > 1) System.out.print(" | ");
                    System.out.print(meta.getColumnName(i) + "=" + rs.getString(i));
                }
                System.out.println();
            }
        }
    }
}
