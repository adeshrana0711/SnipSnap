const mongoose = require("mongoose");

const barberSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  location: {
    type: String,
    required: true,
    trim: true
  },

  skills: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active"
  },

  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  },

  workingHours: {

    start: {
      type: String,
      default: "09:00"
    },

    end: {
      type: String,
      default: "17:00"
    }

  },

  slotDuration: {
    type: Number,
    default: 30
  },

  breakTime: {
    start: {
      type: String,
      default: null
    },

    end: {
      type: String,
      default: null
    }

  }

}, { timestamps: true });

module.exports = mongoose.model("Barber", barberSchema);