from flask import Blueprint, jsonify, request, Response, session
from functools import wraps
from datetime import datetime
from io import StringIO
import csv

from .db import get_db_connection
from .services.notifications import build_asset_name, send_asset_assignment_email

main = Blueprint("main", __name__)

# ================= AUTH =================
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if session.get("user") != "admin":
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ================= BASIC ROUTES =================
@main.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Asset Management Backend ✅"})


@main.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ================= ADMIN LOGIN =================
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


# ================= EMPLOYEES =================
@main.route("/employees", methods=["GET"])
@login_required
def list_employees():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM employees ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@main.route("/employees", methods=["POST"])
@login_required
def add_employee():

    data = request.json or {}

    conn = get_db_connection()

    conn.execute("""
        INSERT INTO employees
        (emp_name, emp_id, email, department, phone, join_date)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        data.get("emp_name"),
        data.get("emp_id"),
        data.get("email"),
        data.get("department"),
        data.get("phone"),
        data.get("join_date")
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Employee added successfully"})

@main.route("/employees/bulk-delete", methods=["POST"])
@login_required
def bulk_delete_employees():

    data = request.json or {}
    ids = data.get("ids", [])

    if not ids:
        return jsonify({"error": "No IDs provided"}), 400

    conn = get_db_connection()

    for emp_id in ids:
        conn.execute(
            "DELETE FROM employees WHERE id=?",
            (emp_id,)
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "Employees deleted successfully"})

@main.route("/employees/delete-all", methods=["DELETE"])
@login_required
def delete_all_employees():

    conn = get_db_connection()

    conn.execute("DELETE FROM employees")

    conn.commit()
    conn.close()

    return jsonify({"message": "All employees deleted"})

@main.route("/employees/<int:emp_id>", methods=["PUT"])
@login_required
def update_employee(emp_id):

    data = request.json or {}

    conn = get_db_connection()

    conn.execute("""
        UPDATE employees
        SET emp_name=?, emp_id=?, department=?, email=?, phone=?
        WHERE id=?
    """, (
        data.get("emp_name"),
        data.get("emp_id"),
        data.get("department"),
        data.get("email"),
        data.get("phone"),
        emp_id
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Employee updated successfully"})

@main.route("/employees/<int:emp_id>", methods=["DELETE"])
@login_required
def delete_employee(emp_id):

    conn = get_db_connection()

    conn.execute(
        "DELETE FROM employees WHERE id=?",
        (emp_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Employee deleted successfully"})

# ================= ASSETS =================
@main.route("/assets", methods=["GET"])
@login_required
def list_assets():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM assets ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@main.route("/assets", methods=["POST"])
@login_required
def add_asset():

    data = request.json or {}

    conn = get_db_connection()

    conn.execute("""
        INSERT INTO assets
        (asset_type, brand_model, serial_number, condition, status)
        VALUES (?, ?, ?, ?, 'Available')
    """, (
        data.get("asset_type"),
        data.get("brand_model"),
        data.get("serial_number"),
        data.get("condition")
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Asset added successfully"})

@main.route("/assets/<int:asset_id>", methods=["PUT"])
@login_required
def update_asset(asset_id):

    data = request.json or {}

    conn = get_db_connection()

    conn.execute("""
        UPDATE assets
        SET asset_type=?, brand_model=?, serial_number=?, condition=?, status=?
        WHERE id=?
    """, (
        data.get("asset_type"),
        data.get("brand_model"),
        data.get("serial_number"),
        data.get("condition"),
        data.get("status"),
        asset_id
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Asset updated successfully"})

@main.route("/assets/<int:asset_id>", methods=["DELETE"])
@login_required
def delete_asset(asset_id):

    conn = get_db_connection()

    conn.execute(
        "DELETE FROM assets WHERE id=?",
        (asset_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Asset deleted successfully"})

@main.route("/assets/bulk-delete", methods=["POST"])
@login_required
def bulk_delete_assets():

    data = request.json or {}
    ids = data.get("ids", [])

    if not ids:
        return jsonify({"error": "No IDs provided"}), 400

    conn = get_db_connection()

    for asset_id in ids:
        conn.execute(
            "DELETE FROM assets WHERE id=?",
            (asset_id,)
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "Assets deleted successfully"})

@main.route("/assets/delete-all", methods=["DELETE"])
@login_required
def delete_all_assets():

    conn = get_db_connection()

    conn.execute("DELETE FROM assets")

    conn.commit()
    conn.close()

    return jsonify({"message": "All assets deleted"})

# ================= ISSUE ASSET =================
@main.route("/issue", methods=["POST"])
@login_required
def issue_asset():

    data = request.json or {}

    employee_id = data.get("employee_id")
    asset_id = data.get("asset_id")
    remarks = data.get("remarks", "")
    issued_type = data.get("issued_type", "")

    if not employee_id or not asset_id:
        return jsonify({"error": "Missing data"}), 400

    if not issued_type:
        return jsonify({"error": "Issued Type is required"}), 400

    conn = get_db_connection()

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

    # get employee details
    employee = conn.execute(
        "SELECT emp_name, emp_id, email, department FROM employees WHERE id=?",
        (employee_id,)
    ).fetchone()
    if not employee:
        conn.close()
        return jsonify({"error": "Employee not found"}), 404

    # get asset details
    asset_info = conn.execute(
        "SELECT asset_type, brand_model, serial_number FROM assets WHERE id=?",
        (asset_id,)
    ).fetchone()
    if not asset_info:
        conn.close()
        return jsonify({"error": "Asset details not found"}), 404

    issued_at = datetime.now()
    issue_date = issued_at.isoformat()

    # insert snapshot into history
    conn.execute("""
        INSERT INTO history (
            employee_id,
            asset_id,
            emp_name,
            emp_id,
            department,
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            status,
            remarks,
            issued_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Issued', ?, ?)
    """, (
        employee_id,
        asset_id,
        employee["emp_name"],
        employee["emp_id"],
        employee["department"],
        asset_info["asset_type"],
        asset_info["brand_model"],
        asset_info["serial_number"],
        issue_date,
        remarks,
        issued_type
    ))

    conn.execute(
        "UPDATE assets SET status='Issued' WHERE id=?",
        (asset_id,)
    )

    conn.commit()
    conn.close()

    # Email delivery is non-blocking for the assignment flow by design.
    send_asset_assignment_email(
        employee_name=employee["emp_name"],
        employee_email=employee["email"],
        asset_name=build_asset_name(
            asset_info["asset_type"],
            asset_info["brand_model"],
        ),
        asset_identifier=asset_info["serial_number"] or str(asset_id),
        assigned_date=issued_at.strftime("%Y-%m-%d %H:%M:%S"),
        assigned_by=(session.get("user") or "admin").title(),
    )

    return jsonify({"message": "Asset issued successfully"})

# ================= RETURN ASSET =================

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
        "SELECT asset_id, employee_id FROM history WHERE assignment_id=?",
        (assignment_id,)
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Invalid assignment"}), 400

    asset_id = row["asset_id"]
    employee_id = row["employee_id"]

    conn.execute("""
        UPDATE history
        SET return_date=?, status='Returned', remarks=?
        WHERE assignment_id=?
    """, (datetime.now().isoformat(), remarks, assignment_id))

    if asset_id:
        conn.execute(
            "UPDATE assets SET status='Available' WHERE id=?",
            (asset_id,)
    )

    # conn.execute(
    #     "UPDATE assets SET status='Available' WHERE id=?",
    #     (asset_id,)
    # )

    conn.commit()
    conn.close()
    return jsonify({"message": "Asset returned ✅"})

# ================= HISTORY =================
@main.route("/history", methods=["GET"])
@login_required
def list_history():

    conn = get_db_connection()

    rows = conn.execute("""
        SELECT
            assignment_id,
            emp_name,
            emp_id,
            department,
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            return_date,
            status,
            issued_type,
            remarks
        FROM history
        ORDER BY assignment_id DESC
    """).fetchall()

    conn.close()

    return jsonify([dict(r) for r in rows])


@main.route("/history/<int:assignment_id>", methods=["PUT"])
@login_required
def update_history(assignment_id):

    data = request.json or {}

    conn = get_db_connection()

    conn.execute("""
        UPDATE history
        SET remarks=?, issued_type=?
        WHERE assignment_id=?
    """, (
        data.get("remarks"),
        data.get("issued_type"),
        assignment_id
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "History updated successfully"})


@main.route("/history/<int:assignment_id>", methods=["DELETE"])
@login_required
def delete_history(assignment_id):

    conn = get_db_connection()

    row = conn.execute(
        "SELECT asset_id FROM history WHERE assignment_id=?",
        (assignment_id,)
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Record not found"}), 404

    asset_id = row["asset_id"]

    conn.execute(
        "DELETE FROM history WHERE assignment_id=?",
        (assignment_id,)
    )

    # if asset still exists, mark available
    if asset_id:
        conn.execute(
            "UPDATE assets SET status='Available' WHERE id=?",
            (asset_id,)
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "History record deleted"})

# ================= RENTALS =================

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


# ================= ADD RENTAL =================

@main.route("/rentals", methods=["POST"])
@login_required
def add_rental():

    data = request.json or {}

    laptop_name = data.get("laptop_name")
    serial_number = data.get("serial_number")
    configuration = data.get("configuration")
    po_date = data.get("po_date")
    end_date = data.get("end_date")

    conn = get_db_connection()

    conn.execute("""
        INSERT INTO rentals
        (laptop_name, serial_number, configuration, po_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, 'In Stock')
    """, (
        laptop_name,
        serial_number,
        configuration,
        po_date,
        end_date
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Rental laptop added ✅"})


# ================= ISSUE RENTAL =================

@main.route("/rentals/issue", methods=["POST"])
@login_required
def issue_rental():

    data = request.json or {}

    rental_id = data.get("rental_id")
    employee_id = data.get("employee_id")
    remarks = data.get("remarks")

    conn = get_db_connection()

    conn.execute("""
        UPDATE rentals
        SET status='Issued',
            current_employee_id=?,
            issue_date=?,
            remarks=?
        WHERE id=?
    """, (
        employee_id,
        datetime.now().isoformat(),
        remarks,
        rental_id
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Rental issued ✅"})


# ================= RETURN RENTAL =================

@main.route("/rentals/return", methods=["POST"])
@login_required
def return_rental():

    data = request.json or {}

    rental_id = data.get("rental_id")
    remarks = data.get("remarks")

    conn = get_db_connection()

    conn.execute("""
        UPDATE rentals
        SET status='In Stock',
            current_employee_id=NULL,
            return_date=?,
            remarks=?
        WHERE id=?
    """, (
        datetime.now().isoformat(),
        remarks,
        rental_id
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Rental returned ✅"})


# ================= UPDATE RENTAL =================

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


# ================= DELETE RENTAL =================

@main.route("/rentals/<int:rental_id>", methods=["DELETE"])
@login_required
def delete_rental(rental_id):

    conn = get_db_connection()

    conn.execute(
        "DELETE FROM rentals WHERE id=?",
        (rental_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Rental deleted ✅"})

# ================= EXPORT ISSUED ASSETS =================
@main.route("/export/issued-assets.csv", methods=["GET"])
def export_issued_assets_csv():

    conn = get_db_connection()

    rows = conn.execute("""
        SELECT
            assignment_id,
            emp_name,
            emp_id,
            asset_type,
            serial_number,
            issued_type,
            issue_date,
            return_date,
            status
        FROM history
        WHERE status='Issued'
        ORDER BY assignment_id DESC
    """).fetchall()

    # rows = conn.execute("""
    #     SELECT h.assignment_id,
    #            e.emp_name,
    #            e.emp_id,
    #            a.asset_type,
    #            a.serial_number,
    #            h.issued_type,
    #            h.issue_date,
    #            h.return_date,
    #            h.status
    #     FROM history h
    #     JOIN employees e ON h.employee_id = e.id
    #     JOIN assets a ON h.asset_id = a.id
    #     WHERE h.status='Issued'
    #     ORDER BY h.assignment_id DESC
    # """).fetchall()

    conn.close()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Assignment ID",
        "Employee Name",
        "Employee ID",
        "Asset Type",
        "Serial Number",
        "Issued Type",
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
            r["issued_type"],
            r["issue_date"],
            r["return_date"],
            r["status"]
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition":
            "attachment; filename=Issued_Assets_List.csv"
        }
    )

