
const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },

    batchReference: {
      type: String,
      required: true,
      unique: true,
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
    ],

    status: {
      type: String,
      enum: [
        "pending",
        "correction_required",
        "resubmitted",
        "reviewed",
      ],
      default: "pending",
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    correctionRemarks: {
      type: String,
      default: "",
      trim: true,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Batch", batchSchema);
