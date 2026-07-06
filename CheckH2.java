import java.sql.*;
public class CheckH2 {
    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection("jdbc:h2:file:./data/text-db", "SA", "");
        DatabaseMetaData md = conn.getMetaData();
        Statement st = conn.createStatement();
        // Check constraints on users table
        try {
            ResultSet crs = st.executeQuery("SELECT CONSTRAINT_NAME, CHECK_CLAUSE FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE TABLE_NAME='USERS'");
            System.out.println("=== CHECK Constraints on USERS ===");
            while (crs.next()) {
                System.out.println("  " + crs.getString(1) + ": " + crs.getString(2));
            }
            crs.close();
        } catch (Exception e) {
            System.out.println("Check query failed: " + e.getMessage());
        }
        // Current roles
        try {
            ResultSet trs = st.executeQuery("SELECT DISTINCT role FROM users");
            System.out.println("=== Current Roles ===");
            while (trs.next()) { System.out.println("  " + trs.getString(1)); }
            trs.close();
        } catch (Exception e) {
            System.out.println("Role query failed: " + e.getMessage());
        }
        // Drop the check constraint if it exists
        try {
            st.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS CONSTRAINT_4D");
            System.out.println("Dropped CONSTRAINT_4D");
        } catch (Exception e) {
            System.out.println("Drop constraint failed: " + e.getMessage());
        }
        st.close();
        conn.close();
    }
}
