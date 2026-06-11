#!/usr/bin/env python3
"""Fix CUV double-encoding in H2 database."""
import os, sys, subprocess

DB_PATH = r"C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices\data\text-db"
H2_JAR = r"C:\Users\PC\.gradle\wrapper\dists\gradle-8.5-bin\5t9huq95ubn472n8rpzujfbqh\gradle-8.5\lib\h2-2.2.220.jar"
JAVA = r"C:\Users\PC\scoop\apps\openjdk17\current\bin\java.exe"

# This script uses H2's Shell tool to execute SQL directly
# We'll SELECT CUV verses, fix them, and generate UPDATE statements
def main():
    db_path = DB_PATH.replace('\\', '/')
    jdbc_url = f"jdbc:h2:file:{db_path};MODE=MySQL"
    
    print("[1] Dumping CUV verses from H2...")
    
    # Step 1: Export CUV verses to CSV
    export_sql = """
    SELECT v.id, v.text
    FROM verses v
    JOIN books b ON v.book_id = b.id
    JOIN translations t ON b.translation_id = t.id
    WHERE t.code = 'cuv_gb'
    ORDER BY v.id;
    """
    
    temp_sql = os.path.join(os.environ.get('TEMP', '/tmp'), 'fix_cuv_export.sql')
    with open(temp_sql, 'w', encoding='utf-8') as f:
        f.write(export_sql)
    
    temp_csv = os.path.join(os.environ.get('TEMP', '/tmp'), 'cuv_export.csv')
    
    # Use H2 RunScript to export (we'll pipe it through Shell with CSV output)
    # Actually use a Java helper or just use the Shell tool
    export_py = f"""
import java.sql.*;
var conn = DriverManager.getConnection("{jdbc_url}", "sa", "");
var stmt = conn.createStatement();
var rs = stmt.executeQuery("{export_sql.strip().replace('"', '\\"')}");
var pw = new java.io.PrintWriter("{temp_csv.replace('\\', '/')}", "UTF-8");
int count = 0;
while (rs.next()) {{
    long id = rs.getLong(1);
    String text = rs.getString(2);
    // Double-decode: treat Latin-1 bytes → UTF-8 string
    byte[] bytes = text.getBytes("ISO-8859-1");
    String fixed = new String(bytes, "UTF-8");
    pw.println(id + "|" + fixed);
    count++;
    if (count % 10000 == 0) System.out.println("  " + count + " rows...");
}}
pw.close();
rs.close();
stmt.close();
conn.close();
System.out.println("Exported " + count + " rows");
System.out.println("FIXED_COUNT=" + count);
"""
    
    export_file = os.path.join(os.environ.get('TEMP', '/tmp'), 'FixCUVExport.java')
    with open(export_file, 'w', encoding='utf-8') as f:
        f.write(export_py)
    
    print("  Compiling fix tool...")
    # Use jshell instead since Java compile is tricky
    # Actually let's use Python + jpype or just pure Java approach
    print("  Writing Java class...")
    
    java_code = '''
import java.sql.*;
import java.io.*;

public class FixCUV {
    public static void main(String[] args) throws Exception {
        String url = args[0];
        String csvPath = args[1];
        
        Class.forName("org.h2.Driver");
        Connection conn = DriverManager.getConnection(url, "sa", "");
        Statement stmt = conn.createStatement();
        
        String sql = "SELECT v.id, v.text FROM verses v JOIN books b ON v.book_id = b.id JOIN translations t ON b.translation_id = t.id WHERE t.code = 'cuv_gb' ORDER BY v.id";
        ResultSet rs = stmt.executeQuery(sql);
        
        PrintWriter pw = new PrintWriter(new OutputStreamWriter(new FileOutputStream(csvPath), "UTF-8"));
        
        int count = 0;
        int fixedCount = 0;
        boolean needsFix = false;
        
        while (rs.next()) {
            long id = rs.getLong(1);
            String text = rs.getString(2);
            count++;
            
            // Check if text needs fixing - try double-decode
            String fixed = text;
            try {
                byte[] bytes = text.getBytes("ISO-8859-1");
                fixed = new String(bytes, "UTF-8");
                // Only count as fixed if it actually changed and is valid
                if (!fixed.equals(text) && fixed.length() > 0) {
                    needsFix = true;
                    fixedCount++;
                }
            } catch (Exception e) {
                fixed = text;
            }
            
            // Always write id|text (original if no fix needed)
            pw.println(id + "|" + text);
            
            if (count % 10000 == 0) {
                System.out.println("  Read " + count + " rows...");
            }
        }
        pw.close();
        rs.close();
        stmt.close();
        conn.close();
        
        System.out.println("Total rows: " + count);
        System.out.println("Needs fix: " + needsFix);
        System.out.println("Fixed count: " + fixedCount);
        System.out.println("CSV: " + csvPath);
    }
}
'''
    
    java_file = os.path.join(os.environ.get('TEMP', '/tmp'), 'FixCUV.java')
    with open(java_file, 'w', encoding='utf-8') as f:
        f.write(java_code)
    
    # Compile
    cp = H2_JAR
    compile_cmd = f'''"{JAVA.replace('.exe', 'c.exe')}" -cp "{cp}" "{java_file}" -d "{os.environ.get('TEMP', '/tmp')}"'''
    result = subprocess.run(compile_cmd, shell=True, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"Compile error: {result.stderr}")
        # Fallback: try javac.exe from PATH
        try:
            result2 = subprocess.run(
                ["javac", "-cp", H2_JAR, "-d", os.path.join(os.environ.get('TEMP', '/tmp')), java_file],
                capture_output=True, text=True, timeout=30
            )
            if result2.returncode != 0:
                print(f"javac error: {result2.stderr}")
                sys.exit(1)
        except FileNotFoundError:
            print("javac not found, trying to compile with Java 17 toolchain...")
            sys.exit(1)
    
    # Run the fix tool
    csv_out = os.path.join(os.environ.get('TEMP', '/tmp'), 'cuv_texts.csv')
    class_dir = os.path.join(os.environ.get('TEMP', '/tmp'))
    run_cmd = [JAVA, "-cp", f"{class_dir};{H2_JAR}", "FixCUV", jdbc_url, csv_out]
    
    print("\n[2] Running fix tool...")
    result = subprocess.run(run_cmd, capture_output=True, text=True, timeout=120)
    print(result.stdout)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)
    
    # Step 2: Generate UPDATE statements
    print("\n[3] Generating UPDATE statements...")
    updates = []
    with open(csv_out, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if '|' not in line: continue
            parts = line.split('|', 1)
            verse_id = parts[0]
            original = parts[1] if len(parts) > 1 else ""
            
            # Double-decode the text
            try:
                bytes_data = original.encode('iso-8859-1')
                fixed = bytes_data.decode('utf-8')
            except:
                fixed = original
            
            if fixed != original:
                fixed_esc = fixed.replace("'", "''")
                updates.append(f"UPDATE verses SET text = '{fixed_esc}' WHERE id = {verse_id};")
    
    if not updates:
        print("No fixes needed! Double-encoding not detected.")
        sys.exit(0)
    
    print(f"  {len(updates)} rows need fixing")
    
    # Step 3: Execute updates via H2 RunScript (with CHARSET=UTF-8!)
    fix_sql = os.path.join(os.environ.get('TEMP', '/tmp'), 'fix_cuv_updates.sql')
    with open(fix_sql, 'w', encoding='utf-8') as f:
        # Add charset marker
        f.write('-- UTF-8\n')
        # Batch updates
        batch = []
        for u in updates:
            batch.append(u)
            if len(batch) >= 500:
                f.write('\n'.join(batch) + '\n')
                batch = []
        if batch:
            f.write('\n'.join(batch) + '\n')
    
    print(f"\n[4] Applying {len(updates)} fixes to H2...")
    cmd = [JAVA, "-Xmx2g", "-cp", H2_JAR, "org.h2.tools.RunScript",
           "-url", jdbc_url, "-user", "sa", "-password", "",
           "-script", fix_sql, "-charset", "UTF-8"]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    if result.returncode == 0:
        print(f"\n[OK] CUV encoding fixed! {len(updates)} rows updated")
        print(f"\nVerify: curl http://localhost:8080/api/v1/bible/cuv_gb/jhn/3/16")
    else:
        print(f"\n[FAIL] Exit code: {result.returncode}")
        if result.stderr:
            for line in result.stderr.split('\n')[-20:]:
                print(f"  {line}")
        if result.stdout:
            for line in result.stdout.split('\n')[-10:]:
                print(f"  {line}")

if __name__ == "__main__":
    main()