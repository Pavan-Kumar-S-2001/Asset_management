from flask import current_app
from flask_mail import Message

from ..extensions import mail


def _normalize_email(value):
    if not value:
        return None
    cleaned = value.strip()
    return cleaned or None


def build_asset_name(asset_type, brand_model):
    if asset_type and brand_model:
        return f"{asset_type} - {brand_model}"
    return asset_type or brand_model or "Assigned Asset"


def send_asset_assignment_email(
    *,
    employee_name,
    employee_id,
    employee_email,
    employee_department,
    asset_name,
    asset_type,
    asset_configuration,
    asset_serial_number,
    assigned_date,
    assigned_by,
):
    recipient = _normalize_email(employee_email)
    if not recipient:
        current_app.logger.warning(
            "Skipping asset assignment email because employee '%s' has no email address.",
            employee_name,
        )
        return False

    mail_username = _normalize_email(current_app.config.get("MAIL_USERNAME"))
    mail_password = current_app.config.get("MAIL_PASSWORD")
    if not mail_username or not mail_password:
        current_app.logger.warning(
            "Skipping asset assignment email for '%s' because Outlook SMTP credentials are missing. Set MAIL_USERNAME and MAIL_PASSWORD in the root .env file.",
            recipient,
        )
        return False

    company_name = current_app.config.get("COMPANY_NAME", "DTC INFOTECH PVT LTD")

    message = Message(
        subject="New Asset Assigned",
        recipients=[recipient],
        sender=current_app.config.get("MAIL_DEFAULT_SENDER") or mail_username,
    )
    message.body = (
        f"Hello {employee_name},\n\n"
        "A new asset has been assigned to you.\n\n"
        "Employee Details:\n"
        f"- Employee Name: {employee_name}\n"
        f"- Employee ID: {employee_id or '-'}\n"
        f"- Department: {employee_department or '-'}\n"
        f"- Registered Email: {recipient}\n\n"
        "Asset Details:\n"
        f"- Asset Type: {asset_type or '-'}\n"
        f"- Asset Configuration: {asset_configuration or '-'}\n"
        f"- Asset Name: {asset_name}\n"
        f"- Serial Number: {asset_serial_number or '-'}\n"
        f"- Assigned Date: {assigned_date}\n"
        f"- Assigned By: {assigned_by}\n"
        f"- Company Name: {company_name}\n\n"
        "Please contact admin if you have any questions.\n\n"
        f"Regards,\n{company_name}\n"
    )

    try:
        mail.send(message)
        current_app.logger.info(
            "Asset assignment email sent to %s for asset '%s'.",
            recipient,
            asset_name,
        )
        return True
    except Exception:
        current_app.logger.exception(
            "Failed to send asset assignment email to %s for asset '%s'.",
            recipient,
            asset_name,
        )
        return False
