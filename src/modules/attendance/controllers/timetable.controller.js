import crypto from "crypto"
import mongoose from "mongoose"

import timetableModel from "../../../models/timetable.model.js"
import classModel from "../../../models/class.model.js"
import attendanceLogModel from "../../../models/attendanceLog.model.js"
import userModel from "../../../models/user.model.js"
import { KEYS, cacheGet, cacheSet, cacheDel, cacheDelTimetableSpace } from "../../../lib/cache.js"

const ERRORS = {
  subjectLength: "At least one subject is required for a Timetable",
  userNotFound: "User not found!",
  timeTable: "Time table not found!, that can be the case if the id is invalid",
  updateteTimetable: "Timetable update needs at least one update"
}

const isReplicaSetMember = async () => {
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 })
    return Boolean(info?.setName)
  } catch {
    return false
  }
}

const runWithTransaction = async (callback) => {
  if (!(await isReplicaSetMember())) {
    return callback(null)
  }

  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => {
      result = await callback(session)
    })
    return result
  } finally {
    session.endSession()
  }
}

const txn = (session) => (session ? { session } : {})


// * SECTION 1 : TIME TABLE AND CLASSES
export const createTimeTable = async (req, res) => {
  try {
    const userId = req.userId
    let { startDate, endDate, name, subjects } = req.body
    const user = await userModel.findById(userId)
    if (!user) { return res.status(400).json({ success: false, message: ERRORS.userNotFound }) }
    if (!subjects || subjects.length == 0) { return res.status(400).json({ success: false, message: ERRORS.subjectLength }) }

    const version = 1
    const uuid = crypto.randomUUID()
    const slug = `${user.username}_${uuid}_${version}`

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
      version,
      startDate,
      subjects
    }

    if (endDate) { data.endDate = endDate }

    const timetable = await timetableModel.create(data)
    user.activeTimetableId = timetable._id

    await user.save({ validateBeforeSave: false })

    return res.status(201).json({
      success: true,
      message: "Timetable created successfully",
      timetable
    })

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Create TimeTable Route"
    })
  }
}

export const fetchTimetable = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id

    const REDIS_KEY = KEYS.timetable(userId, id)
    const data = await cacheGet(REDIS_KEY)
    if (data) {
      return res.status(200).json(JSON.parse(data))
    }

    const [user, timetable] = await Promise.all([
      userModel.findById(userId),
      timetableModel.findOne({ _id: id, userId })
    ])

    if (!user) { return res.status(400).json({ success: false, message: ERRORS.userNotFound }) }
    if (!timetable) { return res.status(400).json({ success: false, message: ERRORS.timeTable }) }

    const classes = await classModel.find({ timeTableId: timetable._id, userId })

    const response = {
      success: true,
      message: "timetable fetched",
      timetable,
      classes
    }

    await cacheSet(REDIS_KEY, JSON.stringify(response))

    return res.status(200).json(response)

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Fetch TimeTable Route"
    })
  }
}

export const selectTimetable = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id

    const timetable = await timetableModel.findOne({ _id: id, userId })
    if (!timetable) { return res.status(400).json({ success: false, message: ERRORS.timeTable }) }

    await userModel.findByIdAndUpdate(userId, { activeTimetableId: id }, { validateBeforeSave: false })

    return res.status(200).json({
      success: true,
      message: "timetableId updated"
    })

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Select TimeTable Route"
    })
  }
}

export const updateVisibility = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id
    const { visibility } = req.body

    const timetable = await timetableModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { visibility } },
      { new: true }
    )
    if (!timetable) { return res.status(400).json({ success: false, message: ERRORS.timeTable }) }

    await cacheDel(KEYS.timetable(userId, id))

    return res.status(200).json({
      success: true,
      message: `Timetable is now ${visibility}`,
      timetable
    })

  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Update Visibility Route"
    })
  }
}

