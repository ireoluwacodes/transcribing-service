const mongoose = require("mongoose");

// Declare the Schema of the Mongo model
var videoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    path: {
      type: String,
    },
    status: {
      type: Boolean,
      default: false,
    },
    transcript: {},
  },
  {
    timestamps: true,
  }
);

//Export the model
const Video = mongoose.model("Video", videoSchema);
module.exports = { Video };
