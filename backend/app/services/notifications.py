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

    if body.strip().startswith("<!DOCTYPE html>"):
        message.html = body
    else:
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
    issued_type=None,
    tracking_number=None,
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
    body = f"""
        
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f4f6f9;padding:30px 0;">

<tr>
<td align="center">

<table width="700" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:12px;
overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08);">

<tr>
<td style="background:#0b5ed7;padding:30px;text-align:center;">

<h1 style="color:white;margin:0;font-size:28px;">
DTC INFOTECH PVT LTD
</h1>

<p style="color:#dbe7ff;margin-top:10px;font-size:15px;">
IT Asset Management System
</p>

</td>
</tr>

<tr>
<td style="padding:35px 40px;">

<h2 style="margin:0;color:#222;">
New Asset Assigned
</h2>

<p style="font-size:15px;color:#555;line-height:25px;">
Hello <b>{employee_name}</b>,
<br><br>

A company asset has been successfully assigned to you.
Please find the details below.
</p>

<h3 style="color:#0b5ed7;margin-top:30px;">
Employee Details
</h3>

<table width="100%" cellpadding="10"
style="border-collapse:collapse;font-size:14px;">

<tr style="background:#f8f9fb;">
<td width="35%"><b>Employee Name</b></td>
<td>{employee_name}</td>
</tr>

<tr>
<td><b>Employee ID</b></td>
<td>{employee_id or '-'}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Department</b></td>
<td>{employee_department or '-'}</td>
</tr>

<tr>
<td><b>Email</b></td>
<td>{recipient}</td>
</tr>

</table>

<h3 style="color:#0b5ed7;margin-top:30px;">
Asset Details
</h3>

<table width="100%" cellpadding="10"
style="border-collapse:collapse;font-size:14px;">

<tr style="background:#f8f9fb;">
<td width="35%"><b>Asset Type</b></td>
<td>{asset_type or '-'}</td>
</tr>

<tr>
<td><b>Asset Name</b></td>
<td>{asset_name}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Configuration</b></td>
<td>{asset_configuration or '-'}</td>
</tr>

<tr>
<td><b>Serial Number</b></td>
<td>{asset_serial_number or '-'}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Mode of Issued</b></td>
<td>{issued_type or '-'}</td>
</tr>

<tr>
<td><b>Tracking Number</b></td>
<td>{tracking_number or '-'}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Assigned Date</b></td>
<td>{assigned_date}</td>
</tr>

<tr>
<td><b>Assigned By</b></td>
<td>{assigned_by}</td>
</tr>

</table>

<div style="
margin-top:30px;
background:#f1f7ff;
padding:20px;
border-left:4px solid #0b5ed7;
border-radius:8px;
font-size:14px;
line-height:24px;
color:#444;">

<b>Important Notes:</b>

<ul style="padding-left:18px;">
<li>Please keep the asset secure.</li>
<li>Report any issue immediately to IT department.</li>
<li>Return the asset upon company request.</li>
</ul>

</div>

<hr style="margin:35px 0;border:none;border-top:1px solid #e5e7eb;">

<p style="margin:0;font-size:15px;color:#333;">
Regards,<br>
<b>S Pavan Kumar</b><br>
IT ADMIN
</p>

<p style="font-size:13px;color:#555;line-height:24px;">

<b>DTC Infotech Pvt. Ltd.</b><br>

AI/ML | Data | Cloud | Application Modernisation |
Microsoft Dynamics

<br><br>

📞 +91 6360554225<br>
📧 IT@dtcinfotech.com<br>
🌐 https://dtcinfotech.com

</p>

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>

"""

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
    issue_date=None,
    return_date,
    condition_status="Clean and Neat Condition",
    issued_type=None,
    tracking_number=None,
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
    body = f"""

<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f4f6f9;padding:30px 0;">

<tr>
<td align="center">

<table width="700" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:12px;
overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.08);">

<tr>
<td style="background:#198754;padding:30px;text-align:center;">

<h1 style="color:white;margin:0;font-size:28px;">
DTC INFOTECH PVT LTD
</h1>

<p style="color:#d8ffe7;margin-top:10px;font-size:15px;">
IT Asset Management System
</p>

</td>
</tr>

<tr>
<td style="padding:35px 40px;">

<h2 style="margin:0;color:#222;">
Asset Return Confirmation
</h2>

<p style="font-size:15px;color:#555;line-height:25px;">
Hello <b>{employee_name}</b>,
<br><br>

This email confirms that your assigned company asset has been returned successfully.
</p>

<h3 style="color:#198754;margin-top:30px;">
Employee Details
</h3>

<table width="100%" cellpadding="10"
style="border-collapse:collapse;font-size:14px;">

<tr style="background:#f8f9fb;">
<td width="35%"><b>Employee Name</b></td>
<td>{employee_name}</td>
</tr>

<tr>
<td><b>Employee ID</b></td>
<td>{employee_id or '-'}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Department</b></td>
<td>{employee_department or '-'}</td>
</tr>

<tr>
<td><b>Email</b></td>
<td>{recipient}</td>
</tr>

</table>

<h3 style="color:#198754;margin-top:30px;">
Returned Asset Details
</h3>

<table width="100%" cellpadding="10"
style="border-collapse:collapse;font-size:14px;">

<tr style="background:#f8f9fb;">
<td width="35%"><b>Asset Name</b></td>
<td>{asset_name}</td>
</tr>

<tr>
<td><b>Asset Type</b></td>
<td>{asset_type or '-'}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Configuration</b></td>
<td>{asset_configuration or '-'}</td>
</tr>

<tr>
<td><b>Serial Number</b></td>
<td>{asset_serial_number or '-'}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Issued Date</b></td>
<td>{issue_date or '-'}</td>
</tr>

<tr>
<td><b>Returned Date</b></td>
<td>{return_date}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Mode of Issued</b></td>
<td>{issued_type or '-'}</td>
</tr>

<tr>
<td><b>Tracking Number</b></td>
<td>{tracking_number or '-'}</td>
</tr>

<tr style="background:#f8f9fb;">
<td><b>Asset Condition</b></td>
<td>{condition_status}</td>
</tr>

</table>

<div style="
margin-top:30px;
background:#eefbf3;
padding:20px;
border-left:4px solid #198754;
border-radius:8px;
font-size:14px;
line-height:24px;
color:#444;">

Thank you for returning the asset in good condition.

</div>

<hr style="margin:35px 0;border:none;border-top:1px solid #e5e7eb;">

<p style="margin:0;font-size:15px;color:#333;">
Regards,<br>
<b>S Pavan Kumar</b><br>
IT ADMIN
</p>

<p style="font-size:13px;color:#555;line-height:24px;">

<b>DTC Infotech Pvt. Ltd.</b><br>

AI/ML | Data | Cloud | Application Modernisation |
Microsoft Dynamics

<br><br>

📞 +91 6360554225<br>
📧 IT@dtcinfotech.com<br>
🌐 https://dtcinfotech.com

</p>

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>

"""
    return _send_asset_email(
        recipient=recipient,
        subject="Asset Return Confirmation",
        body=body,
        log_action="return",
        asset_name=asset_name,
    )

def send_email(to_email, subject, body):

    recipient = _normalize_email(to_email)

    if not recipient:
        return {
            "sent": False,
            "error": "Missing recipient email",
        }

    message = Message(
        subject=subject,
        recipients=[recipient],
        cc=_get_notification_cc_list(recipient),
        sender=current_app.config.get("MAIL_DEFAULT_SENDER")
        or current_app.config.get("MAIL_USERNAME"),
    )

    message.html = body

    try:

        mail.send(message)

        current_app.logger.info(
            "Vendor email sent successfully to %s",
            recipient,
        )

        return {
            "sent": True
        }

    except Exception as error:

        current_app.logger.exception(
            "Failed to send vendor email"
        )

        return {
            "sent": False,
            "error": str(error),
        }