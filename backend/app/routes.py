from datetime import datetime
from functools import wraps
from io import StringIO
import csv

from flask import Blueprint, Response, jsonify, request, session

from .db import get_db_connection
from .services.notifications import (
    build_asset_name,
    send_asset_assignment_email,
    send_asset_return_email,
)

main = Blueprint("main", __name__)

RENTAL_STATUS_AVAILABLE = "Available"
RENTAL_STATUS_ASSIGNED = "Assigned"
RENTAL_STATUS_RETURNED = "Returned"
RENTAL_AVAILABLE_STATUSES = {RENTAL_STATUS_AVAILABLE, RENTAL_STATUS_RETURNED, "In Stock"}
RENTAL_ASSIGNED_STATUSES = {RENTAL_STATUS_ASSIGNED, "Issued"}


# ================= AUTH =================
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if session.get("user") != "admin":
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)

    return wrapper


def _normalize_rental_status(status):
    value = (status or "").strip()
    if value in RENTAL_ASSIGNED_STATUSES:
        return RENTAL_STATUS_ASSIGNED
    if value in RENTAL_AVAILABLE_STATUSES:
        return RENTAL_STATUS_AVAILABLE if value != RENTAL_STATUS_RETURNED else RENTAL_STATUS_RETURNED
    return value or RENTAL_STATUS_AVAILABLE


def _serialize_rows(rows):
    return [dict(row) for row in rows]


def _build_json_message(*, message, employee_email, mail_result):
    return {
        "message": message,
        "mail_sent": bool(mail_result.get("sent")),
        "mail_recipient": employee_email,
        "mail_error": mail_result.get("error"),
        "mail_error_code": mail_result.get("error_code"),
    }


def _get_employee(conn, employee_id):
    employee = conn.execute(
        """
        SELECT id, emp_name, emp_id, email, department
        FROM employees
        WHERE id=?
        """,
        (employee_id,),
    ).fetchone()
    return employee


def _insert_history_record(
    conn,
    *,
    employee,
    asset_source,
    asset_type,
    brand_model,
    serial_number,
    issue_date,
    remarks,
    issued_type,
    tracking_number="",
    asset_id=None,
    rental_id=None,
):
    cursor = conn.execute(
        """
        INSERT INTO history (
            employee_id,
            asset_id,
            rental_id,
            emp_name,
            emp_id,
            employee_email,
            department,
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            status,
            remarks,
            issued_type,
            asset_source,
            tracking_number
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Issued', ?, ?, ?, ?)
        """,
        (
            employee["id"],
            asset_id,
            rental_id,
            employee["emp_name"],
            employee["emp_id"],
            employee["email"],
            employee["department"],
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            remarks,
            issued_type,
            asset_source,
            tracking_number,
        ),
    )
    return cursor.lastrowid


def _issue_company_asset(conn, *, employee_id, asset_id, remarks, issued_type, tracking_number):
    employee = _get_employee(conn, employee_id)
    if not employee:
        return None, (jsonify({"error": "Employee not found"}), 404)

    asset = conn.execute(
        """
        SELECT id, asset_type, brand_model, serial_number, status
        FROM assets
        WHERE id=?
        """,
        (asset_id,),
    ).fetchone()
    if not asset:
        return None, (jsonify({"error": "Asset not found"}), 404)

    if (asset["status"] or "").strip() == "Issued":
        return None, (jsonify({"error": "Asset already issued"}), 400)

    issued_at = datetime.now()
    assignment_id = _insert_history_record(
        conn,
        employee=employee,
        asset_source="company",
        asset_type=asset["asset_type"],
        brand_model=asset["brand_model"],
        serial_number=asset["serial_number"],
        issue_date=issued_at.isoformat(),
        remarks=remarks,
        issued_type=issued_type,
        tracking_number=tracking_number,
        asset_id=asset["id"],
    )
    conn.execute("UPDATE assets SET status='Issued' WHERE id=?", (asset["id"],))

    return {
        "assignment_id": assignment_id,
        "employee": employee,
        "asset_type": asset["asset_type"],
        "brand_model": asset["brand_model"],
        "asset_name": build_asset_name(asset["asset_type"], asset["brand_model"]),
        "asset_configuration": asset["brand_model"],
        "serial_number": asset["serial_number"],
        "issued_at": issued_at,
        "issued_type": issued_type,
        "tracking_number": tracking_number,
    }, None


