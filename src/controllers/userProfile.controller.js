import bcrypt from "bcryptjs";
import settingsModel from "../models/settings.model.js"
import userModel from "../models/user.model.js";
import sessionModel from "../models/session.model.js";
import mongoose from "mongoose";


// * FATCH USER
export const fatchUser = async (req, res) => {
    try {
        const userId = req.userId
        const user = await userModel.findById(userId)

        const settings = await settingsModel.findOne({userId: user._id})
        if(!settings){
            return res.status(404).json({ success: false, message: 'Setting Model dont found!'})
        }

        return res.status(200).json({
            success: true,
            user,
            settings
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Server Error at fatchUser route",
        })
    }
}

// TODO: convert it to tranxanction, add middle wares 
// * UPDATE PROFILE
export const updateUser = async (req, res) => {
    try {

        const userId = req.userId
        const settings = await settingsModel.findOne({ userId })
        if(!settings){ return res.status(404).json({ success: false, message: 'settings not found'})}
        
        const updates = req.body
        if(!updates || Object.keys(updates).length === 0){
            return res.status(400).json({ success: false, message: 'no updates'});
        }
        if(Object.keys(updates).length > 50){
            return res.status(400).json({ success: false, message: 'to many updates'});
        }

        for(const [updateKey, updateObj] of Object.entries(updates)){
            if(updateKey === 'profile'){
                await userModel.findByIdAndUpdate(
                    userId, { $set: updateObj }, { new: true }
                )
            }

            if(updateKey === 'reminders'){
                await settingsModel.findByIdAndUpdate(
                    settings._id, { $set: updateObj }, { new: true }
                )
            }

            if(updateKey === 'password'){
                await settingsModel.findByIdAndUpdate(
                    settings._id, { authLoginVerificationByOtp: updateObj.verificationfouse }
                )
            }

            if(updateKey === 'appearance'){
                await settingsModel.findByIdAndUpdate(
                    settings._id, { $set: updateObj }, { new: true }
                )
            }
        }

        return res.status(200).json({
            success: true,
            message: 'update done',
            updateCount: Object.keys(updates).length,
        })

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: "Server Error at UpdateUser route"
        })
    }
}

// * UPDATE PASSWORD
export const updatePassword = async (req, res) => {
    try {
        const { password , newPassword } = req.password
        const userId = req.userId
        const user = await userModel.findById(userId)
        const isValid = bcrypt.compare(user.password, password)
        if(!isValid){
            return res.status(400).json({ success: false, message: "Invalid Password" })
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await userModel.findByIdAndUpdate(userId, { password: hashedPassword })
        return res.status(200).json({
            success: true,
            message: "user password updated"
        })

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: "Server Error at update password route"
        })
    }
}

// * FATCH SESSION
export const sesstions = async (req, res) => {
    try {
        const userId = req.userId
        const divices = await sessionModel.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                }
            },
            {
                $sort: { lastTime : -1 }
            },
            {
                $group: {
                    _id: "$diviceId",  
                    session: { $first: "$$ROOT"}
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$session"
                }
            }
        ])

        return res.status(200).json({ success: true, message: 'all sessions', session: divices })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Server Error at sesstions get route"
        })
    }
}