import java.sql.*;

public class FixCUV {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:h2:file:C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/text-db;MODE=MySQL";
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(url, "sa", "");
        conn.setAutoCommit(false);

        // Find CUV translation_id
        PreparedStatement ps1 = conn.prepareStatement("SELECT id FROM translations WHERE code = ?");
        ps1.setString(1, "cuv_gb");
        ResultSet rs1 = ps1.executeQuery();
        if (!rs1.next()) { System.out.println("CUV not found!"); conn.close(); return; }
        long cuvId = rs1.getLong(1);
        System.out.println("CUV translation_id = " + cuvId);

        // Count
        PreparedStatement psCount = conn.prepareStatement(
            "SELECT COUNT(*) FROM verses v JOIN books b ON v.book_id = b.id WHERE b.translation_id = ?");
        psCount.setLong(1, cuvId);
        ResultSet rsCount = psCount.executeQuery();
        rsCount.next();
        int total = rsCount.getInt(1);
        System.out.println("Total CUV verses: " + total);

        // Select all CUV verses
        PreparedStatement ps2 = conn.prepareStatement(
            "SELECT v.id, v.text FROM verses v JOIN books b ON v.book_id = b.id WHERE b.translation_id = ? ORDER BY v.id");
        ps2.setLong(1, cuvId);
        ResultSet rs = ps2.executeQuery();

        PreparedStatement update = conn.prepareStatement("UPDATE verses SET text = ? WHERE id = ?");

        int fixed = 0, checked = 0;
        while (rs.next()) {
            long id = rs.getLong(1);
            String text = rs.getString(2);
            if (text == null || text.isEmpty()) continue;
            checked++;

            try {
                byte[] latin1 = text.getBytes("ISO-8859-1");
                String fixedText = new String(latin1, "UTF-8");
                if (!fixedText.equals(text)) {
                    update.setString(1, fixedText);
                    update.setLong(2, id);
                    update.executeUpdate();
                    fixed++;
                }
            } catch (Exception e) {}

            if (checked % 5000 == 0) {
                conn.commit();
                System.out.println("  Checked " + checked + "/" + total + ", fixed " + fixed + "...");
            }
        }
        conn.commit();
        rs.close();
        ps2.close();
        update.close();
        conn.close();

        System.out.println("Done! Checked " + checked + " rows, fixed " + fixed);
    }
}