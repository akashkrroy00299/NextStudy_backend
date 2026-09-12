import crypto from "crypto"
import mongoose from "mongoose"

import timetableModel from "../models/timetable.model.js"
import classModel from "../models/class.model.js"
import attendanceLogModel from "../models/attendanceLog.model.js"
import userModel from "../models/user.model.js"

const ERRORS = {
  subjectLength: "Atlist Timetable need one subject",
  userNotFound: "User not found!",
  timeTable: "Time table not found!, that can case if id is invalid",
  updateteTimetable: "Timetable update need atlist one update"
}


// * SECTION 1 : TIME TABLE AND CLASSES
export const createTimeTable = async (req, res) => {
  try {
    const userId = req.userId
    let { startDate, endDate, name, subjects } = req.body
    const user = await userModel.findById(userId)
    if (!user) { return res.status(400).json({ success: false, message: ERRORS.userNotFound }) }
    if (!subjects || subjects.length == 0) { return res.status(400).json({ success: false, message: ERRORS.subjectLength }) }

    const verson = 1
    const uuid = crypto.randomUUID()
    const slug = `${user.username}_${uuid}_${verson}`

    const timeTableNameExits = await timetableModel.findOne({ userId, isActive: true, name })
    if (timeTableNameExits) {
      name = `${name}_new`
    }

    for (const sub of subjects) {
      sub.subjectId = crypto.randomUUID()
    }

    const data = {
      userId,
      uuid,
      slug,
      name,
      verson,
      startDate,
      subjects
    }

    if (endDate) { data.endDate = endDate }

    const timetable = await timetableModel.create(data)

    return res.status(201).json({
      success: true,
      message: "Timetable created successfully",
      timetable
    })

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Creat TimeTable Route"
    })
  }
}

export const fatchTimetable = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id

    const [user, timetable] = await Promise.all([
      userModel.findById(userId),
      timetableModel.findOne({ _id: id, userId })
    ])

    if (!user) { return res.status(400).json({ success: false, message: ERRORS.userNotFound }) }
    if (!timetable) { return res.status(400).json({ success: false, message: ERRORS.timeTable }) }

    const classes = await classModel.find({ timeTableId: timetable._id, userId })

    user.activeTimetableId = id
    await user.save({ validateBeforeSave: false })

    return res.status(200).json({
      success: true,
      message: "timetableId updated",
      timetable,
      classes
    })

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Fatch TimeTable Route"
    })
  }
}

export const updateTimetable = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id

    const { updates } = req.body
    if (!updates || !updates.length) { return res.status(400).json({ success: false, message: ERRORS.updateteTimetable }) }

    const timetable = await timetableModel.findOne({ _id: id, userId })
    if (!timetable) { return res.status(400).json({ success: false, message: ERRORS.timeTable }) }
    let _updates = {}
    let _subjects = [...timetable.subjects]
    let isMezor = false

    for (const op of updates) {
      if (op.type === 'update_timetable') {
        const { name, startDate, endDate } = op
        if (name) { _updates.name = name }
        if (startDate) { _updates.startDate = startDate }
        if (endDate) { _updates.endDate = endDate }
      }

      if (op.type === 'add_subject') {
        const { name, target, color } = op
        const subjectId = crypto.randomUUID()
        const subject = { name: name, color: color, target: target, subjectId: subjectId }
        _subjects.push(subject)
        isMezor = true
      }

      if (op.type === 'remove_subject') {
        const { subjectId } = op
        _subjects = _subjects.filter((prev) => prev.subjectId !== subjectId)
        isMezor = true
      }

      if (op.type === 'update_subject') {
        const { id, update } = op
        _subjects = _subjects.map((prev) => prev.subjectId === id ? { ...prev, ...update } : prev)
        isMezor = true
      }
    }

    _updates.subjects = _subjects

    if (!isMezor) {
      await timetableModel.findByIdAndUpdate(id, _updates)
    } else {
      const user = await userModel.findById(userId)
      if (!user) { return res.status(400).json({ success: false, message: ERRORS.userNotFound }) }
      const uuid = timetable.uuid
      const verson = timetable.verson + 1
      const slug = `${user.username}_${uuid}_${verson}`

      const data = {
        userId,
        uuid,
        slug,
        name: _updates.name || timetable.name,
        verson,
        startDate: _updates.startDate || timetable.startDate,
        subjects: _subjects
      }

      if (_updates.endDate) {
        data.endDate = _updates.endDate
      }

      if (timetable.endDate) {
        data.endDate = timetable.endDate
      }

      const session = await mongoose.startSession()
      try {
        await session.withTransaction(async () => {
          timetable.isActive = false
          timetable.deactivatedAt = new Date()
          const [newTimeTable] = await timetableModel.create([data], { session })
          await timetable.save({ session, validateBeforeSave: false })
          await classModel.updateMany(
            { timeTableId: timetable._id, userId },
            { $set: { timeTableId: newTimeTable._id } },
            { session }
          )
        })
      } finally {
        session.endSession()
      }
    }

    return res.status(200).json({
      success: true,
      message: "Timetable Updated!"
    })

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Update TimeTable Route"
    })
  }
}