def _issue_rental_asset(conn, *, employee_id, rental_id, remarks, issued_type, tracking_number):
    employee = _get_employee(conn, employee_id)
    if not employee:
        return None, (jsonify({"error": "Employee not found"}), 404)

    rental = conn.execute(
        """
        SELECT id, laptop_name, serial_number, configuration, status
        FROM rentals
        WHERE id=?
        """,
        (rental_id,),
    ).fetchone()
    if not rental:
        return None, (jsonify({"error": "Rental asset not found"}), 404)

    normalized_status = _normalize_rental_status(rental["status"])
    if normalized_status == RENTAL_STATUS_ASSIGNED:
        return None, (jsonify({"error": "Rental asset already assigned"}), 400)

    issued_at = datetime.now()
    display_model = rental["laptop_name"] or "Rental Asset"
    assignment_id = _insert_history_record(
        conn,
        employee=employee,
        asset_source="rental",
        asset_type="Rental Asset",
        brand_model=display_model,
        serial_number=rental["serial_number"],
        issue_date=issued_at.isoformat(),
        remarks=remarks,
        issued_type=issued_type,
        tracking_number=tracking_number,
        rental_id=rental["id"],
    )
    conn.execute(
        """
        UPDATE rentals
        SET status=?,
            current_employee_id=?,
            issue_date=?,
            return_date=NULL,
            remarks=?
        WHERE id=?
        """,
        (
            RENTAL_STATUS_ASSIGNED,
            employee["id"],
            issued_at.isoformat(),
            remarks,
            rental["id"],
        ),
    )

    return {
        "assignment_id": assignment_id,
        "employee": employee,
        "asset_type": "Rental Asset",
        "brand_model": display_model,
        "asset_name": build_asset_name("Rental Asset", display_model),
        "asset_configuration": rental["configuration"] or display_model,
        "serial_number": rental["serial_number"],
        "issued_at": issued_at,
        "issued_type": issued_type,
        "tracking_number": tracking_number,
    }, None


def _send_assignment_mail(issue_result):
    employee = issue_result["employee"]
    mail_result = send_asset_assignment_email(
        employee_name=employee["emp_name"],
        employee_id=employee["emp_id"],
        employee_email=employee["email"],
        employee_department=employee["department"],
        asset_name=issue_result["asset_name"],
        asset_type=issue_result["asset_type"],
        asset_configuration=issue_result["asset_configuration"],
        asset_serial_number=issue_result["serial_number"],
        assigned_date=issue_result["issued_at"].strftime("%Y-%m-%d %H:%M:%S"),
        assigned_by=(session.get("user") or "admin").title(),
        issued_type=issue_result["issued_type"],
        tracking_number=issue_result["tracking_number"],
    )
    return _build_json_message(
        message="Asset issued successfully",
        employee_email=employee["email"],
        mail_result=mail_result,
    )


def _get_assignment_with_mail_context(conn, assignment_id):
    assignment = conn.execute(
        """
        SELECT
            h.assignment_id,
            h.asset_id,
            h.rental_id,
            h.employee_id,
            h.emp_name,
            h.emp_id,
            h.employee_email,
            h.department,
            h.asset_type,
            h.brand_model,
            h.serial_number,
            h.issue_date,
            h.return_date,
            h.status,
            h.remarks,
            h.issued_type,
            h.asset_source,
            h.tracking_number,
            COALESCE(e.email, h.employee_email) AS effective_email,
            r.laptop_name AS rental_name,
            r.configuration AS rental_configuration
        FROM history h
        LEFT JOIN employees e ON e.id = h.employee_id
        LEFT JOIN rentals r ON r.id = h.rental_id
        WHERE h.assignment_id=?
        """,
        (assignment_id,),
    ).fetchone()
    return assignment


