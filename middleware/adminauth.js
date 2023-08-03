const jwt = require("jsonwebtoken");
const Admin = require("../model/admin");

const auth = async (req, resp, next) => {
  try {
    
    if ((req.cookies.ajwt == undefined)) {
      resp.render("admin_login", {err: "Please login frist!!!"})
    } 
    else {
      const mytoken = req.cookies.ajwt;
      const verifytoken = await jwt.verify(mytoken, process.env.A_KEY);
      if (verifytoken) {
        const admindata = await Admin.findOne({ _id: verifytoken._id });
        req.admin = admindata;
        req.token = mytoken;
        next();
      }
    }
  } catch (error) {
    console.log("aauth error is: " + error);
    resp.render("admin_login", { err: "You are not logedin !!!" });
  }
};

module.exports = auth;
