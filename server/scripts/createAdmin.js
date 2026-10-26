
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../src/models/Admin");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "admin@identix.com";
    const password = "ChangeThis@123";

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log("Admin account already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Admin.create({
      name: "Identix Admin",
      email,
      passwordHash,
      role: "admin",
    });

    console.log("Admin account created successfully.");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (error) {
    console.error("Admin creation failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
