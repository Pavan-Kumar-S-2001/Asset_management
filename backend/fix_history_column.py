import sqlite3

conn = sqlite3.connect("database.db")
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE history ADD COLUMN issued_type TEXT")
    print("✅ Column 'issued_type' added successfully.")
except Exception as e:
    print("⚠️ Column may already exist:", e)

conn.commit()
conn.close()