const router = require("express").Router();
const auth = require("../middleware/auth");
const Category = require("../model/category");
const Product = require("../model/products");
const Cart = require("../model/cart");

router.get("/", auth, async (req, resp) => {
  const user = req.user;
  const cat = await Category.find();
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

  try {
    if (user == undefined) {
      resp.render("index", { proddata: prod, catdata: cat });
    } else {
      const cartdata = await Cart.find({ uid: user._id });
      resp.render("index", {
        proddata: prod,
        catdata: cat,
        currentuser: user.fname,
        totalcartitem: cartdata.length,
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/login", (req, resp) => {
  resp.render("login");
});

router.get("/registration", (req, resp) => {
  resp.render("registration");
});

// router.get("/category", auth, (req, resp) => {
//   const user = req.user;
//   resp.render("category", { currentuser: user.fname });
// });

router.get("/shop", auth, (req, resp) => {
  const user = req.user;
  resp.redirect("/");
});

//*****************Registration**********************/
const User = require("../model/user");

router.post("/do_register", async (req, resp) => {
  try {
    const user = new User(req.body);
    await user.save();
    resp.render("registration", { msg: "Registration successfully done !!!" });
  } catch (error) {
    console.log("/do_register error is: " + error);
  }
});

//*****************Login**********************/
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

router.post("/do_login", async (req, resp) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    const isMatch = await bcrypt.compare(req.body.pass, user.pass);

    if (user.tokens.length > 2) {
      resp.render("login", { err: "Max user linit reached" });
      return;
    }

    if (isMatch) {
      const token = await user.generateToken();
      resp.cookie("jwt", token);
      // resp.redirect("/", { currentuser: user.fname });
      resp.redirect("/");
    } else {
      resp.render("login", { err: "Invalid credentials !!!!" });
    }
  } catch (error) {
    console.log("/do_login Error is: " + error);
    resp.render("login", { err: "Invalid credentials !!!!" });
  }
});

//*****************Logout**********************/

router.get("/logout", auth, async (req, resp) => {
  const user = req.user;
  const token = req.token;

  user.tokens = user.tokens.filter((ele) => {
    return ele.token != token;
  });

  user.save();
  resp.clearCookie("jwt");
  resp.redirect("/");
});

//*****************Logout all**********************/
router.get("/logoutAll", auth, async (req, resp) => {
  const user = req.user;
  const token = req.token;

  user.tokens = [];
  user.save();

  resp.clearCookie("jwt");
  resp.redirect("/");
});

//***************** cart **********************/
router.get("/cart", auth, async (req, resp) => {
  const user = req.user;
  var sum = 0;
  try {
    if (user == undefined) {
      resp.render("login", { err: "Please login frist" });
    } else {
      const cartdata = await Cart.aggregate([
        { $match: { uid: user._id } },
        {
          $lookup: {
            from: "products",
            localField: "pid",
            foreignField: "_id",
            as: "product",
          },
        },
      ]);

      for (let i = 0; i < cartdata.length; i++) {
        sum = sum + cartdata[i].total;
      }
      resp.render("cart", {
        currentuser: user.fname,
        cartdata: cartdata,
        sum: sum,
        totalcartitem: cartdata.length,
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/add_cart", auth, async (req, resp) => {
  try {
    const user = req.user;
    if (user == undefined) {
      resp.render("login", { err: "Please login frist" });
    } else {
      const pid = req.query.pid;
      const uid = req.user._id;
      const pdata = await Product.findOne({ _id: pid });
      const cartdata = await Cart.findOne({ pid: pid, uid: uid });
      
      if (cartdata) {
        var qty = cartdata.qty;
        qty++;
        var total = pdata.price * qty;
        await Cart.findByIdAndUpdate(cartdata._id, { qty: qty, total: total });
        resp.redirect("cart");
      } else {
        const cart = new Cart({
          uid: uid,
          pid: pid,
          qty: 1,
          price: pdata.price,
          total: pdata.price,
        });
        await cart.save();
        resp.redirect("cart");
      }
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/remove_cart", async (req, resp) => {
  try {
    const _id = req.query.cid;
    await Cart.findByIdAndDelete(_id);
    resp.redirect("cart");
  } catch (error) {
    console.log(error);
  }
});

router.get("/changeQty", async (req, resp) => {
  try {
    const cartid = req.query.cartid;
    const qty = req.query.qty;

    const cartdata = await Cart.findOne({ _id: cartid });
    const pdata = await Product.findOne({ _id: cartdata.pid });

    const total = pdata.price * Number(qty);
    await Cart.findByIdAndUpdate(cartid, { qty: Number(qty), total: total });
    resp.send("update");
  } catch (error) {
    console.log(error);
  }
});

//***************** payment **********************/
const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_s4swSk4elaiNRt",
  key_secret: "N7IKmyf84LWUnjlQatn0IBhO",
});

router.get("/makepayment", async (req, resp) => {
  const amt = Number(req.query.amt);
  try {
    var order = await instance.orders.create({
      amount: amt * 100, // amount in the smallest currency unit
      currency: "INR",
      receipt: "order_rcptid_11",
    });
    resp.send(order);
  } catch (error) {
    console.log(error);
    console.log("makepayment error is : " + error);
  }
});

//***************** order **********************/
const Order = require("../model/order");
const nodemailer = require("nodemailer");
const { raw } = require("body-parser");
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: "aonejsk@gmail.com", pass: "znrjlomqathqkabs" },
});

router.get("/order", auth, async (req, resp) => {
  const uid = req.user._id;
  const payid = req.query.payid;
  try {
    const cartdata = await Cart.find({ uid: uid });
    var prodAry = []; var prodid = []; var gtotal = 0; var rows = ""; var htmlsum = "";

    for (var i = 0; i < cartdata.length; i++) {
      const proddata = await Product.findOne({ _id: cartdata[i].pid });
      prodAry[i] = {
        pname: proddata.pname,
        qty: cartdata[i].qty,
        price: cartdata[i].price,
        stotal: cartdata[i].total,
      };

      prodid[i]={
        pid: cartdata[i].pid,
        qty: proddata.qty - cartdata[i].qty
      }

      gtotal += cartdata[i].qty * cartdata[i].price;
      rows =
        rows + 
        "<tr><td>" +
        proddata.pname +
        "</td><td align=right>" +
        cartdata[i].price +
        "</td><td align=center>" +
        cartdata[i].qty +
        "</td><td align=right>" +
        cartdata[i].qty * cartdata[i].price +
        "</td></tr>";
    }
    htmlsum =
      `<tr><td></td><td></td><td align="right">Grand Total</td><td align="right">` + gtotal + `</td></tr>`;

    const order = new Order({
      uid: uid,
      payid: payid,
      products: prodAry,
      gtotal: gtotal,
    });
    
    await order.save();
    for (var i = 0; i < prodid.length; i++) {
      await Product.findByIdAndUpdate(prodid[i].pid, { qty: prodid[i].qty });
    }

    var mailOptions = {
      from: "aonejsk@gmail.com",
      to: req.user.email,
      subject: "The Plaza order confirmation....",
      html:
        `<table class="table" border="2px solid black">
        <thead>
        <tr>
            <th>Product Name</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Total</th>
        </tr>
        </thead>
        <tbody>` + rows + htmlsum + `</tbody>
    </table>`,
    };
    await transporter.sendMail(mailOptions);

    await Cart.deleteMany({ uid: uid });
    resp.send("order confirmed !!!!");
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
