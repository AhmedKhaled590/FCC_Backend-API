const express = require("express");
const app = express();
const cors = require("cors");

const mongoos = require("mongoose");
const bodyParser = require("body-parser");

mongoos.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoos.Schema({
  username: { type: String, required: true },
});
const User = mongoos.model("User", userSchema);

const exerciseSchema = new mongoos.Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});
const Exercise = mongoos.model("Exercise", exerciseSchema);

require("dotenv").config();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", (req, res) => {
  User.find({}, (err, data) => {
    if (err) {
      res.send(err);
    } else {
      res.json(data);
    }
  });
});

app.post("/api/users", (req, res) => {
  const username = req.body.username;
  const newUser = new User({ username: username });
  newUser.save((err) => {
    if (err) {
      res.json({ error: "username already exists" });
    } else {
      res.json(newUser);
    }
  });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const _id = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = new Date(req.body.date);
  let username;
  User.findById(_id, (err, user) => {
    if (err) {
      res.json({ error: "user not found" });
    } else {
      username = user.username;
      const newExercise = new Exercise({
        username: username,
        description: description,
        duration: parseInt(duration),
        date: date.toDateString(),
      });
      newExercise.save((err) => {
        if (err) {
          console.log(err);
          res.json({ error: "username not found" });
        } else {
          res.json({
            _id: user._id,
            username: user.username,
            description: newExercise.description,
            duration: newExercise.duration,
            date: newExercise.date.toDateString(),
          });
        }
      });
    }
  });
});

app.get("/api/users/:_id/logs", (req, res) => {
  const _id = req.params._id;
  User.findById(_id, (err, user) => {
    if (err) {
      res.json({ error: "user not found" });
    } else {
      const from = new Date(req.query.from ? req.query.from : 0);
      const to = new Date(req.query.to ? req.query.to : Date.now());
      const limit = parseInt(req.query.limit);
      Exercise.countDocuments({ username: user.username }, (err, count) => {
        if (err) {
          res.json({ error: "user not found" });
        } else {
          Exercise.find({ username: user.username }, (err, exercises) => {
            if (err) {
              console.log(err);
              res.json({ error: "user not found" });
            } else {
              res.json({
                _id: user._id,
                username: user.username,
                from: req.query.from && from.toDateString(),
                to: req.query.to && to.toDateString(),
                count: limit ? (limit > count ? count : limit) : count,
                log: exercises.map((exercise) => {
                  return {
                    _id: exercise._id,
                    description: exercise.description,
                    duration: parseInt(exercise.duration),
                    date: exercise.date.toDateString(),
                  };
                }),
              });
            }
          })
            .select("description duration date -_id")

            .limit(limit ? limit : count)
            .where("date")
            .gte(from)
            .lte(to);
        }
      })
        .where("date")
        .gte(from)
        .lte(to);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
