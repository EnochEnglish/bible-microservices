import java.sql.*;
public class CheckCourses {
    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection("jdbc:h2:file:./data/text-db", "SA", "");
        Statement st = conn.createStatement();
        ResultSet rs = st.executeQuery("SELECT id, title, status, domain FROM courses ORDER BY id");
        System.out.println("=== Courses in DB ===");
        while (rs.next()) {
            System.out.println("  ID=" + rs.getLong(1) + " title=" + rs.getString(2) + " status=" + rs.getString(3) + " domain=" + rs.getString(4));
        }
        rs.close();
        
        // Check sections
        rs = st.executeQuery("SELECT id, course_id, title FROM course_sections ORDER BY id");
        System.out.println("\n=== Sections ===");
        while (rs.next()) {
            System.out.println("  ID=" + rs.getLong(1) + " course=" + rs.getLong(2) + " title=" + rs.getString(3));
        }
        rs.close();
        
        // Check lessons
        rs = st.executeQuery("SELECT count(*) FROM course_lessons");
        if (rs.next()) System.out.println("\n=== Lessons count: " + rs.getInt(1) + " ===");
        rs.close();
        
        st.close();
        conn.close();
    }
}
