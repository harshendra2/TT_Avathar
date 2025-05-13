module.exports = app => {
    const reffral = require("../controllers/reffral.controller.js");
    const auth = require('../middleware/auth.js');
  
    var router = require("express").Router();
  
    router.post("/", auth,reffral.create);
  
    router.get("/", auth,reffral.findAll);
  
    router.get("/partneractivity/:address", auth,reffral.findAllPartnerActivity);
  
    router.get("/:id",auth, reffral.findOne);
 
    router.put("/:id", auth,reffral.update);
 
    router.delete("/:id",auth, reffral.delete);

    router.delete("/",auth, reffral.deleteAll);
  
    app.use("/reffral", router);
  };
  