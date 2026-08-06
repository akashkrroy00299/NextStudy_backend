import transporter from "../lib/mail.js";
import config from "../config/config.js";
import otpHtml from "../templates/sendOtpHtml.js"

const sendOtpMail = async (username, email, otp, subject) => {
    return transporter.sendMail({
        from: config.EMAIL_USER,
        to: email,
        subject,
        html: otpHtml(username, otp)
    })
}

export default sendOtpMail