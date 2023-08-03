const jwt = require("jsonwebtoken");
const User = require("../model/user");

const auth = async (req, resp, next) => {
  try {
    if (req.cookies.jwt == undefined) {
      next();
    } else {
      const mytoken = req.cookies.jwt;
      const verifytoken = await jwt.verify(mytoken, process.env.S_KEY);

      if (verifytoken) {
        const userdata = await User.findOne({ _id: verifytoken._id });
        req.user = userdata;
        req.token = mytoken;
        next();
      }
      else{
        resp.render("login",{err:"Please login frist"})
      }
    }
  } catch (error) {
    resp.render("index", { err: "You are not logedin !!!" });
    console.log("auth error is: " + error);
  }
};

module.exports = auth;
