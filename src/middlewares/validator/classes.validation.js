import { z } from "zod"
import mongoose from "mongoose"


const classIdSchema = z.string().refine(
  (val) => val.toLowerCase().startsWith("temp-") || mongoose.Types.ObjectId.isValid(val),
  { message: "_id must be a valid ObjectId or start with temp-" }
)

export const classSchema = z.object({
  _id: classIdSchema,
  subjectId: z.string().uuid("Invalid subjectId"),
  title: z.string().trim().min(1, "Title is required").max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex code like #A1B2C3"),
  notify: z.boolean().default(false),
  day: z.number().int().min(0).max(6),
  start: z.number().int().min(0).max(1439),
  end: z.number().int().min(0).max(1439),
  isActive: z.boolean().optional(),
}).refine((data) => data.end > data.start, {
  message: "End must be after start",
  path: ["end"],
})

export const schema = z.object({
  clses: z.array(classSchema)
    .min(1, "At least one class is required")
    .max(100, "Too many classes in one request"),
})


// * ATTEND - SECTION 01 - UPDATE-CLASS
export const updateClassesValidation = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)

  if (!result.success) {
    console.log(result.error.flatten().fieldErrors)
    return res.status(400).json({
      success: false,
      message: "Bad request",
      errors: result.error.flatten().fieldErrors
    })
  }

  req.body = result.data
  next()
}


// * ATTEND - SECTION 01 - ATTENS-LOG
export const attendanceValidation = (req, res, next) => {
  const schema = z.object({
    subjectId: z.string().trim().uuid(),
    attended: z.boolean()
  })

  const result = schema.safeParse(req.body)
  if (!result.success) {
    console.log(
      "Zod Error Details:",
      result.error.flatten().fieldErrors
    )

    return res.status(400).json({
      success: false,
      message: "Bad request",
      errors: result.error.flatten().fieldErrors,
    })
  }

  req.body = result.data
  next()
}