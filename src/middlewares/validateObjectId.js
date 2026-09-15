import mongoose from "mongoose";

export const validateObjectId = (paramName = "id") => (req, res, next) => {
  const value = req.params[paramName];
  if (value && !mongoose.isValidObjectId(value)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName}`
    });
  }
  next();
};

export default validateObjectId;