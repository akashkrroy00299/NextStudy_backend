import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

import classModel from "../models/class.model.js"
import subjectModel from "../models/subjetcs.model.js"

//* SECTION 01 - TIMETABLE

// update route
export const updateTimetable = async (req, res) => {

   const session = await mongoose.startSession()
   try {
      const userId = req.userId
      const { clses } = req.body

      // saving classes

      if (!Array.isArray(clses) || clses.length === 0 || clses.length > 100) {
         return res.status(400).json({ message: "Invalid classes array" });
      }

      session.startTransaction()

      const oldData = await classModel.find({ userId, isActive: true }).session(session)

      const oldDataMap = new Map(
         oldData.map(cls => [cls._id.toString(), cls])
      )

      const newDataMap = new Map(
         clses.map(cls => [cls._id.toString(), cls])
      )

      const toCreate = [];
      const toUpdate = [];
      const toDelete = [];
      const invalidIds = [];

      for (const [id, cls] of newDataMap) {
         if (id.startsWith("temp-")) {
            toCreate.push(cls)
         } else if (oldDataMap.has(id)) {
            toUpdate.push(cls)
         } else {
            invalidIds.push(id)
         }
      }

      if(invalidIds.length > 0){
         await session.abortTransaction()
         return res.status(400).json({
            success: false,
            message: "Some classes reference ids that don't exist for this user",
            invalidIds,
         })
      }

      for (const [id, cls] of oldDataMap) {
         if (!newDataMap.has(id)) {
            toDelete.push(cls);
         }
      }

      await Promise.all(
         toCreate.map(cls =>
            classModel.create([{
               userId,
               subjectId: cls.subjectId,
               title: cls.title,
               color: cls.color,
               notify: cls.notify,
               day: cls.day,
               start: cls.start,
               end: cls.end,
            }], { session })
         )
      );

      await Promise.all(
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
               { returnDocument: 'after', session }
            )
         )
      );

      if(toDelete.length > 0){
         await classModel.updateMany(
            { _id: { $in: toDelete.map( cls => cls._id ) }, userId },
            { $set: { isActive: false } },
            { session }
         )
      }

      const classes = await classModel.find({ userId, isActive: true }).session(session)

      //* save subjets

      const subjectMap = new Map()

      for (const cls of classes) {
         if (!subjectMap.has(cls.subjectId)) {
            subjectMap.set(cls.subjectId, {
               title: cls.title,
               subjectId: cls.subjectId,
               dayOfWeek: new Set(),
            })
         }
         subjectMap.get(cls.subjectId).dayOfWeek.add(cls.day)
      }

      const subjectsArr = Array.from(subjectMap.values()).map(s => ({
         title: s.title,
         subjectId: s.subjectId,
         dayOfWeek: Array.from(s.dayOfWeek).sort((a, b) => a - b),
      }))

      const subjetcsExsist = await subjectModel.findOne({ userId, isActive: true }).session(session)
      if (subjetcsExsist) {
         subjetcsExsist.isActive = false
         subjetcsExsist.deletedAt = Date.now()
         await subjetcsExsist.save({ session })
      }

      const newSubjects = await subjectModel.create([{
         userId,
         isActive: true,
         subjects: subjectsArr,
      }], { session })

      await session.commitTransaction()

      return res.status(200).json({
         success: true,
         classesData: classes,
         subjectData: newSubjects[0],
         message: "Data Fatched succesfully!"
      })

   } catch (error) {
      await session.abortTransaction()
      console.log(error)
      return res.status(500).json({
         message: "Error at Update Timetable Endpoint",
         success: false,
      })
   } finally {
      session.endSession()
   }
}

// fatch route
export const getSubjects = async (req, res) => {
   try {
      const userId = req.userId
      let subjectsData = await subjectModel.findOne({ userId, isActive: true })
      if (!subjectsData){
         const subjects = []
         subjectsData = await subjectModel.create({
            userId,
            isActive: true,
            subjects
         })

         return res.status(201).json({
            success: true,
            message: "New subject Model Created",
            subjectsData
         })
      }
      
      return res.status(200).json({
         success: true,
         subjectsData
      })
      
   } catch (error) {
      console.log(error)
      return res.status(500).json({
         success: false,
         message: "Server Error At GetSubject Route"
      })
   }
}

export const getClasses = async (req, res) => {
   try {
      const userId = req.userId

      const classes = await classModel.find({ userId, isActive: true })
      return res.status(200).json({
         success: true,
         message: "Data Fatched",
         classes
      })
      
   } catch (error) {
      console.log(error)
      return res.status(500).json({
         success: false,
         message: "Server Error At GetClasses Route"
      })
   }
}