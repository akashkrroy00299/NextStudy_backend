import subjectModel from "../models/subjetcs.model.js"
import userModel from "../models/user.model.js"

export const updateSubjetcs = async (req, res) => {
    try {
        const newSubjectsData = req.body.subjects
        if (newSubjectsData.length === 0 || newSubjectsData.length > 50) {
            return res.status(400).json({ success: false, message: "subjects cant be empty" })
        }

        const userId = req.userId
        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }
        const semester = user.semester

        await subjectModel.updateMany(
            { userId, isActive: true },
            { isActive: false, deletedAt: new Date() }
        )

        const newSubjects = await subjectModel.create({
            userId,
            semester,
            subjects: newSubjectsData,
        })

        return res.status(200).json({ success: true, message: "subjects updated" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at update subject API route",
        })
    }
}