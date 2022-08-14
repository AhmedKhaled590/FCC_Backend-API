require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const bodyParser = require("body-parser");
const dns = require("dns");

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
// Basic Configuration
const port = process.env.PORT || 3000;

const urlSchema = new mongoose.Schema({
  url: { type: String, required: true },
  shortUrl: { type: String, required: true, default: 0 },
});

const Url = mongoose.model("Url", urlSchema);

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", (req, res) => {
  const url = req.body.url;
  const hostname = url.replace(/http[s]?\:\/\//, "").replace(/\/(.+)?/, "");
  dns.lookup(hostname, (err, address) => {
    if (err || !address) {
      res.json({ error: "invalid URL" });
    } else {
      Url.countDocuments((err, count) => {
        if (err) {
          res.json({ error: "invalid URL" });
        }
        const newUrl = new Url({
          url: url,
          shortUrl: count + 1,
        });
        newUrl.save((err) => {
          if (err) {
            res.json({ error: "invalid URL" });
          } else {
            res.json({
              original_url: url,
              short_url: newUrl.shortUrl,
            });
          }
        });
      });
    }
  });
});

app.get("/api/shorturl/:shortUrl", (req, res) => {
  const shortUrl = req.params.shortUrl;
  Url.findOne({ shortUrl: shortUrl }, (err, url) => {
    if (err) {
      res.json({ error: "invalid URL" });
    } else {
      res.redirect(url.url);
    }
  });
});
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
