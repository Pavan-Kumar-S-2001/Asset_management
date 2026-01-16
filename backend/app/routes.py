# from flask import Blueprint, jsonify, request, Response, session
# from functools import wraps
# from .db import get_db_connection
# from datetime import datetime
# from io import StringIO
# import csv

# main = Blueprint("main", __name__)

# # ✅ Login required decorator
# def login_required(fn):
#     @wraps(fn)
#     def wrapper(*args, **kwargs):
#         if session.get("user") != "admin":
#             return jsonify({"error": "Unauthorized"}), 401
#         return fn(*args, **kwargs)
#     return wrapper


# # ---------------- BASIC ----------------
# @main.route("/", methods=["GET"])
# def home():
#     return jsonify({"message": "Asset Management Backend ✅"})


# @main.route("/health", methods=["GET"])
# def health():
#     return jsonify({"status": "ok"})


# # ---------------- LOGIN ----------------
# @main.route("/login", methods=["POST"])
# def admin_login():
#     data = request.json or {}
#     if data.get("username") != "admin" or data.get("password") != "pa1dtc":
#         return jsonify({"success": False}), 401

#     session["user"] = "admin"
#     return jsonify({"success": True})


# @main.route("/me", methods=["GET"])
# def me():
#     if session.get("user") != "admin":
#         return jsonify({"logged_in": False}), 401
#     return jsonify({"logged_in": True, "user": "admin"})


# @main.route("/logout", methods=["POST"])
# def logout():
#     session.clear()
#     return jsonify({"success": True})


# # ---------------- EMPLOYEES ----------------
# @main.route("/employees", methods=["GET"])
# @login_required
# def list_employees():
#     conn = get_db_connection()
#     rows = conn.execute("SELECT * FROM employees ORDER BY id DESC").fetchall()
#     conn.close()
#     return jsonify([dict(r) for r in rows])


# # ---------------- ASSETS ----------------
# @main.route("/assets", methods=["GET"])
# @login_required
# def list_assets():
#     conn = get_db_connection()
#     rows = conn.execute("SELECT * FROM assets ORDER BY id DESC").fetchall()
#     conn.close()
#     return jsonify([dict(r) for r in rows])


# @main.route("/assets", methods=["POST"])
# @login_required
# def create_asset():
#     data = request.json or {}

#     asset_type = (data.get("asset_type") or "").strip()
#     brand_model = (data.get("brand_model") or "").strip()
#     serial_number = (data.get("serial_number") or "").strip()
#     condition = (data.get("condition") or "Good").strip()

#     if not asset_type or not serial_number:
#         return jsonify({"error": "Asset Type and Serial Number required"}), 400

#     conn = get_db_connection()
#     try:
#         conn.execute("""
#             INSERT INTO assets (asset_type, brand_model, serial_number, condition, status)
#             VALUES (?, ?, ?, ?, 'Available')
#         """, (asset_type, brand_model, serial_number, condition))
#         conn.commit()
#     except Exception as e:
#         conn.close()
#         return jsonify({"error": str(e)}), 400

#     conn.close()
#     return jsonify({"message": "Asset saved ✅"}), 201


# @main.route("/assets/<int:asset_id>", methods=["PUT"])
# @login_required
# def update_asset(asset_id):
#     data = request.json or {}

#     conn = get_db_connection()
#     conn.execute("""
#         UPDATE assets
#         SET asset_type=?,
#             brand_model=?,
#             serial_number=?,
#             condition=?
#         WHERE id=?
#     """, (
#         data.get("asset_type"),
#         data.get("brand_model"),
#         data.get("serial_number"),
#         data.get("condition"),
#         asset_id
#     ))
#     conn.commit()
#     conn.close()

#     return jsonify({"message": "Asset updated ✅"})


# @main.route("/assets/<int:asset_id>", methods=["DELETE"])
# @login_required
# def delete_asset(asset_id):
#     conn = get_db_connection()
#     conn.execute("DELETE FROM assets WHERE id=?", (asset_id,))
#     conn.commit()
#     conn.close()
#     return jsonify({"message": "Asset deleted ✅"})


# # ---------------- ISSUE / RETURN (COMPANY ASSETS) ----------------
# @main.route("/issue", methods=["POST"])
# @login_required
# def issue_asset():
#     data = request.json or {}
#     employee_id = data.get("employee_id")
#     asset_id = data.get("asset_id")
#     remarks = data.get("remarks", "")