def _return_assignment(conn, *, assignment_id, remarks):
    assignment = _get_assignment_with_mail_context(conn, assignment_id)
    if not assignment:
        return None, (jsonify({"error": "Invalid assignment"}), 400)

    if assignment["status"] == "Returned":
        return None, (jsonify({"error": "Asset already returned"}), 400)

    returned_at = datetime.now()
    conn.execute(
        """
        UPDATE history
        SET return_date=?, status='Returned', remarks=?
        WHERE assignment_id=?
        """,
        (returned_at.isoformat(), remarks, assignment_id),
    )

    if assignment["asset_source"] == "rental" and assignment["rental_id"]:
        conn.execute(
            """
            UPDATE rentals
            SET status=?,
                current_employee_id=NULL,
                return_date=?,
                remarks=?
            WHERE id=?
            """,
            (
                RENTAL_STATUS_RETURNED,
                returned_at.isoformat(),
                remarks,
                assignment["rental_id"],
            ),
        )
        asset_name = build_asset_name(
            assignment["asset_type"],
            assignment["rental_name"] or assignment["brand_model"],
        )
        asset_configuration = (
            assignment["rental_configuration"]
            or assignment["brand_model"]
            or assignment["rental_name"]
        )
    else:
        if assignment["asset_id"]:
            conn.execute(
                "UPDATE assets SET status='Available' WHERE id=?",
                (assignment["asset_id"],),
            )
        asset_name = build_asset_name(
            assignment["asset_type"],
            assignment["brand_model"],
        )
        asset_configuration = assignment["brand_model"]

    return {
        "assignment": assignment,
        "returned_at": returned_at,
        "asset_name": asset_name,
        "asset_configuration": asset_configuration,
    }, None


def _send_return_mail(return_result):
    assignment = return_result["assignment"]
    mail_result = send_asset_return_email(
        employee_name=assignment["emp_name"],
        employee_id=assignment["emp_id"],
        employee_email=assignment["effective_email"],
        employee_department=assignment["department"],
        asset_name=return_result["asset_name"],
        asset_type=assignment["asset_type"],
        asset_configuration=return_result["asset_configuration"],
        asset_serial_number=assignment["serial_number"] or str(assignment["asset_id"] or assignment["rental_id"] or ""),
        issue_date=(
            datetime.fromisoformat(assignment["issue_date"]).strftime("%Y-%m-%d %H:%M:%S")
            if assignment["issue_date"]
            else None
        ),
        return_date=return_result["returned_at"].strftime("%Y-%m-%d %H:%M:%S"),
        condition_status="Clean and Neat Condition",
        issued_type=assignment["issued_type"],
        tracking_number=assignment["tracking_number"],
    )
    return _build_json_message(
        message="Asset returned successfully",
        employee_email=assignment["effective_email"],
        mail_result=mail_result,
    )


def _csv_value(row, *keys):
    for key in keys:
        if key in row and row[key] is not None:
            value = row[key].strip()
            if value:
                return value
    return ""


def _backfill_legacy_rental_assignments(conn):
    legacy_rows = conn.execute(
        """
        SELECT
            r.id,
            r.laptop_name,
            r.serial_number,
            r.configuration,
            r.current_employee_id,
            r.issue_date,
            r.remarks,
            e.id AS employee_id,
            e.emp_name,
            e.emp_id,
            e.email,
            e.department
        FROM rentals r
        LEFT JOIN employees e ON e.id = r.current_employee_id
        WHERE r.status IN ('Issued', 'Assigned')
          AND NOT EXISTS (
              SELECT 1
              FROM history h
              WHERE h.rental_id = r.id AND h.status = 'Issued'
          )
        """
    ).fetchall()

    changed = False
    for row in legacy_rows:
        employee = {
            "id": row["employee_id"] or row["current_employee_id"],
            "emp_name": row["emp_name"] or "Unknown Employee",
            "emp_id": row["emp_id"] or "",
            "email": row["email"],
            "department": row["department"] or "",
        }
        _insert_history_record(
            conn,
            employee=employee,
            asset_source="rental",
            asset_type="Rental Asset",
            brand_model=row["laptop_name"] or "Rental Asset",
            serial_number=row["serial_number"],
            issue_date=row["issue_date"] or datetime.now().isoformat(),
            remarks=row["remarks"] or "Legacy rental assignment migrated to history",
            issued_type="By Hand",
            tracking_number="",
            rental_id=row["id"],
        )
        changed = True

    if changed:
        conn.commit()


# ================= BASIC ROUTES =================
@main.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Asset Management Backend OK"})


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
    return jsonify(_serialize_rows(rows))


