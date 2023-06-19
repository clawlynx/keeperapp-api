require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const Note = require("./models/Note");
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET;

const app = express();

app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "https://keeperapp-d7rb.onrender.com",
  })
);

app.use(cookieParser());

mongoose.connect(process.env.MONGODB_CONNECTION_STRING);

app.get("/", (req, res) => {
  res.json("all ok");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const existingMail = await User.findOne({ email: email });

  if (existingMail) {
    res.json("mail exists");
  }
  if (!existingMail) {
    const newUser = new User({
      email,
      name,
      password: bcrypt.hashSync(password, saltRounds),
    });
    await newUser.save();
    res.json(newUser);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const currentUser = await User.findOne({ email: email });

  if (currentUser) {
    const correctPassword = bcrypt.compareSync(password, currentUser.password);
    if (correctPassword) {
      jwt.sign(
        {
          email: currentUser.email,
          id: currentUser._id,
          name: currentUser.name,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, {
              httpOnly: false,
              sameSite: "none",
              secure: true,
            })
            .json(currentUser);
        }
      );
    } else {
      res.json("pass not ok");
    }
  } else {
    res.json("invalid user");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    res.json(null);
    return;
  } else {
    jwt.verify(token, jwtSecret, {}, (err, data) => {
      if (err) throw err;
      res.json(data);
    });
  }
});

app.post("/logout", (req, res) => {
  res
    .cookie("token", "", {
      expires: new Date(0),
      sameSite: "none",
      secure: true,
    })
    .json(true);
});

app.post("/note", (req, res) => {
  const { token } = req.cookies;
  const { title, content } = req.body;
  if (!token) {
    res.json("error");
    return;
  } else {
    jwt.verify(token, jwtSecret, {}, async (err, data) => {
      if (err) throw err;
      const newNote = new Note({
        title: title,
        content: content,
        owner: data.id,
      });
      await newNote.save();
      res.json("ok");
    });
  }
});

app.get("/viewnotes", (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    res.json("error");
    return;
  } else {
    jwt.verify(token, jwtSecret, {}, async (err, data) => {
      if (err) throw err;
      const notes = await Note.find({ owner: data.id });

      res.json(notes);
    });
  }
});
app.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  await Note.findByIdAndDelete(id);
  res.json("ok");
});

app.listen(process.env.PORT || 4000, () => {
  console.log("successfully connected");
});
