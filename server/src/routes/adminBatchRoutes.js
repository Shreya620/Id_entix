
const express = require("express");
const Batch = require("../models/Batch");
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");
const Student = require("../models/Student");
const router = express.Router();


// Get pending batches from all institutions
router.get("/pending", adminAuthMiddleware, async (req, res) => {
  try {
    const batches = await Batch.find({
      status: { $in: ["pending", "resubmitted"] }
    })
      .populate("students", "studentName rollNumber apaarId course academicYear")
      .populate("institutionId", "name email")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      totalBatches: batches.length,
      batches,
    });
  } catch (error) {
    console.error("Admin fetch batches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending batches",
    });
  }
});


router.patch("/:batchId/review", adminAuthMiddleware, async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const { batchId } = req.params;
    const { action, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID",
      });
    }

    if (!["approve", "return"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be approve or return",
      });
    }

    if (
      action === "return" &&
      (typeof remarks !== "string" || !remarks.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Remarks are required when returning a batch",
      });
    }

    const update = action === "approve"
      ? {
          status: "reviewed",
          reviewedAt: new Date(),
          correctionRemarks: "",
        }
      : {
          status: "correction_required",
          correctionRemarks: remarks.trim(),
          reviewedAt: null,
        };

    const batch = await Batch.findOneAndUpdate(
     { _id: batchId, status: { $in: ["pending", "resubmitted"] } },
      { $set: update },
      { returnDocument: "after", runValidators: true }
    );

    if (!batch) {
  return res.status(404).json({
    success: false,
    message: "Batch not found or already reviewed",
  });
}

if (action === "approve") {
  const result = await Student.updateMany(
    {
      _id: { $in: batch.students },
      institutionId: batch.institutionId,
    },
    {
      $set: { verificationStatus: "verified" },
    }
  );

  console.log("Students in approved batch:", batch.students);
  console.log("Student update result:", result);
}

    return res.status(200).json({
      success: true,
      message:
        action === "approve"
          ? "Batch approved successfully"
          : "Batch returned for correction",
      batch,
    });
  } catch (error) {
    console.error("Batch review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to review batch",
    });
  }
});


module.exports = router;
