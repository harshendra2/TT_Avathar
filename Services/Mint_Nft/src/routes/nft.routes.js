module.exports = app => {
    const nfts = require("../controllers/nft.controller.js");
    const auth = require('../middleware/auth.js');
    var router = require("express").Router();
  
   
    router.post("/", auth,nfts.create);
  
    router.get("/", auth,nfts.findAll);
  
   
    router.put("/:id",auth, nfts.update);
  
    router.delete("/:id",auth, nfts.delete);
  
    app.use("/nfts", router);
  };
  