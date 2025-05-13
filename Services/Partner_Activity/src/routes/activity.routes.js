module.exports = app => {
  const activity = require("../controllers/activity.controller.js");
  const auth = require('../middleware/auth.js');
    var router = require("express").Router();

    router.post("/checkReffer",auth, activity.CheckReffer);
    router.post("/storeteamstatistics",activity.StoreTeamstatistics);

    app.use(router);
};
  