import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Counter Schema
 * Atomic sequence counters used to build human-readable, incrementing SKUs
 */
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

export async function nextSequence(key) {
  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}

export default Counter;
