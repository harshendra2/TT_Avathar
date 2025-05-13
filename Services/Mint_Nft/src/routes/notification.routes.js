module.exports = app => {
    const notification = require("../controllers/notification.controller.js");
    const auth = require('../middleware/auth.js');
  
    var router = require("express").Router();
  
    router.post("/", auth,notification.create);
  
    router.get("/", auth,notification.findAll);
  
    router.get("/findbyaddress/:walletaddress", auth,notification.findByAddress);
  
    router.get("/:id", auth,notification.findOne);
  
    router.put("/:id", auth,notification.update);
  
    router.delete("/:id", auth,notification.delete);

    router.delete("/", auth,notification.deleteAll);
  
    router.delete("/deletenotification/:id",auth,notification.deleteNotificationById)
  
    router.delete("/deletenotificationbywalletaddress/:walletaddress",auth,notification.deletenotificationuseraddress)
  
    app.use("/notification", router);
  };
  