#     if not employee_id or not asset_id:
#         return jsonify({"error": "Missing data"}), 400

#     conn = get_db_connection()

#     conn.execute("""
#         INSERT INTO history (employee_id, asset_id, issue_date, status, remarks)
#         VALUES (?, ?, ?, 'Issued', ?)
#     """, (employee_id, asset_id, datetime.now().isoformat(), remarks))

#     conn.execute("""
#         UPDATE assets SET status='Issued' WHERE id=?
#     """, (asset_id,))

#     conn.commit()
#     conn.close()

#     return jsonify({"message": "Asset issued ✅"})


# @main.route("/return", methods=["POST"])
# @login_required
# def return_asset():
#     data = request.json or {}
#     assignment_id = data.get("assignment_id")
#     remarks = data.get("remarks", "")

#     if not assignment_id:
#         return jsonify({"error": "Missing assignment_id"}), 400

#     conn = get_db_connection()

#     row = conn.execute(
#         "SELECT asset_id FROM history WHERE assignment_id=?",
#         (assignment_id,)
#     ).fetchone()

#     if not row:
#         conn.close()
#         return jsonify({"error": "Invalid assignment"}), 400

#     asset_id = row["asset_id"]

#     conn.execute("""
#         UPDATE history
#         SET return_date=?, status='Returned', remarks=?
#         WHERE assignment_id=?
#     """, (datetime.now().isoformat(), remarks, assignment_id))

#     conn.execute("""
#         UPDATE assets SET status='Available' WHERE id=?
#     """, (asset_id,))

#     conn.commit()
#     conn.close()

#     return jsonify({"message": "Asset returned ✅"})


# # ---------------- HISTORY ----------------
# @main.route("/history", methods=["GET"])
# @login_required
# def list_history():
#     conn = get_db_connection()
#     rows = conn.execute("""
#         SELECT h.assignment_id, h.status, h.issue_date, h.return_date,
#                e.emp_name, e.emp_id,
#                a.asset_type, a.serial_number
#         FROM history h
#         JOIN employees e ON h.employee_id = e.id
#         JOIN assets a ON h.asset_id = a.id
#         ORDER BY h.assignment_id DESC
#     """).fetchall()
#     conn.close()
#     return jsonify([dict(r) for r in rows])


# # ---------------- RENTALS ----------------
# @main.route("/rentals", methods=["POST"])
# @login_required
# def add_rental():
#     data = request.json or {}

#     laptop_name = (data.get("laptop_name") or "").strip()
#     serial_number = (data.get("serial_number") or "").strip()
#     configuration = data.get("configuration", "")
#     po_date = data.get("po_date", "")
#     end_date = data.get("end_date", "")

#     if not laptop_name or not serial_number:
#         return jsonify({"error": "Laptop name and serial number required"}), 400

#     conn = get_db_connection()

#     conn.execute("""
#         INSERT INTO rentals
#         (laptop_name, serial_number, configuration, po_date, end_date, status)
#         VALUES (?, ?, ?, ?, ?, 'In Stock')
#     """, (laptop_name, serial_number, configuration, po_date, end_date))

#     conn.commit()
#     conn.close()

#     return jsonify({"message": "Rental added ✅"})


# @main.route("/rentals", methods=["GET"])
# @login_required
# def list_rentals():
#     conn = get_db_connection()
#     rows = conn.execute("""
#         SELECT r.*,
#                e.emp_name AS employee_name
#         FROM rentals r
#         LEFT JOIN employees e ON r.current_employee_id = e.id
#         ORDER BY r.id DESC
#     """).fetchall()
#     conn.close()
#     return jsonify([dict(r) for r in rows])


# @main.route("/rentals/issue", methods=["POST"])
# @login_required
# def issue_rental():
#     data = request.json or {}
#     rental_id = data.get("rental_id")
#     employee_id = data.get("employee_id")
#     remarks = data.get("remarks", "")

#     if not rental_id or not employee_id:
#         return jsonify({"error": "Missing rental_id or employee_id"}), 400

#     conn = get_db_connection()

