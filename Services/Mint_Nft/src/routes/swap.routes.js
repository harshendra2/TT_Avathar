module.exports = app => {
    const swaps = require("../controllers/swap.controller.js");
    const auth = require('../middleware/auth.js');
  
    var router = require("express").Router();
  
    router.post("/", auth,swaps.StoreSwaps);
    router.get("/", auth,swaps.GetSwaps);
    router.get("/getswapdata/:address",auth,swaps.getswapdata)
    app.use("/api/swaps", router);
  };
  