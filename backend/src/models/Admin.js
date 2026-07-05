import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

/**
 * Admin Schema
 * Manages admin users with JWT authentication
 */
const adminSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    passwordHash: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["admin", "super-admin"],
      default: "admin",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: Date,
  },
  {
    timestamps: true,
    collection: "admins",
  },
);

// Hide password hash in JSON responses
adminSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method: Compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method: Update last login
adminSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save();
};

// Static method: Find by email
adminSchema.statics.findByEmail = async function (email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Static method: Create admin with hashed password
adminSchema.statics.createAdmin = async function (
  email,
  password,
  name,
  role = "admin",
) {
  const admin = new this({
    email,
    passwordHash: password, // Will be hashed by pre-save hook
    name,
    role,
  });

  await admin.save();
  return admin;
};

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