@main.route("/employees", methods=["POST"])
@login_required
def add_employee():
    data = request.json or {}

    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO employees
        (emp_name, emp_id, email, department, phone, join_date)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("emp_name"),
            data.get("emp_id"),
            data.get("email"),
            data.get("department"),
            data.get("phone"),
            data.get("join_date"),
        ),
    )
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
        conn.execute("DELETE FROM employees WHERE id=?", (emp_id,))
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
    conn.execute(
        """
        UPDATE employees
        SET emp_name=?, emp_id=?, department=?, email=?, phone=?
        WHERE id=?
        """,
        (
            data.get("emp_name"),
            data.get("emp_id"),
            data.get("department"),
            data.get("email"),
            data.get("phone"),
            emp_id,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Employee updated successfully"})


@main.route("/employees/<int:emp_id>", methods=["DELETE"])
@login_required
def delete_employee(emp_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM employees WHERE id=?", (emp_id,))
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
    return jsonify(_serialize_rows(rows))


@main.route("/assets", methods=["POST"])
@login_required
def add_asset():
    data = request.json or {}

    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO assets
        (asset_type, brand_model, serial_number, condition, status)
        VALUES (?, ?, ?, ?, 'Available')
        """,
        (
            data.get("asset_type"),
            data.get("brand_model"),
            data.get("serial_number"),
            data.get("condition"),
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Asset added successfully"})


@main.route("/assets/<int:asset_id>", methods=["PUT"])
@login_required
def update_asset(asset_id):
    data = request.json or {}

    conn = get_db_connection()
    conn.execute(
        """
        UPDATE assets
        SET asset_type=?, brand_model=?, serial_number=?, condition=?, status=?
        WHERE id=?
        """,
        (
            data.get("asset_type"),
            data.get("brand_model"),
            data.get("serial_number"),
            data.get("condition"),
            data.get("status"),
            asset_id,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Asset updated successfully"})


@main.route("/assets/<int:asset_id>", methods=["DELETE"])
@login_required
def delete_asset(asset_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM assets WHERE id=?", (asset_id,))
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
        conn.execute("DELETE FROM assets WHERE id=?", (asset_id,))
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
    asset_source = (data.get("asset_source") or "company").strip().lower()
    remarks = (data.get("remarks") or "").strip()
    issued_type = (data.get("issued_type") or "").strip()
    tracking_number = (data.get("tracking_number") or "").strip()

    if not employee_id or not asset_id:
        return jsonify({"error": "Missing data"}), 400
    if not issued_type:
        return jsonify({"error": "Issued Type is required"}), 400

    conn = get_db_connection()

    if asset_source == "rental":
        issue_result, error_response = _issue_rental_asset(
            conn,
            employee_id=employee_id,
            rental_id=asset_id,
            remarks=remarks,
            issued_type=issued_type,
            tracking_number=tracking_number,
        )
    else:
        issue_result, error_response = _issue_company_asset(
            conn,
            employee_id=employee_id,
            asset_id=asset_id,
            remarks=remarks,
            issued_type=issued_type,
            tracking_number=tracking_number,
        )

    if error_response:
        conn.close()
        return error_response

    conn.commit()
    conn.close()

    return jsonify(_send_assignment_mail(issue_result))


# ================= RETURN ASSET =================
@main.route("/return", methods=["POST"])
@login_required
def return_asset():
    data = request.json or {}
    assignment_id = data.get("assignment_id")
    remarks = (data.get("remarks") or "").strip()

    if not assignment_id:
        return jsonify({"error": "Missing assignment_id"}), 400

    conn = get_db_connection()
    return_result, error_response = _return_assignment(
        conn,
        assignment_id=assignment_id,
        remarks=remarks,
    )
    if error_response:
        conn.close()
        return error_response

    conn.commit()
    conn.close()

    return jsonify(_send_return_mail(return_result))


# ================= HISTORY =================
@main.route("/history", methods=["GET"])
@login_required
def list_history():
    conn = get_db_connection()
    _backfill_legacy_rental_assignments(conn)
    rows = conn.execute(
        """
        SELECT
            assignment_id,
            employee_id,
            asset_id,
            rental_id,
            emp_name,
            emp_id,
            employee_email,
            department,
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            return_date,
            status,
            issued_type,
            remarks,
            asset_source,
            tracking_number
        FROM history
        ORDER BY assignment_id DESC
        """
    ).fetchall()
    conn.close()

    return jsonify(_serialize_rows(rows))


@main.route("/history/<int:assignment_id>", methods=["PUT"])
@login_required
def update_history(assignment_id):
    data = request.json or {}

    conn = get_db_connection()
    conn.execute(
        """
        UPDATE history
        SET remarks=?, issued_type=?
        WHERE assignment_id=?
        """,
        (
            data.get("remarks"),
            data.get("issued_type"),
            assignment_id,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "History updated successfully"})


@main.route("/history/<int:assignment_id>", methods=["DELETE"])
@login_required
def delete_history(assignment_id):
    conn = get_db_connection()
    row = conn.execute(
        """
        SELECT asset_id, rental_id, asset_source, status
        FROM history
        WHERE assignment_id=?
        """,
        (assignment_id,),
    ).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Record not found"}), 404

    conn.execute("DELETE FROM history WHERE assignment_id=?", (assignment_id,))

    if row["status"] == "Issued":
        if row["asset_source"] == "rental" and row["rental_id"]:
            conn.execute(
                """
                UPDATE rentals
                SET status=?, current_employee_id=NULL
                WHERE id=?
                """,
                (RENTAL_STATUS_AVAILABLE, row["rental_id"]),
            )
        elif row["asset_id"]:
            conn.execute(
                "UPDATE assets SET status='Available' WHERE id=?",
                (row["asset_id"],),
            )

    conn.commit()
    conn.close()

    return jsonify({"message": "History record deleted"})


# ================= RENTALS =================
@main.route("/rentals", methods=["GET"])
@login_required
def list_rentals():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT
            r.id,
            r.laptop_name,
            r.serial_number,
            r.configuration,
            r.po_date,
            r.end_date,
            CASE
                WHEN r.status IN ('Issued', 'Assigned') THEN 'Assigned'
                WHEN r.status = 'Returned' THEN 'Returned'
                ELSE 'Available'
            END AS status,
            r.current_employee_id,
            r.issue_date,
            r.return_date,
            r.remarks,
            COALESCE(
                e.emp_name,
                (
                    SELECT h.emp_name
                    FROM history h
                    WHERE h.rental_id = r.id AND h.status = 'Issued'
                    ORDER BY h.assignment_id DESC
                    LIMIT 1
                )
            ) AS employee_name,
            COALESCE(
                e.emp_id,
                (
                    SELECT h.emp_id
                    FROM history h
                    WHERE h.rental_id = r.id AND h.status = 'Issued'
                    ORDER BY h.assignment_id DESC
                    LIMIT 1
                )
            ) AS employee_code
        FROM rentals r
        LEFT JOIN employees e ON r.current_employee_id = e.id
        ORDER BY r.id DESC
        """
    ).fetchall()
    conn.close()

    return jsonify(_serialize_rows(rows))


@main.route("/rentals", methods=["POST"])
@login_required
def add_rental():
    data = request.json or {}

    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO rentals
        (laptop_name, serial_number, configuration, po_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("laptop_name"),
            data.get("serial_number"),
            data.get("configuration"),
            data.get("po_date"),
            data.get("end_date"),
            RENTAL_STATUS_AVAILABLE,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Rental asset added"})


@main.route("/rentals/issue", methods=["POST"])
@login_required
def issue_rental():
    data = request.json or {}
    employee_id = data.get("employee_id")
    rental_id = data.get("rental_id")
    remarks = (data.get("remarks") or "").strip()
    issued_type = (data.get("issued_type") or "By Hand").strip()
    tracking_number = (data.get("tracking_number") or "").strip()

    if not employee_id or not rental_id:
        return jsonify({"error": "Missing data"}), 400

    conn = get_db_connection()
    issue_result, error_response = _issue_rental_asset(
        conn,
        employee_id=employee_id,
        rental_id=rental_id,
        remarks=remarks,
        issued_type=issued_type,
        tracking_number=tracking_number,
    )
    if error_response:
        conn.close()
        return error_response

    conn.commit()
    conn.close()

    return jsonify(_send_assignment_mail(issue_result))


@main.route("/rentals/return", methods=["POST"])
@login_required
def return_rental():
    data = request.json or {}
    rental_id = data.get("rental_id")
    if not rental_id:
        return jsonify({"error": "Missing rental_id"}), 400

    conn = get_db_connection()
    _backfill_legacy_rental_assignments(conn)
    assignment = conn.execute(
        """
        SELECT assignment_id
        FROM history
        WHERE rental_id=? AND status='Issued'
        ORDER BY assignment_id DESC
        LIMIT 1
        """,
        (rental_id,),
    ).fetchone()
    conn.close()

    if not assignment:
        return jsonify({"error": "No active issued rental found"}), 400

    conn = get_db_connection()
    return_result, error_response = _return_assignment(
        conn,
        assignment_id=assignment["assignment_id"],
        remarks=(data.get("remarks") or "").strip(),
    )
    if error_response:
        conn.close()
        return error_response

    conn.commit()
    conn.close()

    return jsonify(_send_return_mail(return_result))


@main.route("/rentals/<int:rental_id>", methods=["PUT"])
@login_required
def update_rental(rental_id):
    data = request.json or {}
    normalized_status = _normalize_rental_status(data.get("status"))
    current_employee_id = data.get("current_employee_id")

    if normalized_status != RENTAL_STATUS_ASSIGNED:
        current_employee_id = None

    conn = get_db_connection()
    conn.execute(
        """
        UPDATE rentals
        SET laptop_name=?,
            serial_number=?,
            configuration=?,
            po_date=?,
            end_date=?,
            status=?,
            current_employee_id=?
        WHERE id=?
        """,
        (
            data.get("laptop_name"),
            data.get("serial_number"),
            data.get("configuration"),
            data.get("po_date"),
            data.get("end_date"),
            normalized_status,
            current_employee_id,
            rental_id,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Rental updated"})


@main.route("/rentals/<int:rental_id>", methods=["DELETE"])
@login_required
def delete_rental(rental_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM rentals WHERE id=?", (rental_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Rental deleted"})


@main.route("/import/rentals", methods=["POST"])
@login_required
def import_rentals():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "CSV file is required"}), 400

    content = file.read().decode("utf-8-sig")
    reader = csv.DictReader(StringIO(content))
    rows_added = 0

    conn = get_db_connection()
    for row in reader:
        laptop_name = _csv_value(row, "laptop_name", "Laptop Name", "laptop", "asset_name", "name")
        serial_number = _csv_value(row, "serial_number", "Serial Number", "serial", "serial_no", "serial no")
        configuration = _csv_value(row, "configuration", "Configuration", "config")
        po_date = _csv_value(row, "po_date", "PO Date", "po date")
        end_date = _csv_value(row, "end_date", "End Date", "end date")

        if not laptop_name or not serial_number:
            continue

        conn.execute(
            """
            INSERT INTO rentals (
                laptop_name,
                serial_number,
                configuration,
                po_date,
                end_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(serial_number) DO UPDATE SET
                laptop_name=excluded.laptop_name,
                configuration=excluded.configuration,
                po_date=excluded.po_date,
                end_date=excluded.end_date
            """,
            (
                laptop_name,
                serial_number,
                configuration,
                po_date,
                end_date,
                RENTAL_STATUS_AVAILABLE,
            ),
        )
        rows_added += 1

    conn.commit()
    conn.close()

    return jsonify({"message": "Rental CSV imported successfully", "rows": rows_added})


# ================= EXPORT ISSUED ASSETS =================
@main.route("/export/issued-assets.csv", methods=["GET"])
@login_required
def export_issued_assets_csv():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT
            assignment_id,
            asset_source,
            emp_name,
            emp_id,
            asset_type,
            brand_model,
            serial_number,
            issued_type,
            tracking_number,
            issue_date,
            return_date,
            status
        FROM history
        WHERE status='Issued'
        ORDER BY assignment_id DESC
        """
    ).fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Assignment ID",
            "Asset Source",
            "Employee Name",
            "Employee ID",
            "Asset Type",
            "Asset Name / Model",
            "Serial Number",
            "Issued Type",
            "Tracking Number",
            "Issue Date",
            "Return Date",
            "Status",
        ]
    )

    for row in rows:
        writer.writerow(
            [
                row["assignment_id"],
                row["asset_source"],
                row["emp_name"],
                row["emp_id"],
                row["asset_type"],
                row["brand_model"],
                row["serial_number"],
                row["issued_type"],
                row["tracking_number"],
                row["issue_date"],
                row["return_date"],
                row["status"],
            ]
        )

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=Issued_Assets_List.csv"},
    )


# ================= EXPORT RENTALS =================
@main.route("/export/rentals.csv", methods=["GET"])
@login_required
def export_rentals_csv():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT
            r.id,
            r.laptop_name,
            r.serial_number,
            r.configuration,
            r.po_date,
            r.end_date,
            CASE
                WHEN r.status IN ('Issued', 'Assigned') THEN 'Assigned'
                WHEN r.status = 'Returned' THEN 'Returned'
                ELSE 'Available'
            END AS status,
            COALESCE(
                e.emp_name,
                (
                    SELECT h.emp_name
                    FROM history h
                    WHERE h.rental_id = r.id AND h.status = 'Issued'
                    ORDER BY h.assignment_id DESC
                    LIMIT 1
                )
            ) AS employee_name
        FROM rentals r
        LEFT JOIN employees e ON r.current_employee_id = e.id
        ORDER BY r.id DESC
        """
    ).fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Rental ID",
            "Laptop Name",
            "Serial Number",
            "Configuration",
            "PO Date",
            "End Date",
            "Status",
            "Assigned Employee",
        ]
    )

    for row in rows:
        writer.writerow(
            [
                row["id"],
                row["laptop_name"],
                row["serial_number"],
                row["configuration"],
                row["po_date"],
                row["end_date"],
                row["status"],
                row["employee_name"],
            ]
        )

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=Rental_Asset_List.csv"},
    )


