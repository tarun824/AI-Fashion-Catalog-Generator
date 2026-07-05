import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

/**
 * Vendor Schema
 * Self-service vendors who upload their own saree batches (e.g. RK Silks, SV Textiles)
 */
const vendorSchema = new Schema(
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

    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: Date,
  },
  {
    timestamps: true,
    collection: "vendors",
  },
);

vendorSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

vendorSchema.pre("save", async function (next) {
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

vendorSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

vendorSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save();
};

vendorSchema.statics.findByEmail = async function (email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

vendorSchema.statics.createVendor = async function ({
  email,
  password,
  businessName,
  contactPhone,
}) {
  const vendor = new this({
    email,
    passwordHash: password, // hashed by pre-save hook
    businessName,
    contactPhone,
  });
  await vendor.save();
  return vendor;
};

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;
