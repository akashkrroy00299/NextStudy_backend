import userModel from "../models/user.model.js"


const ERROR = {
    serverErr: "Server Error in Fatch Dashbord data Route",
    userErr: "User not found!"
}

export const fatchDashbordData =  async(req, res) => {
    try {
        const userId = req.userId
        const user = await userModel.findById(userId)
        if(!user){ return res.status(400).json({ success: false, message: ERROR.userErr })}

        // calulate overall attendance
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, message: ERROR.serverErr })
    }
}