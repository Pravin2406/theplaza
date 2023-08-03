const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  pname: {
    type: String,
  },
  catid: {
    type: mongoose.Schema.Types.ObjectId,
  },
  price: {
    type: Number,
  },
  qty: {
    type: Number,
  },
  img: {
    type: String,
  },
});

module.exports = new mongoose.model("Product", productSchema);