#     conn.execute("""
#         UPDATE rentals
#         SET status='Issued',
#             current_employee_id=?,
#             issue_date=?,
#             remarks=?
#         WHERE id=?
#     """, (employee_id, datetime.now().isoformat(), remarks, rental_id))

#     conn.commit()
#     conn.close()

#     return jsonify({"message": "Rental issued ✅"})


# @main.route("/rentals/return", methods=["POST"])
# @login_required
# def return_rental():
#     data = request.json or {}
#     rental_id = data.get("rental_id")
#     remarks = data.get("remarks", "")

#     if not rental_id:
#         return jsonify({"error": "Missing rental_id"}), 400

#     conn = get_db_connection()

#     conn.execute("""
#         UPDATE rentals
#         SET status='In Stock',
#             current_employee_id=NULL,
#             return_date=?,
#             remarks=?
#         WHERE id=?
#     """, (datetime.now().isoformat(), remarks, rental_id))

#     conn.commit()
#     conn.close()

#     return jsonify({"message": "Rental returned ✅"})


# @main.route("/rentals/<int:rental_id>", methods=["PUT"])
# @login_required
# def update_rental(rental_id):
#     data = request.json or {}

#     conn = get_db_connection()
#     conn.execute("""
#         UPDATE rentals
#         SET laptop_name=?,
#             serial_number=?,
#             configuration=?,
#             po_date=?,
#             end_date=?,
#             status=?
#         WHERE id=?
#     """, (
#         data.get("laptop_name"),
#         data.get("serial_number"),
#         data.get("configuration"),
#         data.get("po_date"),
#         data.get("end_date"),
#         data.get("status"),
#         rental_id
#     ))

#     conn.commit()
#     conn.close()
#     return jsonify({"message": "Rental updated ✅"})


# @main.route("/rentals/<int:rental_id>", methods=["DELETE"])
# @login_required
# def delete_rental(rental_id):
#     conn = get_db_connection()
#     conn.execute("DELETE FROM rentals WHERE id=?", (rental_id,))
#     conn.commit()
#     conn.close()
#     return jsonify({"message": "Rental deleted ✅"})


# # ---------------- EXPORT ----------------
# @main.route("/export/rentals.csv", methods=["GET"])
# @login_required
# def export_rentals_csv():
#     conn = get_db_connection()
#     rows = conn.execute("""
#         SELECT laptop_name, serial_number, configuration,
#                po_date, end_date, status, issue_date, return_date
#         FROM rentals
#         ORDER BY id DESC
#     """).fetchall()
#     conn.close()

#     output = StringIO()
#     writer = csv.writer(output)

#     writer.writerow([
#         "Laptop Name",
#         "Serial Number",
#         "Configuration",
#         "PO Date",
#         "End Date",
#         "Status",
#         "Issue Date",
#         "Return Date"
#     ])

#     for r in rows:
#         writer.writerow(list(r))

#     return Response(
#         output.getvalue(),
#         mimetype="text/csv",
#         headers={"Content-Disposition": "attachment; filename=rentals.csv"}
#     )


# @main.route("/export/assets.csv", methods=["GET"])
# @login_required
# def export_assets_csv():
#     conn = get_db_connection()
#     rows = conn.execute("""
#         SELECT asset_type, brand_model, serial_number, condition, status
#         FROM assets
#         ORDER BY id DESC
#     """).fetchall()
#     conn.close()

#     output = StringIO()
#     writer = csv.writer(output)
#     writer.writerow(["Asset Type", "Brand/Model", "Serial Number", "Condition", "Status"])

#     for r in rows:
#         writer.writerow(list(r))

#     return Response(
#         output.getvalue(),
#         mimetype="text/csv",
#         headers={"Content-Disposition": "attachment; filename=assets.csv"}
#     )

from flask import Blueprint, jsonify, request, Response, session
from functools import wraps
from .db import get_db_connection
from datetime import datetime
from io import StringIO
import csv

main = Blueprint("main", __name__)

# ✅ Login required decorator
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if session.get("user") != "admin":
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ---------------- BASIC ----------------
@main.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Asset Management Backend ✅"})


@main.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ---------------- LOGIN ----------------
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


# ---------------- EMPLOYEES ----------------
@main.route("/employees", methods=["GET"])
@login_required
def list_employees():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM employees ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ✅ FIX ADDED: POST EMPLOYEES (Save Employee)
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

    conn = get_db_connection()
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
