import crypto from "crypto";

const generateOtp = (length = 6) => {
    let otp = "";

    for (let i = 0; i < length; i++) {
        otp += crypto.randomInt(0, 10);
    }

    return otp;
};

export default generateOtp;