const router = require("express").Router();
const mongoose = require("mongoose");
const Admin = require("../model/admin");
const jwt = require("jsonwebtoken");
const aauth = require("../middleware/adminauth");
const multer = require("multer");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/productimg");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + ".jpg");
  },
});

var upload = multer({
  storage: storage,
});

router.get("/dashboard", aauth, (req, resp) => {
  resp.render("dashboard");
});

router.get("/admin", (req, resp) => {
  resp.render("admin_login");
});



router.post("/do_adminlogin", async (req, resp) => {
  try {
    const admin = await Admin.findOne({ uname: req.body.uname });
    if (admin.pass === req.body.pass) {
      const token = await jwt.sign({ _id: admin._id }, process.env.A_KEY);
      resp.cookie("ajwt", token);
      resp.redirect("dashboard");
    } else {
      resp.render("admin_login", { err: "Invalid credentials" });
    }
  } catch (error) {
    resp.render("admin_login", { err: "Invalid credentials" });
    console.log(error);
  }
});

router.get("/admin_logout", aauth, async (req, resp) => {
  try {
    resp.clearCookie("ajwt");
    // resp.render("admin_login");
    resp.redirect("admin")
  } catch (error) {
    console.log(error);
  }
});

//*************************Category********************************/
const Category = require("../model/category");

router.get("/category", aauth, async (req, resp) => {
  try {
    const data = await Category.find();

    resp.render("category", { catdata: data });
  } catch (error) {
    console.log(error);
  }
});

router.post("/add_category", aauth, async (req, resp) => {
  try {
    const cat = new Category(req.body);
    console.log(req.body);
    await cat.save();
    resp.redirect("category");
  } catch (error) {
    console.log(error);
  }
});

router.get("/edit_category", aauth, async (req, resp) => {
  try {
    const _id = req.query._id;
    const onecategory = await Category.findById({ _id: _id });
    const catdata = await Category.find();
    resp.render("category", { editcategory: onecategory, catdata: catdata });
  } catch (error) {
    console.log(error);
  }
});

router.post("/update_category", aauth, async(req, resp) => {
  try {
    const data = await Category.findByIdAndUpdate(req.body._id, {catname: req.body.catname})
    resp.redirect("category");
  } catch (error) {
    console.log(error);
  }
})

router.get("/remove_category", aauth, async (req, resp) => {
  try {
    const data = await Category.findByIdAndDelete(req.query._id);
    resp.send("Category is Deleted successfully....");
  } catch (error) {
    console.log(error);
  }
});

//*************************Products********************************/
const Product = require("../model/products");

router.get("/products", aauth, async (req, resp) => {
  try {
    const data = await Category.find();
    const prod = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "catid",
          foreignField: "_id",
          as: "category",
        },
      },
    ]);
    resp.render("products", { catdata: data, proddata: prod });
  } catch (error) {
    console.log(error);
  }
});

router.post("/add_product", upload.single("file"), async (req, resp) => {
  try {
    const prod = new Product({
      pname: req.body.pname,
      catid: req.body.catid,
      price: req.body.price,
      qty: req.body.qty,
      img: req.file.filename,
    });
    await prod.save();
    resp.redirect("products");
  } catch (error) {
    console.log(error);
  }
});

router.post("/do_update", upload.single("file"), async (req, resp) => {
  try {
    const data = await Product.findByIdAndUpdate(req.body._id, {
      pname: req.body.pname,
      price: req.body.price,
      qty: req.body.qty,
      catid: req.body.catid,
      img: req.file.filename,
    });
    fs.unlinkSync("./public/productimg/" + data.img);
    resp.redirect("products");
  } catch (error) {
    console.log(error);
  }
});

router.get("/edit_product", aauth, async (req, resp) => {
  try {
    const pid = new mongoose.Types.ObjectId(req.query.pid);
    const prod = await Product.aggregate([
      { $match: { _id: pid } },
      {
        $lookup: {
          from: "categories",
          localField: "catid",
          foreignField: "_id",
          as: "category",
        },
      },
    ]);

    const proddata = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "catid",
          foreignField: "_id",
          as: "category",
        },
      },
    ]);
    
    const catdata = await Category.find();
    resp.render("products", {
      catdata: catdata,
      proddata: proddata,
      prod: prod,
      scatdata: prod[0].category,
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/remove_product", aauth, async (req, resp) => {
  try {
    const data = await Product.findByIdAndDelete(req.query._id);
    resp.send("Product is Deleted Successfully.....");
  } catch (error) {
    console.log(error);
  }
});

//*************************view users********************************/
const User = require("../model/user");
router.get("/viewusears", async (req, resp) => {
  try {
    const users = await User.find();
    resp.render("usears", { userdata: users });
  } catch (error) {
    console.log("viewuser Error is: " + error);
  }
});

//*************************view cart********************************/
const Cart = require("../model/cart");
router.get("/viewcart", async (req, resp) => {
  try {
    const cart = await Cart.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "uid",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "pid",
          foreignField: "_id",
          as: "products",
        },
      },
    ]);
    resp.render("viewcart", { cartdata: cart });
  } catch (error) {
    console.log("viewcart error is: " + error);
  }
});

//*************************view order********************************/
const Order = require("../model/order");
router.get("/vieworders", async (req, resp) => {
  try {
    const orders = await Order.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "uid",
          foreignField: "_id",
          as: "users",
        },
      },
    ]);
    resp.render("vieworders", { ordersdata: orders });
  } catch (error) {
    console.log("vieworders error is: " + error);
  }
});

module.exports = router;
