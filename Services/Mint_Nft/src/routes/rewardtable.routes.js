module.exports = app => {
    const reward = require("../controllers/rewardtable.controller");
    const auth = require('../middleware/auth');
  
    var router = require("express").Router();
  
    // Create a new Tutorial
    router.post("/storereward",auth, reward.create);
  
    router.get("/getreward",auth,reward.getreward)
    
    app.use("/api/reward", router);
  };
  