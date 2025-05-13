module.exports = app => {
    const admincontroller = require("../controllers/admin.controller");
    const auth = require('../middleware/auth');
    var router = require("express").Router();
   
    router.post("/createadmin", auth,admincontroller.create);
  
    router.post("/adminlogin",admincontroller.adminlogin);

    //blanknft routes
    router.post("/storeblanknft",auth,admincontroller.createBlankNft)
  
    router.post("/storeblanknft1",auth,admincontroller.createBlankNft2)
  
    router.get("/getallbanknft",auth,admincontroller.getallBlankNft)
  
    router.put("/updateblanknftstatus",auth,admincontroller.upadateblankNftStatus)
  
    router.delete("/deleteblanknft",auth,admincontroller.deleteallblanknftdata)
  
    router.get("/getdateuseraddress/:sponsoraddress",auth,admincontroller.getdateuseraddress);
     
    router.get('/getdate/:useraddress',auth,admincontroller.getdate);

    //Total sold nft price
    router.get('/gettotal/mintnft/price',admincontroller.GetTotalNftPrice);
  
    //blanknft
    router.get("/getstatus/:walletaddress/:blanklevel",auth,admincontroller.getblanknftone2);
  
    router.get("/getblanknft/:walletaddress",auth,admincontroller.getdataone);
  
    router.get("/currentblanknft/:walletaddress",auth,admincontroller.getdataone2);
  
    router.post("/storeblanknft2",auth,admincontroller.createBlankNft5);
  
    //
  
    router.post("/storetokenid",auth,admincontroller.storetokenid);
  
    router.get("/getalltokeniddata",auth,admincontroller.getalltokeiddata);
  
    router.post("/forgetpassword",admincontroller.forgetpassword);
  
    router.post("/resetpassword",admincontroller.resetpassword);
  
  router.post("/sitemaintance",admincontroller.postwebsitemaintancestatus);
  
  router.get("/getsitemaintancestatus/:adminid",admincontroller.getsitemaintancestatus);
  
  router.put("/updatesitemaintancestatus/:adminid",admincontroller.updateStatussitemainstatus)

  //Get all sponsore
  router.get('/getdirectuser',admincontroller.GetAllSponsorAdd);
  router.get('/filter/directuser/:search',auth,admincontroller.GetFilterData);


  router.put('/update/Unclaimed/reward',admincontroller.getRewardsData);

  router.get('/get/Userreward/:page/:limit',auth,admincontroller.GetAllUserRewards);
  router.get('/filter/userreward/:search',auth,admincontroller.FilterUserRewards);

  // Dashboard
  router.get('/admin/useStatus',auth,admincontroller.GetUserStats);
  router.get('/get/tt_reward',admincontroller.GetTT_Rewards);

  router.get('/get/all_user',admincontroller.GetAllUser);
    
    app.use(router);
  };   

 

 