# ================= EXPORT RENTALS =================
@main.route("/export/rentals.csv", methods=["GET"])
def export_rentals_csv():

    conn = get_db_connection()

    rows = conn.execute("""
        SELECT r.id,
               r.laptop_name,
               r.serial_number,
               r.configuration,
               r.po_date,
               r.end_date,
               r.status,
               e.emp_name
        FROM rentals r
        LEFT JOIN employees e ON r.current_employee_id = e.id
        ORDER BY r.id DESC
    """).fetchall()

    conn.close()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Rental ID",
        "Laptop Name",
        "Serial Number",
        "Configuration",
        "PO Date",
        "End Date",
        "Status",
        "Assigned Employee"
    ])

    for r in rows:
        writer.writerow([
            r["id"],
            r["laptop_name"],
            r["serial_number"],
            r["configuration"],
            r["po_date"],
            r["end_date"],
            r["status"],
            r["emp_name"]
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition":
            "attachment; filename=Rental_Asset_List.csv"
        }
    )

# ================= EXPORT HISTORY =================
@main.route("/export/history.csv", methods=["GET"])
def export_history_csv():

    conn = get_db_connection()

    rows = conn.execute("""
    SELECT
        assignment_id,
        emp_name,
        emp_id,
        asset_type,
        serial_number,
        issued_type,
        issue_date,
        return_date,
        status
    FROM history
    ORDER BY assignment_id DESC
""").fetchall()

    # rows = conn.execute("""
    #     SELECT h.assignment_id,
    #            e.emp_name,
    #            e.emp_id,
    #            a.asset_type,
    #            a.serial_number,
    #            h.issued_type,
    #            h.issue_date,
    #            h.return_date,
    #            h.status
    #     FROM history h
    #     JOIN employees e ON h.employee_id = e.id
    #     JOIN assets a ON h.asset_id = a.id
    #     ORDER BY h.assignment_id DESC
    # """).fetchall()

    conn.close()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Assignment ID",
        "Employee Name",
        "Employee ID",
        "Asset Type",
        "Serial Number",
        "Issued Type",
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
            r["issued_type"],
            r["issue_date"],
            r["return_date"],
            r["status"]
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition":
            "attachment; filename=history_logs.csv"
        }
    )
