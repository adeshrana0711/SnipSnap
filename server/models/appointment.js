const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({

  barber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Barber",
    required: true
  },

  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  time: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["Booked", "Completed", "Cancelled"],
    default: "Booked"
  }

}, { timestamps: true });

appointmentSchema.index({ barber: 1, date: 1, time: 1 }, { unique: true });


module.exports = mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);