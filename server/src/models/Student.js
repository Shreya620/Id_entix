
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true
    },

    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true
    },

    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    apaarId: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (value) {
          return value === "" || /^\d{12}$/.test(value);
        },
        message: "APAAR ID must contain exactly 12 digits"
      }
    },

    course: {
      type: String,
      trim: true,
      default: ""
    },

    academicYear: {
      type: String,
      trim: true,
      default: ""
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "correction_required"],
      default: "pending"
    },

    validationErrors: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate roll numbers within the same institution
studentSchema.index(
  { institutionId: 1, rollNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Student", studentSchema);