# ================= EXPORT HISTORY =================
@main.route("/export/history.csv", methods=["GET"])
@login_required
def export_history_csv():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT
            assignment_id,
            asset_source,
            emp_name,
            emp_id,
            employee_email,
            department,
            asset_type,
            brand_model,
            serial_number,
            issued_type,
            tracking_number,
            issue_date,
            return_date,
            status,
            remarks
        FROM history
        ORDER BY assignment_id DESC
        """
    ).fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Assignment ID",
            "Asset Source",
            "Employee Name",
            "Employee ID",
            "Employee Email",
            "Department",
            "Asset Type",
            "Asset Name / Model",
            "Serial Number",
            "Issued Type",
            "Tracking Number",
            "Issue Date",
            "Return Date",
            "Status",
            "Remarks",
        ]
    )

    for row in rows:
        writer.writerow(
            [
                row["assignment_id"],
                row["asset_source"],
                row["emp_name"],
                row["emp_id"],
                row["employee_email"],
                row["department"],
                row["asset_type"],
                row["brand_model"],
                row["serial_number"],
                row["issued_type"],
                row["tracking_number"],
                row["issue_date"],
                row["return_date"],
                row["status"],
                row["remarks"],
            ]
        )

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=history_logs.csv"},
    )


# ================= EXPORT EMPLOYEES =================
@main.route("/export/employees.csv", methods=["GET"])
@login_required
def export_employees_csv():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT emp_name, emp_id, email, department, phone, join_date
        FROM employees
        ORDER BY id DESC
        """
    ).fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Employee Name",
            "Employee ID",
            "Email",
            "Department",
            "Phone",
            "Join Date",
        ]
    )

    for row in rows:
        writer.writerow(
            [
                row["emp_name"],
                row["emp_id"],
                row["email"],
                row["department"],
                row["phone"],
                row["join_date"],
            ]
        )

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=Employees_List.csv"},
    )


