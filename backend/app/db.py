import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "database.db")


def get_db_connection():
    conn = sqlite3.connect(
        DB_PATH,
        timeout=30,
        check_same_thread=False
    )

    conn.row_factory = sqlite3.Row

    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    return conn


def _ensure_columns(conn, table_name, required_columns):
    existing = {
        row["name"] for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    for column_name, column_sql in required_columns.items():
        if column_name in existing:
            continue
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = get_db_connection()

    # ---------------- EMPLOYEES ----------------
    conn.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emp_name TEXT NOT NULL,
            emp_id TEXT UNIQUE NOT NULL,
            email TEXT,
            department TEXT,
            phone TEXT,
            join_date TEXT
        )
    """)

    # ---------------- ASSETS ----------------
    conn.execute("""
    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_type TEXT NOT NULL,
        brand_model TEXT,
        serial_number TEXT UNIQUE NOT NULL,
        configuration TEXT,
        condition TEXT DEFAULT 'Good',
        status TEXT DEFAULT 'Available'
    )
""")
    
    _ensure_columns(
    conn,
    "assets",
    {
        "configuration": "configuration TEXT",
    },
)

    # ---------------- HISTORY ----------------
    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,

            employee_id INTEGER,
            asset_id INTEGER,
            rental_id INTEGER,

            emp_name TEXT,
            emp_id TEXT,
            employee_email TEXT,
            department TEXT,

            asset_type TEXT,
            brand_model TEXT,
            serial_number TEXT,

            issue_date TEXT NOT NULL,
            return_date TEXT,
            status TEXT NOT NULL,

            remarks TEXT,
            issued_type TEXT,
            asset_source TEXT DEFAULT 'company',
            tracking_number TEXT
        )
    """)

    # ---------------- RENTALS ----------------
    conn.execute("""
    CREATE TABLE IF NOT EXISTS rentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        laptop_name TEXT NOT NULL,
        serial_number TEXT UNIQUE NOT NULL,

        configuration TEXT,

        vendor_name TEXT,
        vendor_email TEXT,

        po_date TEXT,
        end_date TEXT,

        status TEXT DEFAULT 'Available',

        current_employee_id INTEGER,

        issue_date TEXT,
        return_date TEXT,

        remarks TEXT,

        FOREIGN KEY (current_employee_id) REFERENCES employees(id)
    )
""")
    
    _ensure_columns(
    conn,
    "rentals",
    {
        "vendor_name": "vendor_name TEXT",
        "vendor_email": "vendor_email TEXT",
    },
)
