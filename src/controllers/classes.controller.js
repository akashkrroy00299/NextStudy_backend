import classModel from "../models/class.model.js"

//* Update Timeble
// TODO: frontend send array of class = Classes and array of subjcts

export const updateTimetable = async (req, res) => {
   try {
      const userId = req.userId
      const newData = req.body.classes

      if (!Array.isArray(newData) || newData.length === 0 || newData.length > 100) {
         return res.status(400).json({ message: "Invalid classes array" });
      }

      const oldData = await classModel.find({ userId, isActive: true })

      const oldDataMap = new Map(
         oldData.map(cls => [cls._id.toString(), cls])
      )

      const newDataMap = new Map(
         newData.map(cls => [cls._id.toString(), cls])
      )

      const toCreate = [];
      const toUpdate = [];
      const toDelete = [];

      for (const [id, cls] of newDataMap) {
         if (id.startsWith("temp-")) {
            toCreate.push(cls)
         } else if (oldDataMap.has(id)) {
            toUpdate.push(cls)
         }
      }

      for (const [id, cls] of oldDataMap) {
         if (!newDataMap.has(id)) {
            toDelete.push(cls);
         }
      }

      const classToCreate = await Promise.all(
         toCreate.map(cls =>
            classModel.create({
               userId,
               subjectId: cls.subjectId,
               title: cls.title,
               color: cls.color,
               notify: cls.notify,
               day: cls.day,
               start: cls.start,
               end: cls.end,
            })
         )
      );

      const classToUpdate = await Promise.all(
         toUpdate.map(cls =>
            classModel.findOneAndUpdate(
               { _id: cls._id, userId },
               {
                  $set: {
                     subjectId: cls.subjectId,
                     title: cls.title,
                     color: cls.color,
                     notify: cls.notify,
                     day: cls.day,
                     start: cls.start,
                     end: cls.end,
                  }
               },
               { new: true }
            )
         )
      );

      const classToDelete = await classModel.updateMany(
         { _id: { $in: toDelete.map(cls => cls._id) }, userId },
         { $set: { isActive: false } }
      );

      const classes = await classModel.find({ userId, isActive: true })

      return res.status(200).json({
         success: true,
         data: classes,
      })

   } catch (error) {
      console.log(error)
      return res.status(500).json({
         message: "Error at Update Timetable Endpoint",
         success: false,
      })
   }
}