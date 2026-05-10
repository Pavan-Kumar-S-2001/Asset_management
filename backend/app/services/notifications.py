from flask import current_app
from flask_mail import Message
from smtplib import SMTPAuthenticationError

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


def _mail_result(*, sent, error=None, error_code=None):
    return {
        "sent": sent,
        "error": error,
        "error_code": error_code,
    }


def _get_notification_cc_list(recipient):
    configured = current_app.config.get("NOTIFICATION_CC", [])
    recipient_lower = (recipient or "").lower()
    unique_cc = []
    seen = set()

    for value in configured:
        email = _normalize_email(value)
        if not email:
            continue
        email_lower = email.lower()
        if email_lower == recipient_lower or email_lower in seen:
            continue
        unique_cc.append(email)
        seen.add(email_lower)

    return unique_cc


def _send_asset_email(*, recipient, subject, body, log_action, asset_name):
    mail_username = _normalize_email(current_app.config.get("MAIL_USERNAME"))
    mail_password = current_app.config.get("MAIL_PASSWORD")

    if not mail_username or not mail_password:
        error_message = (
            "Outlook SMTP credentials are missing. Set MAIL_USERNAME and "
            "MAIL_PASSWORD in the root .env file."
        )
        current_app.logger.warning(
            "Skipping asset %s email for '%s' because %s",
            log_action,
            recipient,
            error_message,
        )
        return _mail_result(
            sent=False,
            error=error_message,
            error_code="missing-credentials",
        )

    message = Message(
        subject=subject,
        recipients=[recipient],
        cc=_get_notification_cc_list(recipient),
        sender=current_app.config.get("MAIL_DEFAULT_SENDER") or mail_username,
    )
    message.body = body

    try:
        mail.send(message)
        current_app.logger.info(
            "Asset %s email sent to %s for asset '%s'.",
            log_action,
            recipient,
            asset_name,
        )
        return _mail_result(sent=True)
    except SMTPAuthenticationError as exc:
        error_message = (
            "Outlook rejected the SMTP login. Check the mailbox password, "
            "SMTP AUTH permission, and whether the account requires an app password."
        )
        current_app.logger.exception(
            "SMTP authentication failed while sending asset %s email to %s for asset '%s'.",
            log_action,
            recipient,
            asset_name,
        )
        return _mail_result(
            sent=False,
            error=error_message,
            error_code=f"smtp-auth-{exc.smtp_code}",
        )
    except Exception:
        current_app.logger.exception(
            "Failed to send asset %s email to %s for asset '%s'.",
            log_action,
            recipient,
            asset_name,
        )
        return _mail_result(
            sent=False,
            error="The app could not send the email because the mail server returned an error.",
            error_code="smtp-send-failed",
        )


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
        error_message = (
            f"Employee '{employee_name}' does not have a registered email address."
        )
        current_app.logger.warning(error_message)
        return _mail_result(
            sent=False,
            error=error_message,
            error_code="missing-recipient",
        )

    company_name = current_app.config.get("COMPANY_NAME", "DTC INFOTECH PVT LTD")
    body = (
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

    return _send_asset_email(
        recipient=recipient,
        subject="New Asset Assigned",
        body=body,
        log_action="assignment",
        asset_name=asset_name,
    )


def send_asset_return_email(
    *,
    employee_name,
    employee_id,
    employee_email,
    employee_department,
    asset_name,
    asset_type,
    asset_configuration,
    asset_serial_number,
    return_date,
    condition_status="Clean and Neat Condition",
):
    recipient = _normalize_email(employee_email)
    if not recipient:
        error_message = (
            f"Employee '{employee_name}' does not have a registered email address."
        )
        current_app.logger.warning(error_message)
        return _mail_result(
            sent=False,
            error=error_message,
            error_code="missing-recipient",
        )

    company_name = current_app.config.get("COMPANY_NAME", "DTC INFOTECH PVT LTD")
    body = (
        f"Hello {employee_name},\n\n"
        "This email confirms that the assigned asset has been returned successfully.\n\n"
        "Employee Details:\n"
        f"- Employee Name: {employee_name}\n"
        f"- Employee ID: {employee_id or '-'}\n"
        f"- Department: {employee_department or '-'}\n"
        f"- Registered Email: {recipient}\n\n"
        "Returned Asset Details:\n"
        f"- Asset Name: {asset_name}\n"
        f"- Asset Type: {asset_type or '-'}\n"
        f"- Asset Configuration: {asset_configuration or '-'}\n"
        f"- Serial Number: {asset_serial_number or '-'}\n"
        f"- Return Date: {return_date}\n"
        f"- Asset Condition Status: {condition_status}\n\n"
        "Thank you for returning the asset in clean and neat condition.\n\n"
        f"Regards,\n{company_name}\n"
    )

    return _send_asset_email(
        recipient=recipient,
        subject="Asset Return Confirmation",
        body=body,
        log_action="return",
        asset_name=asset_name,
    )