export const updateClasses = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id

    const { updates } = req.body
    if (!updates || !updates.length) { return res.status(400).json({ success: false, message: ERRORS.updateteTimetable }) }

    const timetable = await timetableModel.findOne({ _id: id, userId })
    if (!timetable) { return res.status(400).json({ success: false, message: ERRORS.timeTable }) }

    let _subjects = timetable.subjects.map((s) => ({ ...s.toObject(), classes: [...s.classes] }))
    let subjectsChanged = false

    const pendingCreates = []
    const pendingDeletes = []
    const pendingUpdates = []

    for (const op of updates) {
      if (op.type === 'add_cls') {
        const { day, subjectId, startTime, endTime, name, color } = op
        const subject = _subjects.find((prev) => prev.subjectId === subjectId)
        if (!subject) { continue }

        pendingCreates.push({ day, subjectId, startTime, endTime, name, color, timeTableId: timetable._id, userId })
        subject.classes.push(day)
        subjectsChanged = true
      }

      if (op.type === 'delete_cls') {
        const { id: classId } = op
        const existingCls = await classModel.findOne({ _id: classId, userId, timeTableId: timetable._id })
        if (!existingCls) { continue }

        pendingDeletes.push(classId)

        const subject = _subjects.find((prev) => prev.subjectId === existingCls.subjectId)
        if (subject) {
          const dayIndex = subject.classes.indexOf(existingCls.day)
          if (dayIndex !== -1) {
            subject.classes.splice(dayIndex, 1)
            subjectsChanged = true
          }
        }
      }

      if (op.type === 'update_cls') {
        const { id: classId, update } = op
        const { day } = update

        const existingCls = await classModel.findOne({ _id: classId, userId, timeTableId: timetable._id })
        if (!existingCls) { continue }

        pendingUpdates.push({ id: classId, update })

        if (day !== undefined && day !== existingCls.day) {
          const subject = _subjects.find((prev) => prev.subjectId === existingCls.subjectId)
          if (subject) {
            const oldIndex = subject.classes.indexOf(existingCls.day)
            if (oldIndex !== -1) { subject.classes.splice(oldIndex, 1) }
            subject.classes.push(day)
            subjectsChanged = true
          }
        }
      }
    }

    const session = await mongoose.startSession()
    let newTimeTable = null

    try {
      await session.withTransaction(async () => {
        for (const doc of pendingCreates) {
          await classModel.create([doc], { session })
        }
        for (const classId of pendingDeletes) {
          await classModel.deleteOne({ _id: classId, userId, timeTableId: timetable._id }, { session })
        }
        for (const { id: classId, update } of pendingUpdates) {
          await classModel.findOneAndUpdate(
            { _id: classId, userId, timeTableId: timetable._id },
            update,
            { session }
          )
        }

        if (subjectsChanged) {
          const user = await userModel.findById(userId).session(session)
          if (!user) { throw new Error(ERRORS.userNotFound) }

          const uuid = timetable.uuid
          const verson = timetable.verson + 1
          const slug = `${user.username}_${uuid}_${verson}`

          const data = {
            userId,
            uuid,
            slug,
            name: timetable.name,
            verson,
            startDate: timetable.startDate,
            subjects: _subjects
          }
          if (timetable.endDate) { data.endDate = timetable.endDate }

          timetable.isActive = false
          timetable.deactivatedAt = new Date()
          await timetable.save({ session, validateBeforeSave: false })

          const [created] = await timetableModel.create([data], { session })
          newTimeTable = created

          await classModel.updateMany(
            { timeTableId: timetable._id, userId },
            { $set: { timeTableId: newTimeTable._id } },
            { session }
          )
        }
      })
    } finally {
      session.endSession()
    }

    return res.status(200).json({
      success: true,
      message: "Classes Updated!",
      timetable: newTimeTable || undefined
    })

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Update Classes Route"
    })
  }
}

