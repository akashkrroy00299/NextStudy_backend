const escapeHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")

const sendOtpHtml = (username, otp) => {
    const safeUsername = escapeHtml(username)
    const safeOtp = escapeHtml(otp)

   return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body{
                margin:0;
                padding:0;
                background:#f5f7fb;
                font-family:Arial,Helvetica,sans-serif;
            }

            .container{
                max-width:600px;
                margin:40px auto;
                background:#ffffff;
                border-radius:10px;
                overflow:hidden;
                box-shadow:0 5px 20px rgba(0,0,0,.08);
            }

            .header{
                background:#2563eb;
                color:#fff;
                text-align:center;
                padding:30px;
            }

            .content{
                padding:30px;
                color:#333;
                line-height:1.6;
            }

            .otp{
                width:220px;
                margin:30px auto;
                text-align:center;
                font-size:32px;
                font-weight:bold;
                letter-spacing:8px;
                background:#f3f4f6;
                padding:15px;
                border-radius:8px;
                color:#2563eb;
            }

            .footer{
                padding:20px;
                text-align:center;
                color:#888;
                font-size:13px;
                border-top:1px solid #eee;
            }
        </style>
    </head>

    <body>

        <div class="container">

            <div class="header">
                <h1>Email Verification</h1>
            </div>

            <div class="content">

                <p>Hello <b>${safeUsername}</b>,</p>

                <p>
                    Use the OTP below to complete your request.
                </p>

                <div class="otp">
                    ${safeOtp}
                </div>

                <p>
                    This OTP is valid for <b>5 minutes</b>.
                </p>

                <p>
                    If you didn't request this verification, you can safely ignore this email.
                </p>

            </div>

            <div class="footer">
                © 2026 Your App. All rights reserved.
            </div>

        </div>

    </body>
    </html>
    `
}

export default sendOtpHtml