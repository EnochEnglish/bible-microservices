import java.sql.*;

public class ImportCUV {
    public static void main(String[] args) throws Exception {
        String scriptPath = args[0];
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";
        
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(url, "sa", "");
        
        // Use H2's RUNSCRIPT SQL command with CHARSET=UTF-8
        String sql = "RUNSCRIPT FROM '" + scriptPath.replace("\\", "/") + "' CHARSET 'UTF-8'";
        System.out.println("Executing: " + sql);
        
        Statement stmt = conn.createStatement();
        stmt.execute(sql);
        stmt.close();
        conn.close();
        
        System.out.println("Done!");
    }
}