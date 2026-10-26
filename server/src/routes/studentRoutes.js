const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const csv = require("csv-parser");
const { Readable } = require("stream");

const Student = require("../models/Student");
const Institution = require("../models/Institution");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// CSV columns expected in the uploaded file
const CSV_HEADERS = [
  "studentName",
  "rollNumber",
  "apaarId",
  "course",
  "academicYear",
];

// Multer: store uploaded CSV in memory, maximum 2 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      return cb(new Error("Only CSV files are allowed"));
    }
    cb(null, true);
  },
});

// Parse CSV using explicit column names

function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const students = [];
    const csvText = buffer.toString("utf8").replace(/^\uFEFF/, "");

    if (!csvText.trim()) {
      return reject(new Error("CSV file is empty"));
    }

    let headers = [];

    Readable.from([csvText])
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
        })
      )
      .on("headers", (receivedHeaders) => {
        headers = receivedHeaders;

        const missingHeaders = CSV_HEADERS.filter(
          (header) => !headers.includes(header)
        );

        if (missingHeaders.length > 0) {
          reject(
            new Error(
              `Missing required column(s): ${missingHeaders.join(", ")}`
            )
          );
        }
      })
      .on("data", (row) => {
        const student = {
          studentName: String(row.studentName || "").trim(),
          rollNumber: String(row.rollNumber || "").trim(),
          apaarId: String(row.apaarId || "").trim(),
          course: String(row.course || "").trim(),
          academicYear: String(row.academicYear || "").trim(),
        };

        if (Object.values(student).every((value) => value === "")) {
          return;
        }

        students.push(student);
      })
      .on("end", () => {
        if (headers.length === 0) {
          return reject(
            new Error("CSV header row is missing or invalid")
          );
        }

        const missingHeaders = CSV_HEADERS.filter(
          (header) => !headers.includes(header)
        );

        if (missingHeaders.length > 0) {
          return reject(
            new Error(
              `Missing required column(s): ${missingHeaders.join(", ")}`
            )
          );
        }

        resolve(students);
      })
      .on("error", reject);
  });
}


// Validate student records
async function validateStudents(institutionId, students) {
  const errors = [];
  const validRecords = [];
  const seenRollNumbers = new Set();
  const seenApaarIds = new Set();

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const rowErrors = [];

    const studentName = String(student.studentName || "").trim();
    const rollNumber = String(student.rollNumber || "").trim();
    const apaarId = String(student.apaarId || "").trim();
    const course = String(student.course || "").trim();
    const academicYear = String(student.academicYear || "").trim();

    if (!studentName) {
      rowErrors.push("Student name is required");
    }

    if (!rollNumber) {
      rowErrors.push("Roll number is required");
    }

    if (!apaarId) {
      rowErrors.push("APAAR ID is required");
    } else if (!/^\d{12}$/.test(apaarId)) {
      rowErrors.push("APAAR ID must contain exactly 12 digits");
    } else {
       if (seenApaarIds.has(apaarId)) {
         rowErrors.push("Duplicate APAAR ID in uploaded CSV");
        }

        seenApaarIds.add(apaarId);

        const existingApaarId = await Student.exists({
          institutionId,
          apaarId,
       });

       if (existingApaarId) {
       rowErrors.push("APAAR ID already exists in this institution");
      }
    }

    const normalizedRollNumber = rollNumber.toLowerCase();

    if (rollNumber && seenRollNumbers.has(normalizedRollNumber)) {
      rowErrors.push("Duplicate roll number in uploaded CSV");
    }

    if (rollNumber) {
      seenRollNumbers.add(normalizedRollNumber);

      const existingStudent = await Student.exists({
        institutionId,
        rollNumber,
      });

      if (existingStudent) {
        rowErrors.push("Roll number already exists in this institution");
      }
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: i + 1,
        rollNumber,
        errors: rowErrors,
      });
    } else {
      validRecords.push({
        institutionId,
        studentName,
        rollNumber,
        apaarId,
        course,
        academicYear,
        verificationStatus: "pending",
        validationErrors: [],
      });
    }
  }

  return {
    summary: {
      totalRecords: students.length,
      validRecords: validRecords.length,
      invalidRecords: errors.length,
    },
    errors,
    validRecords,
  };
}

// POST /api/students/validate
// Validate JSON student records without saving them
router.post("/validate", authMiddleware, async (req, res) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a non-empty students array",
      });
    }

    const result = await validateStudents(
      req.institution.institutionId,
      students
    );

    return res.json({
      success: true,
      message: "Student validation completed",
      ...result,
    });
  } catch (error) {
    console.error("Student validation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to validate students",
    });
  }
});

// POST /api/students/upload-csv
// Validate CSV without saving records
router.post(
  "/upload-csv",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a CSV file using the field name 'file'",
        });
      }

      const students = await parseCsvBuffer(req.file.buffer);

      if (students.length === 0) {
        return res.status(400).json({
          success: false,
          message: "CSV contains no student records",
        });
      }

      const result = await validateStudents(
        req.institution.institutionId,
        students
      );

      return res.json({
        success: true,
        message: "CSV validation completed",
        ...result,
      });
    } catch (error) {
      console.error("CSV validation error:", error);

      return res.status(400).json({
        success: false,
        message: "Unable to process CSV. Check its format and headers.",
      });
    }
  }
);

