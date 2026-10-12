
const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    owner_name: String,
    location: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: false,
        validate: {
          validator: function (value) {
            return (value.length === 2 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 &&value[1] <= 90);
          },
          message: "Coordinates must be [longitude, latitude]",
        },
      },
    },

    email: String,
    password: String,

    image: {
      type: String,
      default: "",
    },

    workingHours: {
      open: String,
      close: String,
    },

    availability: {
      openTime: String,
      closeTime: String,
    },

    slotDuration: {
      type: Number,
      default: 30,
    },
  },
  { timestamps: true }
);

ShopSchema.index({
  coordinates: "2dsphere",
});

module.exports = mongoose.model("Shop", ShopSchema);