export const slugToCopyTimeTable = async (req, res) => {
  try {
    const userId = req.userId;
    const slug = req.params.slug;
    const { startDate, endDate, name } = req.body;
    let _name

    const user = await userModel.findById(userId)
    if (!user) { return res.status(400).json({ success: false, message: ERRORS.userNotFound }) }
    // 1. Find the original timetable
    const timetable = await timetableModel.findOne({
      slug,
      isActive: true,
    });

    if (!timetable) {
      return res.status(400).json({
        success: false,
        message: ERRORS.timeTable,
      });
    }

    // 2. Check if user already has a timetable with same name
    if (!name) {
      const timetableNameExists = await timetableModel.findOne({
        userId,
        name: timetable.name,
      });

      _name = timetable.name;
      if (timetableNameExists) {
        _name = `${timetable.name}_new`;
      }
    } else {
      _name = name
    }

    // 3. Create old subjectId -> new subjectId mapping
    const subjectIdMap = new Map();

    const _subjects = timetable.subjects.map((sub) => {
      const oldSubjectId = sub.subjectId;
      const newSubjectId = crypto.randomUUID();

      // Remember the relationship
      subjectIdMap.set(oldSubjectId, newSubjectId);

      return {
        ...sub.toObject(),
        subjectId: newSubjectId,
      };
    });

    // 4. Generate new timetable information
    const uuid = crypto.randomUUID();
    const verson = 1;
    const _slug = `${user.username}_${uuid}_${verson}`;

    // 5. Create copied timetable
    const data = {
      userId,
      uuid,
      slug: _slug,
      name: _name,
      verson,
      startDate,
      subjects: _subjects,
    };

    if (endDate) {
      data.endDate = endDate;
    }

    const new_copy_timetable = await timetableModel.create(data);

    // 6. Get all classes from original timetable
    const classes = await classModel.find({
      timeTableId: timetable._id,
    });

    // 7. Copy every class
    const classes_copy = classes.map((cls) => {
      const newSubjectId = subjectIdMap.get(cls.subjectId);

      return {
        ...cls.toObject(),
        _id: undefined,
        timeTableId: new_copy_timetable._id,
        userId,
        subjectId: newSubjectId,
      };
    });

    if (classes_copy.length > 0) {
      await classModel.insertMany(classes_copy);
    }

    return res.status(201).json({
      success: true,
      message: "Timetable copied successfully",
      timetable: new_copy_timetable,
    });
  } catch (error) {
    console.log(error.message);

    return res.status(500).json({
      success: false,
      message: "Error at Copy timetable by slug Route",
    });
  }
};