// POST /api/students/import-csv
// Validate CSV and save valid records
router.post(
  "/import-csv",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a CSV file using the field name 'file'",
        });
      }

      const students = await parseCsvBuffer(req.file.buffer);

      if (students.length === 0) {
        return res.status(400).json({
          success: false,
          message: "CSV contains no student records",
        });
      }

      const result = await validateStudents(
        req.institution.institutionId,
        students
      );

      let savedStudents = [];

      if (result.validRecords.length > 0) {
        savedStudents = await Student.insertMany(result.validRecords, {
          ordered: false,
        });
      }


      return res.json({
        success: true,
        message: "Student CSV import completed",
        summary: {
          totalRecords: result.summary.totalRecords,
          savedRecords: savedStudents.length,
          errorRejectedRecords: result.summary.invalidRecords,
          duplicateSkippedRecords: result.errors.filter((item) =>
            item.errors.some(
              (error) =>
                error.toLowerCase().includes("duplicate") ||
                error.toLowerCase().includes("already exists")
            )
          ).length,
        },
        errors: result.errors,
        savedStudents,
      });
    } catch (error) {
      console.error("CSV import error:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to import CSV records",
      });
    }
  }
);


// GET /api/students/institution/:institutionId
// Fetch students belonging to the authenticated institution
router.get(
  "/institution/:institutionId",
  authMiddleware,
  async (req, res) => {
    try {
      const { institutionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(institutionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid institution ID",
        });
      }

      if (req.institution.institutionId !== institutionId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own students.",
        });
      }

      const institution = await Institution.findById(institutionId).select(
        "name institutionCode status"
      );

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution not found",
        });
      }

      const students = await Student.find({ institutionId }).sort({
        createdAt: -1,
      });

      return res.json({
        success: true,
        message: "Institution students fetched successfully",
        institution,
        totalStudents: students.length,
        students,
      });
    } catch (error) {
      console.error("Fetch students error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch students",
      });
    }
  }
);

// PATCH /api/students/:studentId/status
// Change verification status
router.patch("/:studentId/status", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { verificationStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const allowedStatuses = [
      "pending",
      "verified",
      "rejected",
      "correction_required",
    ];

    if (!allowedStatuses.includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status",
        allowedStatuses,
      });
    }

    const student = await Student.findOneAndUpdate(
      {
        _id: studentId,
        institutionId: req.institution.institutionId,
      },
      { $set: { verificationStatus } },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your institution",
      });
    }

    return res.json({
      success: true,
      message: "Student verification status updated successfully",
      student,
    });
  } catch (error) {
    console.error("Update status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update student status",
    });
  }
});

// PATCH /api/students/:studentId
// Update student details
router.patch("/:studentId", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const allowedFields = [
      "studentName",
      "rollNumber",
      "apaarId",
      "course",
      "academicYear",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] =
          typeof req.body[field] === "string"
            ? req.body[field].trim()
            : req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    if (
      updates.studentName !== undefined &&
      !updates.studentName
    ) {
      return res.status(400).json({
        success: false,
        message: "Student name is required",
      });
    }

    if (
      updates.rollNumber !== undefined &&
      !updates.rollNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "Roll number is required",
      });
    }

    if (
      updates.apaarId &&
      !/^\d{12}$/.test(updates.apaarId)
    ) {
      return res.status(400).json({
        success: false,
        message: "APAAR ID must contain exactly 12 digits",
      });
    }

    if (updates.rollNumber) {
      const duplicate = await Student.exists({
        institutionId: req.institution.institutionId,
        rollNumber: updates.rollNumber,
        _id: { $ne: studentId },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Roll number already exists in this institution",
        });
      }
    }

    const student = await Student.findOneAndUpdate(
      {
        _id: studentId,
        institutionId: req.institution.institutionId,
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your institution",
      });
    }

    return res.json({
      success: true,
      message: "Student details updated successfully",
      student,
    });
  } catch (error) {
    console.error("Update student error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update student details",
    });
  }
});

// DELETE /api/students/:studentId
// Delete a student belonging to the authenticated institution
router.delete("/:studentId", authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    const student = await Student.findOneAndDelete({
      _id: studentId,
      institutionId: req.institution.institutionId,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your institution",
      });
    }

    return res.json({
      success: true,
      message: "Student deleted successfully",
      student,
    });
  } catch (error) {
    console.error("Delete student error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete student",
    });
  }
});


router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "File size exceeds the 2 MB limit"
        : error.message;

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (error.message === "Only CSV files are allowed") {
    return res.status(400).json({
      success: false,
      message: "Only CSV files are allowed. Please select a .csv file.",
    });
  }

  next(error);
});


module.exports = router;