# ================= EXPORT EMPLOYEES =================
@main.route("/export/employees.csv", methods=["GET"])
def export_employees_csv():

    conn = get_db_connection()

    rows = conn.execute("""
        SELECT emp_name,
               emp_id,
               email,
               department,
               phone,
               join_date
        FROM employees
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Employee Name",
        "Employee ID",
        "Email",
        "Department",
        "Phone",
        "Join Date"
    ])

    for r in rows:
        writer.writerow([
            r["emp_name"],
            r["emp_id"],
            r["email"],
            r["department"],
            r["phone"],
            r["join_date"]
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition":
            "attachment; filename=Employees_List.csv"
        }
    )
# ================= EXPORT ASSETS =================
@main.route("/export/assets.csv", methods=["GET"])
def export_assets_csv():

    conn = get_db_connection()

    rows = conn.execute("""
        SELECT asset_type,
               brand_model,
               serial_number,
               condition,
               status
        FROM assets
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Asset Type",
        "Brand Model",
        "Serial Number",
        "Condition",
        "Status"
    ])

    for r in rows:
        writer.writerow([
            r["asset_type"],
            r["brand_model"],
            r["serial_number"],
            r["condition"],
            r["status"]
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition":
            "attachment; filename=Assets_List.csv"
        }
    )
@main.route("/issued-assets", methods=["GET"])
@login_required
def issued_assets():

    conn = get_db_connection()

    rows = conn.execute("""
        SELECT
            assignment_id,
            emp_name,
            emp_id,
            department,
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            issued_type,
            remarks
        FROM history
        WHERE status='Issued'
        ORDER BY issue_date DESC
    """).fetchall()

    conn.close()

    return jsonify([dict(r) for r in rows])

@main.route("/returned-assets", methods=["GET"])
@login_required
def returned_assets():

    conn = get_db_connection()

    rows = conn.execute("""
        SELECT
            assignment_id,
            emp_name,
            emp_id,
            department,
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            return_date,
            issued_type,
            remarks
        FROM history
        WHERE status='Returned'
        ORDER BY return_date DESC
    """).fetchall()

    conn.close()

    return jsonify([dict(r) for r in rows])
