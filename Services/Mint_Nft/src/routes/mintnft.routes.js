module.exports = app => {
    const mintnfts = require("../controllers/mintnft.controller.js");
    const auth = require('../middleware/auth.js');
    var router = require("express").Router();

    router.post("/",auth,mintnfts.createbk);

   router.get("/", auth,mintnfts.findAll);
   //My new API for Desplay table 
   //router.get("/",auth,mintnfts.FetchAllData);

   router.get("/:useraddress", mintnfts.findOne);

   router.put("/:id",auth, mintnfts.update);

   router.delete("/:id",auth, mintnfts.delete);

   router.delete("/", auth,mintnfts.deleteAll);

   router.get("/getUserJoinedDetails/:useraddress",auth,mintnfts.getUserJoinedDetails)

    app.use("/mintnfts", router);
};