# ================= EXPORT ASSETS =================
@main.route("/export/assets.csv", methods=["GET"])
@login_required
def export_assets_csv():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT asset_type, brand_model, serial_number, condition, status
        FROM assets
        ORDER BY id DESC
        """
    ).fetchall()
    conn.close()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Asset Type", "Brand Model", "Serial Number", "Condition", "Status"])

    for row in rows:
        writer.writerow(
            [
                row["asset_type"],
                row["brand_model"],
                row["serial_number"],
                row["condition"],
                row["status"],
            ]
        )

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=Assets_List.csv"},
    )


@main.route("/issued-assets", methods=["GET"])
@login_required
def issued_assets():
    conn = get_db_connection()
    _backfill_legacy_rental_assignments(conn)
    rows = conn.execute(
        """
        SELECT
            assignment_id,
            employee_id,
            asset_id,
            rental_id,
            emp_name,
            emp_id,
            department,
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            issued_type,
            remarks,
            asset_source,
            tracking_number
        FROM history
        WHERE status='Issued'
        ORDER BY issue_date DESC
        """
    ).fetchall()
    conn.close()

    return jsonify(_serialize_rows(rows))


@main.route("/returned-assets", methods=["GET"])
@login_required
def returned_assets():
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT
            assignment_id,
            employee_id,
            asset_id,
            rental_id,
            emp_name,
            emp_id,
            department,
            asset_type,
            brand_model,
            serial_number,
            issue_date,
            return_date,
            issued_type,
            remarks,
            asset_source,
            tracking_number
        FROM history
        WHERE status='Returned'
        ORDER BY return_date DESC
        """
    ).fetchall()
    conn.close()

    return jsonify(_serialize_rows(rows))
