import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "database.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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
            condition TEXT DEFAULT 'Good',
            status TEXT DEFAULT 'Available'
        )
    """)

    # ---------------- HISTORY ----------------
    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,

            employee_id INTEGER,
            asset_id INTEGER,

            emp_name TEXT,
            emp_id TEXT,
            department TEXT,

            asset_type TEXT,
            brand_model TEXT,
            serial_number TEXT,

            issue_date TEXT NOT NULL,
            return_date TEXT,
            status TEXT NOT NULL,

            remarks TEXT,
            issued_type TEXT
        )
    """)

    # ---------------- RENTALS ----------------
    conn.execute("""
        CREATE TABLE IF NOT EXISTS rentals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            laptop_name TEXT NOT NULL,
            serial_number TEXT UNIQUE NOT NULL,
            configuration TEXT,
            po_date TEXT,
            end_date TEXT,

            status TEXT DEFAULT 'In Stock',
            current_employee_id INTEGER,

            issue_date TEXT,
            return_date TEXT,
            remarks TEXT,

            FOREIGN KEY (current_employee_id) REFERENCES employees(id)
        )
    """)

    conn.commit()
    conn.close()