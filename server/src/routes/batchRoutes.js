
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Batch = require("../models/Batch");


router.get("/test", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Identix batch routes are connected",
  });
});


router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const { studentIds } = req.body;
    const institutionId = req.institution.institutionId;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select students for the batch",
      });
    }

    if (new Set(studentIds).size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate student IDs are not allowed",
      });
    }

    if (!studentIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const students = await Student.find({
      _id: { $in: studentIds },
      institutionId,
      verificationStatus: "pending",
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some students are not pending or do not belong to your institution",
      });
    }

    const batchReference =
      "IDB-" +
      new mongoose.Types.ObjectId()
        .toString()
        .slice(-8)
        .toUpperCase();

    const batch = await Batch.create({
      institutionId,
      batchReference,
      students: students.map((student) => student._id),
      status: "pending",
      submittedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Student batch submitted successfully",
      batch: {
        id: batch._id,
        batchReference: batch.batchReference,
        totalStudents: batch.students.length,
        status: batch.status,
        submittedAt: batch.submittedAt,
      },
    });
  } catch (error) {
    console.error("Batch submission error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit student batch",
    });
  }
});


router.get("/pending", authMiddleware, async (req, res) => {
  try {
    const institutionId = req.institution.institutionId;

    const batches = await Batch.find({
      institutionId,
      status: "pending",
    })
      .populate(
        "students",
        "studentName rollNumber apaarId course academicYear"
      )
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      totalBatches: batches.length,
      batches,
    });
  } catch (error) {
    console.error("Fetch batches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending batches",
    });
  }
});


router.get("/status", authMiddleware, async (req, res) => {
  try {
    const institutionId = req.institution.institutionId;

    const batches = await Batch.find({ institutionId })
      .select(
        "batchReference status submittedAt reviewedAt correctionRemarks students"
      )
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      totalBatches: batches.length,
      batches: batches.map((batch) => ({
        batchId: batch._id,
        batchReference: batch.batchReference,
        totalStudents: batch.students.length,
        status: batch.status,
        submittedAt: batch.submittedAt,
        reviewedAt: batch.reviewedAt,
        correctionRemarks: batch.correctionRemarks,
      })),
    });
  } catch (error) {
    console.error("Fetch batch status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch batch status",
    });
  }
});


router.patch("/:batchId/resubmit", authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;
    const institutionId = req.institution.institutionId;

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    const batch = await Batch.findOne({
      _id: batchId,
      institutionId,
      status: "correction_required",
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Correction-required batch not found",
      });
    }

    const students = await Student.find({
      _id: { $in: batch.students },
      institutionId,
    });

    if (students.length !== batch.students.length) {
      return res.status(400).json({
        success: false,
        message: "Some batch students could not be found",
      });
    }

    // Clear old correction flags before resubmission.
    await Student.updateMany(
      {
        _id: { $in: batch.students },
        institutionId,
      },
      {
        $set: {
          verificationStatus: "pending",
          validationErrors: [],
        },
      }
    );

    batch.status = "resubmitted";
    batch.submittedAt = new Date();
    batch.correctionRemarks = "";
    batch.reviewedAt = null;

    await batch.save();

    return res.status(200).json({
      success: true,
      message: "Batch resubmitted successfully for review",
      batch: {
        batchId: batch._id,
        batchReference: batch.batchReference,
        status: batch.status,
        submittedAt: batch.submittedAt,
      },
    });
  } catch (error) {
    console.error("Batch resubmission error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resubmit batch",
    });
  }
});


module.exports = router;
