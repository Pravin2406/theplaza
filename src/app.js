const mongoose = require("mongoose");
const express = require("express");
const app = express();
require("dotenv").config();
const path = require("path");
const hbs = require("hbs");
const bodyParser = require("body-parser"); //brouser na form parthi server ma data store karavava mate
const cookieParser = require("cookie-parser"); //broser par store karel cookie ne fetch karva mate
const cors = require("cors")
app.use(cors())

const PORT = process.env.PORT;
const DB_URL = process.env.DB_URL;

mongoose
  .connect(DB_URL)
  .then(() => {
    console.log(`DB Connected`);
  })
  .catch((error) => {
    console.log(`Mongodb connection Error: ${error}`);
  });

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
const publicPath = path.join(__dirname, "../public");
const viewPath = path.join(__dirname, "../templates/views");
const partialsPath = path.join(__dirname, "../templates/partials");

app.set("view engine", "hbs");
app.set("views", viewPath);
app.use(express.static(publicPath)); // runtime ma express ma static path use karva mate
hbs.registerPartials(partialsPath); // badha j hbs form ma userheader.hbs use karva mate

app.use("/", require("../router/userrouter"));
app.use("/", require("../router/adminrouter"));

app.listen(PORT, () => {
  console.log(`Server connected on port ${PORT}`);
});
