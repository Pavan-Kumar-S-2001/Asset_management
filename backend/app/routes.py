from flask import Blueprint, jsonify, request, Response, session
from functools import wraps
from .db import get_db_connection
from datetime import datetime
from io import StringIO
import csv

main = Blueprint("main", __name__)

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if session.get("user") != "admin":
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper

@main.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Asset Management Backend ✅"})


@main.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# This is LOGIN
@main.route("/login", methods=["POST"])
def admin_login():
    data = request.json or {}
    if data.get("username") != "admin" or data.get("password") != "pa1dtc":
        return jsonify({"success": False}), 401

    session["user"] = "admin"
    return jsonify({"success": True})


@main.route("/me", methods=["GET"])
def me():
    if session.get("user") != "admin":
        return jsonify({"logged_in": False}), 401
    return jsonify({"logged_in": True, "user": "admin"})


@main.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


#  EMPLOYEES
@main.route("/employees", methods=["GET"])
@login_required
def list_employees():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM employees ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# SAVE EMPLOYEES
@main.route("/employees", methods=["POST"])
@login_required
def add_employee():
    data = request.json or {}

    emp_name = (data.get("emp_name") or "").strip()
    emp_id = (data.get("emp_id") or "").strip()
    email = (data.get("email") or "").strip()
    department = (data.get("department") or "").strip()
    phone = (data.get("phone") or "").strip()
    join_date = (data.get("join_date") or "").strip()

    if not emp_name or not emp_id:
        return jsonify({"error": "emp_name and emp_id are required"}), 400

    # insert even if duplicate
    force = request.args.get("force") == "1"

    conn = get_db_connection()

    # duplicate check for emp_id
    existing = conn.execute(
        "SELECT id FROM employees WHERE emp_id = ?",
        (emp_id,)
    ).fetchone()

    if existing and not force:
        conn.close()
        return jsonify({"error": "DUPLICATE_EMP_ID"}), 409

    try:
        conn.execute("""
            INSERT INTO employees (emp_name, emp_id, email, department, phone, join_date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (emp_name, emp_id, email, department, phone, join_date))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

    conn.close()
    return jsonify({"message": "Employee saved ✅"}), 201

# ---------------- BULK DELETE EMPLOYEES ----------------
@main.route("/employees/bulk-delete", methods=["POST"])
@login_required
def bulk_delete_employees():
    data = request.json or {}
    ids = data.get("ids", [])

    if not isinstance(ids, list) or not ids:
        return jsonify({"error": "ids list required"}), 400

    # keep only integers
    try:
        ids = [int(x) for x in ids]
    except Exception:
        return jsonify({"error": "Invalid ids"}), 400

    conn = get_db_connection()
    try:
        placeholders = ",".join(["?"] * len(ids))
        conn.execute(f"DELETE FROM employees WHERE id IN ({placeholders})", ids)
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

    conn.close()
    return jsonify({"message": f"Deleted {len(ids)} employees ✅"}), 200


# ---------------- DELETE ALL EMPLOYEES ----------------
@main.route("/employees/delete-all", methods=["DELETE"])
@login_required
def delete_all_employees():
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM employees")
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

    conn.close()
    return jsonify({"message": "All employees deleted ✅"}), 200


# ---------------- DELETE EMPLOYEE ----------------
@main.route("/employees/<int:emp_id>", methods=["DELETE"])
@login_required
def delete_employee(emp_id):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM employees WHERE id = ?", (emp_id,))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

    conn.close()
    return jsonify({"message": "Employee deleted ✅"}), 200


# ---------------- UPDATE EMPLOYEE ----------------
@main.route("/employees/<int:emp_db_id>", methods=["PUT"])
@login_required
def update_employee(emp_db_id):
    data = request.json or {}

    emp_name = (data.get("emp_name") or "").strip()
    emp_id = (data.get("emp_id") or "").strip()
    email = (data.get("email") or "").strip()
    department = (data.get("department") or "").strip()
    phone = (data.get("phone") or "").strip()
    join_date = (data.get("join_date") or "").strip()

    if not emp_name or not emp_id:
        return jsonify({"error": "emp_name and emp_id are required"}), 400

    conn = get_db_connection()

    # ✅ IMPORTANT: Allow duplicates (NO duplicate check)
    try:
        conn.execute("""
            UPDATE employees
            SET emp_name=?,
                emp_id=?,
                email=?,
                department=?,
                phone=?,
                join_date=?
            WHERE id=?
        """, (emp_name, emp_id, email, department, phone, join_date, emp_db_id))

        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

    conn.close()
    return jsonify({"message": "Employee updated ✅"}), 200


# ---------------- ASSETS ----------------
@main.route("/assets", methods=["GET"])
@login_required
def list_assets():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM assets ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@main.route("/assets", methods=["POST"])
@login_required
def create_asset():
    data = request.json or {}

    asset_type = (data.get("asset_type") or "").strip()
    brand_model = (data.get("brand_model") or "").strip()
    serial_number = (data.get("serial_number") or "").strip()
    condition = (data.get("condition") or "Good").strip()

    if not asset_type or not serial_number:
        return jsonify({"error": "Asset Type and Serial Number required"}), 400

    conn = get_db_connection()
    try:
        conn.execute("""
            INSERT INTO assets (asset_type, brand_model, serial_number, condition, status)
            VALUES (?, ?, ?, ?, 'Available')
        """, (asset_type, brand_model, serial_number, condition))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

    conn.close()
    return jsonify({"message": "Asset saved ✅"}), 201


@main.route("/assets/<int:asset_id>", methods=["PUT"])
@login_required
def update_asset(asset_id):
    data = request.json or {}

    conn = get_db_connection()
    conn.execute("""
        UPDATE assets
        SET asset_type=?,
            brand_model=?,
            serial_number=?,
            condition=?
        WHERE id=?
    """, (
        data.get("asset_type"),
        data.get("brand_model"),
        data.get("serial_number"),
        data.get("condition"),
        asset_id
    ))
    conn.commit()
    conn.close()

    return jsonify({"message": "Asset updated ✅"})


@main.route("/assets/<int:asset_id>", methods=["DELETE"])
@login_required
def delete_asset(asset_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM assets WHERE id=?", (asset_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Asset deleted ✅"})


# ---------------- ISSUE / RETURN (COMPANY ASSETS) ----------------
@main.route("/issue", methods=["POST"])
@login_required
def issue_asset():
    data = request.json or {}
    employee_id = data.get("employee_id")
    asset_id = data.get("asset_id")
    remarks = data.get("remarks", "")

    if not employee_id or not asset_id:
        return jsonify({"error": "Missing data"}), 400

    conn = get_db_connection()

    # 🚨 NEW: Prevent issuing already issued asset (BUG FIX)
    asset = conn.execute(
        "SELECT status FROM assets WHERE id=?",
        (asset_id,)
    ).fetchone()

    if not asset:
        conn.close()
        return jsonify({"error": "Asset not found"}), 404

    if asset["status"] == "Issued":
        conn.close()
        return jsonify({"error": "Asset already issued"}), 400

    conn.execute("""
        INSERT INTO history (employee_id, asset_id, issue_date, status, remarks)
        VALUES (?, ?, ?, 'Issued', ?)
    """, (employee_id, asset_id, datetime.now().isoformat(), remarks))

    conn.execute("""
        UPDATE assets SET status='Issued' WHERE id=?
    """, (asset_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Asset issued ✅"})


@main.route("/return", methods=["POST"])
@login_required
def return_asset():
    data = request.json or {}
    assignment_id = data.get("assignment_id")
    remarks = data.get("remarks", "")

    if not assignment_id:
        return jsonify({"error": "Missing assignment_id"}), 400

    conn = get_db_connection()

    row = conn.execute(
        "SELECT asset_id FROM history WHERE assignment_id=?",
        (assignment_id,)
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Invalid assignment"}), 400

    asset_id = row["asset_id"]

    conn.execute("""
        UPDATE history
        SET return_date=?, status='Returned', remarks=?
        WHERE assignment_id=?
    """, (datetime.now().isoformat(), remarks, assignment_id))

    conn.execute("""
        UPDATE assets SET status='Available' WHERE id=?
    """, (asset_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Asset returned ✅"})


# ---------------- HISTORY ----------------
@main.route("/history", methods=["GET"])
@login_required
def list_history():
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT h.assignment_id, h.status, h.issue_date, h.return_date,
               e.emp_name, e.emp_id,
               a.asset_type, a.serial_number
        FROM history h
        JOIN employees e ON h.employee_id = e.id
        JOIN assets a ON h.asset_id = a.id
        ORDER BY h.assignment_id DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ---------------- RENTALS ----------------
@main.route("/rentals", methods=["POST"])
@login_required
def add_rental():
    data = request.json or {}

    laptop_name = (data.get("laptop_name") or "").strip()
    serial_number = (data.get("serial_number") or "").strip()
    configuration = data.get("configuration", "")
    po_date = data.get("po_date", "")
    end_date = data.get("end_date", "")

    if not laptop_name or not serial_number:
        return jsonify({"error": "Laptop name and serial number required"}), 400

    conn = get_db_connection()

    conn.execute("""
        INSERT INTO rentals
        (laptop_name, serial_number, configuration, po_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, 'In Stock')
    """, (laptop_name, serial_number, configuration, po_date, end_date))

    conn.commit()
    conn.close()

    return jsonify({"message": "Rental added ✅"})


@main.route("/rentals", methods=["GET"])
@login_required
def list_rentals():
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT r.*,
               e.emp_name AS employee_name
        FROM rentals r
        LEFT JOIN employees e ON r.current_employee_id = e.id
        ORDER BY r.id DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@main.route("/rentals/issue", methods=["POST"])
@login_required
def issue_rental():
    data = request.json or {}
    rental_id = data.get("rental_id")
    employee_id = data.get("employee_id")
    remarks = data.get("remarks", "")

    if not rental_id or not employee_id:
        return jsonify({"error": "Missing rental_id or employee_id"}), 400

    conn = get_db_connection()

    conn.execute("""
        UPDATE rentals
        SET status='Issued',
            current_employee_id=?,
            issue_date=?,
            remarks=?
        WHERE id=?
    """, (employee_id, datetime.now().isoformat(), remarks, rental_id))

    conn.commit()
    conn.close()

    return jsonify({"message": "Rental issued ✅"})


@main.route("/rentals/return", methods=["POST"])
@login_required
def return_rental():
    data = request.json or {}
    rental_id = data.get("rental_id")
    remarks = data.get("remarks", "")

    if not rental_id:
        return jsonify({"error": "Missing rental_id"}), 400

    conn = get_db_connection()

    conn.execute("""
        UPDATE rentals
        SET status='In Stock',
            current_employee_id=NULL,
            return_date=?,
            remarks=?
        WHERE id=?
    """, (datetime.now().isoformat(), remarks, rental_id))

    conn.commit()
    conn.close()

    return jsonify({"message": "Rental returned ✅"})


@main.route("/rentals/<int:rental_id>", methods=["PUT"])
@login_required
def update_rental(rental_id):
    data = request.json or {}

    conn = get_db_connection()
    conn.execute("""
        UPDATE rentals
        SET laptop_name=?,
            serial_number=?,
            configuration=?,
            po_date=?,
            end_date=?,
            status=?
        WHERE id=?
    """, (
        data.get("laptop_name"),
        data.get("serial_number"),
        data.get("configuration"),
        data.get("po_date"),
        data.get("end_date"),
        data.get("status"),
        rental_id
    ))

    conn.commit()
    conn.close()
    return jsonify({"message": "Rental updated ✅"})


@main.route("/rentals/<int:rental_id>", methods=["DELETE"])
@login_required
def delete_rental(rental_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM rentals WHERE id=?", (rental_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Rental deleted ✅"})


# ---------------- EXPORT ----------------
@main.route("/export/rentals.csv", methods=["GET"])
@login_required
def export_rentals_csv():
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT laptop_name, serial_number, configuration,
               po_date, end_date, status, issue_date, return_date
        FROM rentals
        ORDER BY id DESC
    """).fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Laptop Name",
        "Serial Number",
        "Configuration",
        "PO Date",
        "End Date",
        "Status",
        "Issue Date",
        "Return Date"
    ])

    for r in rows:
        writer.writerow(list(r))

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=rentals.csv"}
    )