export const updateTimetable = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id
    let newTimeTable = null

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
        if (endDate !== undefined) { _updates.endDate = endDate || null }
      }

      if (op.type === 'add_subject') {
        const { name, target, color } = op
        const subjectId = crypto.randomUUID()
        const subject = {
          name,
          color,
          target,
          subjectId
        }
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
        _subjects = _subjects.map((prev) => prev.subjectId === id
          ? {
              ...prev,
              ...update,
            }
          : prev)
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
      const version = timetable.version + 1
      const slug = `${user.username}_${uuid}_${version}`

      const data = {
        userId,
        uuid,
        slug,
        name: _updates.name || timetable.name,
        version,
        startDate: _updates.startDate || timetable.startDate,
        subjects: _subjects,
        visibility: timetable.visibility || "public",
        endDate: _updates.endDate !== undefined
          ? (_updates.endDate || null)
          : (timetable.endDate || null)
      }

      await runWithTransaction(async (session) => {
          timetable.isActive = false
          timetable.deactivatedAt = new Date()
          const [created] = await timetableModel.create([data], txn(session))
          await timetable.save({ validateBeforeSave: false, ...txn(session) })
          newTimeTable = created
          await classModel.updateMany(
            { timeTableId: timetable._id, userId },
            { $set: { timeTableId: newTimeTable._id } },
            txn(session)
          )
        })
    }

    await cacheDelTimetableSpace(userId, id)
    if (newTimeTable) {
      await cacheDel(KEYS.timetable(userId, newTimeTable._id))
    }

    return res.status(200).json({
      success: true,
      message: "Timetable Updated!",
      timetable: newTimeTable || await timetableModel.findById(id)
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

    let newTimeTable = null

    await runWithTransaction(async (session) => {
        for (const doc of pendingCreates) {
          await classModel.create([doc], txn(session))
        }
        for (const classId of pendingDeletes) {
          await classModel.deleteOne({ _id: classId, userId, timeTableId: timetable._id }, txn(session))
        }
        for (const { id: classId, update } of pendingUpdates) {
          await classModel.findOneAndUpdate(
            { _id: classId, userId, timeTableId: timetable._id },
            update,
            txn(session)
          )
        }

        if (subjectsChanged) {
          const user = await (session
            ? userModel.findById(userId).session(session)
            : userModel.findById(userId))
          if (!user) { throw new Error(ERRORS.userNotFound) }

          const uuid = timetable.uuid
          const version = timetable.version + 1
          const slug = `${user.username}_${uuid}_${version}`

          const data = {
            userId,
            uuid,
            slug,
            name: timetable.name,
            version,
            startDate: timetable.startDate,
            subjects: _subjects,
            visibility: timetable.visibility || "public"
          }
          if (timetable.endDate) { data.endDate = timetable.endDate }

          timetable.isActive = false
          timetable.deactivatedAt = new Date()
          await timetable.save({ validateBeforeSave: false, ...txn(session) })

          const [created] = await timetableModel.create([data], txn(session))
          newTimeTable = created

          await classModel.updateMany(
            { timeTableId: timetable._id, userId },
            { $set: { timeTableId: newTimeTable._id } },
            txn(session)
          )
        }
      })

    await cacheDelTimetableSpace(userId, id)
    if (newTimeTable) {
      await cacheDel(KEYS.timetable(userId, newTimeTable._id))
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

    if (timetable.userId.toString() !== userId.toString() && timetable.visibility === "private") {
      return res.status(403).json({
        success: false,
        message: "This timetable is private and cannot be copied"
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
    const version = 1;
    const _slug = `${user.username}_${uuid}_${version}`;

    // 5. Create copied timetable
    const data = {
      userId,
      uuid,
      slug: _slug,
      name: _name,
      version,
      startDate,
      subjects: _subjects,
    };

    if (endDate) {
      data.endDate = endDate;
    }

    const new_copy_timetable = await timetableModel.create(data);
    user.activeTimetableId = new_copy_timetable._id
    await user.save({ validateBeforeSave: false })

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

export const deleteTimetable = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id

    const timetable = await timetableModel.findOne({ _id: id, userId })
    if (!timetable) {
      return res.status(400).json({ success: false, message: ERRORS.timeTable })
    }

    const versions = await timetableModel.find({ userId, uuid: timetable.uuid }).select("_id subjects")
    const timetableIds = versions.map((item) => item._id)
    const subjectIds = [...new Set(versions.flatMap((item) => (item.subjects || []).map((subject) => subject.subjectId)))]
    const classDocs = await classModel.find({ userId, timeTableId: { $in: timetableIds } }).select("_id")
    const classIds = classDocs.map((item) => item._id)

    await runWithTransaction(async (session) => {
        if (classIds.length) {
          await attendanceLogModel.deleteMany({ userId, classId: { $in: classIds } }, txn(session))
        }
        if (subjectIds.length) {
          await attendanceLogModel.deleteMany({ userId, subjectId: { $in: subjectIds } }, txn(session))
        }
        await classModel.deleteMany({ userId, timeTableId: { $in: timetableIds } }, txn(session))
        await timetableModel.deleteMany({ userId, uuid: timetable.uuid }, txn(session))

        const user = await (session
          ? userModel.findById(userId).session(session)
          : userModel.findById(userId))
        if (user && timetableIds.some((timetableId) => String(user.activeTimetableId) === String(timetableId))) {
          const remaining = await (session
            ? timetableModel.findOne({ userId, isActive: true }).session(session)
            : timetableModel.findOne({ userId, isActive: true }))
          user.activeTimetableId = remaining?._id || null
          await user.save({ validateBeforeSave: false, ...txn(session) })
        }
      })

    for (const timetableId of timetableIds) {
      await cacheDelTimetableSpace(userId, timetableId)
    }

    return res.status(200).json({
      success: true,
      message: "Timetable deleted",
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      message: "Error at Delete TimeTable Route",
    })
  }
}