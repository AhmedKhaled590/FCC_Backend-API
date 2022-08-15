const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment");
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static("public"));
app.use(({ method, url, query, params, body }, res, next) => {
  console.log(">>> ", method, url);
  console.log(" QUERY:", query);
  console.log(" PRAMS:", params);
  console.log("  BODY:", body);
  const _json = res.json;
  res.json = function (data) {
    console.log(" RESLT:", JSON.stringify(data, null, 2));
    return _json.call(this, data);
  };
  console.log(" ----------------------------");
  next();
});
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Mongoose Config
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  exercise: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});
const User = mongoose.model("User", userSchema);

//URI handling
app.post("/api/users", function (req, res) {
  if (req.body.username != undefined) {
    let username = req.body.username;
    let user = new User({ username });
    user.save(function (err, data) {
      if (err) res.json({ error: "Mongo error" });
      else {
        const { username, _id } = data;
        res.json({ username, _id });
      }
    });
  } else {
    res.json({ error: "invalid data" });
  }
});

app.get("/api/users", function (req, res) {
  User.find({}).exec(function (err, data) {
    if (err) res.json({ error: "Mongo error" });
    else {
      res.json(data);
    }
  });
});

app.post("/api/users/:_id/exercises", function (req, res) {
  if (
    req.body.description != undefined &&
    req.body.duration != undefined &&
    req.params._id != undefined
  ) {
    let { description, duration, date } = req.body;
    const { _id } = req.params;

    if (date === undefined || date == "") date = new Date().toDateString();
    else date = new Date(date).toDateString();

    // console.log({description,duration,date});
    User.findByIdAndUpdate(
      _id,
      { $push: { exercise: { description, duration, date } } },
      { new: true },
      function (err, data) {
        if (err) res.json({ error: "Mongo Error" });
        else {
          User.find({ _id: _id })
            .slice("exercise", -1)
            .exec(function (err, data) {
              if (err) res.json({ error: "Mongo Error" });
              else {
                let {
                  username,
                  _id,
                  exercise: [{ description, duration, date }],
                } = data[0];
                res.json({ username, _id, description, duration, date });
              }
            });
        }
      }
    );
  } else {
    res.json({ error: "invalid data" });
  }
});

app.get("/api/users/:_id/logs", function (req, res) {
  if (req.params._id != undefined) {
    const { _id } = req.params;
    const { from, to, limit } = req.query;
    User.findById(
      _id,
      "username _id exercise.description exercise.duration exercise.date",
      function (err, data) {
        if (err) res.json({ error: "Mongo Error" });
        else {
          let { username, _id, exercise: log } = data;

          if (from != undefined && to != undefined) {
            log = log.filter((ele) => {
              let eleDate = new Date(ele.date).getTime();
              let fromDate = new Date(from + " 00:00:00").getTime();
              let toDate = new Date(to + " 00:00:00").getTime();

              return eleDate >= fromDate && eleDate <= toDate;
            });
          }
          if (limit != undefined) {
            log = log.slice(0, limit);
          }

          log = log.map((ele) => {
            return {
              description: ele.description,
              duration: ele.duration,
              date: new Date(ele.date).toDateString(),
            };
          });

          let count = 0;
          if (log != undefined) count = log.length;
          res.json({ username, _id, log, count });
        }
      }
    );
  } else {
    res.json({ error: "invalid data" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