@main.route("/export/assets.csv", methods=["GET"])
@login_required
def export_assets_csv():
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT asset_type, brand_model, serial_number, condition, status
        FROM assets
        ORDER BY id DESC
    """).fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Asset Type", "Brand/Model", "Serial Number", "Condition", "Status"])

    for r in rows:
        writer.writerow(list(r))

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=assets.csv"}
    )


@main.route("/export/employees.csv")
@login_required
def export_employees_csv():
    conn = get_db_connection()
    rows = conn.execute("SELECT emp_name, emp_id, department, email, phone FROM employees").fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["Employee Name", "Employee ID", "Department", "Email", "Phone"])

    for r in rows:
        writer.writerow([r["emp_name"], r["emp_id"], r["department"], r["email"], r["phone"]])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=employees.csv"}
    )

# ---------------- RENTALS CSV UPLOAD ----------------
@main.route("/rentals/upload-csv", methods=["POST"])
@login_required
def upload_rentals_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files allowed"}), 400

    stream = StringIO(file.stream.read().decode("utf-8"))
    reader = csv.DictReader(stream)

    required_cols = {
        "laptop_name",
        "serial_number",
        "configuration",
        "po_date",
        "end_date",
    }

    if not required_cols.issubset(reader.fieldnames or []):
        return jsonify({
            "error": "Invalid CSV format",
            "required_columns": list(required_cols)
        }), 400

    conn = get_db_connection()
    inserted = 0
    skipped = 0

    for row in reader:
        laptop_name = (row.get("laptop_name") or "").strip()
        serial_number = (row.get("serial_number") or "").strip()

        if not laptop_name or not serial_number:
            skipped += 1
            continue

        # skip duplicate serials
        exists = conn.execute(
            "SELECT id FROM rentals WHERE serial_number=?",
            (serial_number,)
        ).fetchone()

        if exists:
            skipped += 1
            continue

        conn.execute("""
            INSERT INTO rentals
            (laptop_name, serial_number, configuration, po_date, end_date, status)
            VALUES (?, ?, ?, ?, ?, 'In Stock')
        """, (
            laptop_name,
            serial_number,
            row.get("configuration", ""),
            row.get("po_date", ""),
            row.get("end_date", "")
        ))

        inserted += 1

    conn.commit()
    conn.close()

    return jsonify({
        "inserted": inserted,
        "skipped": skipped
    })
# ---------------- EXPORT ISSUED ASSETS CSV (FIXED BUG) ----------------
@main.route("/export/issued-assets.csv", methods=["GET"])
@login_required
def export_issued_assets_csv():
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT h.assignment_id,
               e.emp_name,
               e.emp_id,
               a.asset_type,
               a.serial_number,
               h.issue_date,
               h.return_date,
               h.status
        FROM history h
        JOIN employees e ON h.employee_id = e.id
        JOIN assets a ON h.asset_id = a.id
        WHERE h.status = 'Issued'
        ORDER BY h.assignment_id DESC
    """).fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Assignment ID",
        "Employee Name",
        "Employee ID",
        "Asset Type",
        "Serial Number",
        "Issue Date",
        "Return Date",
        "Status"
    ])

    for r in rows:
        writer.writerow([
            r["assignment_id"],
            r["emp_name"],
            r["emp_id"],
            r["asset_type"],
            r["serial_number"],
            r["issue_date"],
            r["return_date"],
            r["status"],
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=issued_assets.csv"}
    )