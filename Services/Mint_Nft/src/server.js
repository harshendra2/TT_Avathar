const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = require("./models");
db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

require("./routes/mintnft.routes")(app);
require("./routes/nft.routes")(app);
require("./routes/referral.routes")(app);
require("./routes/notification.routes")(app);

app.listen(3003, () => {
  console.log(`Minnft Server is running on port ${3003}.`);
});
