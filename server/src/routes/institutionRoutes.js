
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Institution = require("../modes/Institution");

const router = express.Router();

function createToken(institution) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
  }

  return jwt.sign(
    {
      institutionId: institution._id.toString(),
      role: "institution"
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function publicInstitution(institution) {
  return {
    _id: institution._id,
    name: institution.name,
    institutionCode: institution.institutionCode,
    email: institution.email,
    address: institution.address,
    approvedIntake: institution.approvedIntake,
    status: institution.status
  };
}

// Institution registration
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      institutionCode,
      email,
      password,
      address,
      approvedIntake
    } = req.body;

    if (
      !name ||
      !institutionCode ||
      !email ||
      !password ||
      approvedIntake === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided"
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = institutionCode.trim().toUpperCase();

    const existingInstitution = await Institution.findOne({
      $or: [
        { email: normalizedEmail },
        { institutionCode: normalizedCode }
      ]
    });

    if (existingInstitution) {
      return res.status(409).json({
        success: false,
        message: "Email or institution code already registered"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const institution = await Institution.create({
      name,
      institutionCode: normalizedCode,
      email: normalizedEmail,
      passwordHash,
      address,
      approvedIntake
    });

    const token = createToken(institution);

    return res.status(201).json({
      success: true,
      message: "Institution registered successfully",
      token,
      institution: publicInstitution(institution)
    });
  } catch (error) {
    console.error("Institution registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Institution registration failed"
    });
  }
});

// Institution login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const institution = await Institution.findOne({
      email: email.trim().toLowerCase()
    }).select("+passwordHash");

    if (
      !institution ||
      !institution.passwordHash ||
      !(await bcrypt.compare(password, institution.passwordHash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = createToken(institution);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      institution: publicInstitution(institution)
    });
  } catch (error) {
    console.error("Institution login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Institution login failed"
    });
  }
});

module.exports = router;
