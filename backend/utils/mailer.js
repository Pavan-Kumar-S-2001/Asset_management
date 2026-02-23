import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail", // or outlook / smtp
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password (not normal password)
  },
});

export const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Asset Management" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};