import java.sql.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class ImportCUV2 {
    public static void main(String[] args) throws Exception {
        String sqlFile = args[0];
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";
        
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(url, "sa", "");
        conn.setAutoCommit(false);
        Statement stmt = conn.createStatement();
        
        // Read SQL file with explicit UTF-8
        StringBuilder sb = new StringBuilder();
        int count = 0;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new FileInputStream(sqlFile), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("--")) continue;
                sb.append(line).append("\n");
                
                if (line.endsWith(";")) {
                    String sql = sb.toString().trim();
                    try {
                        stmt.execute(sql);
                        count++;
                        if (count % 20 == 0) {
                            conn.commit();
                            System.out.println("  " + count + " statements...");
                        }
                    } catch (SQLException e) {
                        System.out.println("Error at statement " + count + ": " + e.getMessage().substring(0, Math.min(100, e.getMessage().length())));
                        // Don't abort, continue
                    }
                    sb = new StringBuilder();
                }
            }
        }
        conn.commit();
        stmt.close();
        conn.close();
        
        System.out.println("Done! Executed " + count + " SQL statements");
    }
}