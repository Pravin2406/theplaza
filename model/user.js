const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = mongoose.Schema({
  fname: { type: String },
  lname: { type: String },
  email: { type: String },
  pass: { type: String },
  phone: { type: Number },
  tokens: [{ token: { type: String } }],
});

userSchema.pre("save", async function () {
  try {
    if (this.isModified("pass")) {
      this.pass = await bcrypt.hash(this.pass, 10);
    }
  } catch (error) {
    console.log(`userSchema.pre Error is: ${error}`);
  }
});

userSchema.methods.generateToken = async function () {
  try {
    const token = jwt.sign({ _id: this._id }, process.env.S_KEY);
    this.tokens = this.tokens.concat({ token: token });
    this.save();
    return token;
  } catch (error) {
    console.log("generateToken Error is: " + error);
  }
};

module.exports = new mongoose.model("User", userSchema);
