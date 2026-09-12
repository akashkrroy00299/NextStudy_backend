import mongoose from 'mongoose'
import { z } from 'zod'


const day_enum = z.number().int().min(0).max(6)
const time_regex = /^([01]\d|2[0-3]):([0-5]\d)$/
const time_field = z.string().regex(time_regex, "Time must be in HH:mm 24-hour format")

const subject_create_schema = z.object({
    name: z.string().min(1).max(199),
    color: z.string(),
    target: z.number().optional()
})

export const create_timetable_schema = z.object({
    name: z.string().min(2).max(199),
    startDate: z.date(),
    endDate: z.date().optional(),
    subjects: z.array(subject_create_schema).min(1)
})

const update_timetable_op = z.object({
    type: z.literal('update_timetable'),
    name: z.string().min(2).max(199).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
}).refine(
    (data) => data.name || data.startDate || data.endDate,
    { message: "At least one field (name, startDate, endDate) is required" }
)

const add_subject_op = z.object({
    type: z.literal('add_subject'),
    name: z.string().min(1).max(199),
    color: z.string(),
    target: z.number().optional()
})

const remove_subject_op = z.object({
    type: z.literal('remove_subject'),
    subjectId: z.string().uuid()
})

const update_subject_op = z.object({
    type: z.literal('update_subject'),
    id: z.string().uuid(),
    update: subject_create_schema.partial()
})

const update_op = z.discriminatedUnion('type', [
    update_timetable_op,
    add_subject_op,
    remove_subject_op,
    update_subject_op
])

export const update_timetable_schema = z.object({
    updates: z.array(update_op).min(1)
})

const object_id_schema = z.string().refine(
    (val) => mongoose.isValidObjectId(val),
    { message: "Invalid ObjectId" }
)

const class_fields_schema = z.object({
    day: day_enum,
    subjectId: z.string().uuid(),
    startTime: time_field.optional(),
    endTime: time_field.optional(),
    name: z.string().min(2).max(199).optional(),
    color: z.string().optional(),
})

const add_cls_op = class_fields_schema.extend({
    type: z.literal('add_cls'),
    startTime: time_field,
    endTime: time_field,
    color: z.string(),
}).refine(
    (data) => data.startTime < data.endTime,
    { message: "startTime must be before endTime", path: ["endTime"] }
)

const delete_cls_op = z.object({
    type: z.literal('delete_cls'),
    id: object_id_schema
})

const update_cls_op = z.object({
    type: z.literal('update_cls'),
    id: object_id_schema,
    update: class_fields_schema.partial()
})

const classes_update_op = z.discriminatedUnion('type', [
    add_cls_op,
    delete_cls_op,
    update_cls_op
])

export const update_classes_schema = z.object({
    updates: z.array(classes_update_op).min(1)
})

export const copy_timetable_schema = z.object({
    name: z.string().min(2).max(199).optional(),
    startDate: z.date(),
    endDate: z.date().optional(),
})

export const validator = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
        console.log("Zod Error Details:", result.error.flatten().fieldErrors)
        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        })
    }

    req.body = result.data
    next()
}

export default validator