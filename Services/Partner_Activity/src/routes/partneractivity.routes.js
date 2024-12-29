module.exports = app => {
    const partneractivity = require("../controllers/partneractivity.controller.js");
    const auth = require('../middleware/auth.js');
    
     var router = require("express").Router();
     
     router.get("/getjoinedPartner/:address", auth,partneractivity.Joinedpartner);
     router.get("/getuserteamstotal/:address", auth,partneractivity.getUserTeamsTotal);
  
     router.get("/getoverallDetailteamstatistics", auth,partneractivity.getOverallDetailTeamstatistics);
     router.get("/getallsellpriceandbv",auth,partneractivity.getoverallPriceBVSale)
     router.get("/getDirectDetailteamstatistics/:address",auth,partneractivity.getDirectDetailTeamstatistics);
   
    router.get("/updateUserRank",partneractivity.processTotalUserRank);   // Update Rank temp
      
    router.get("/storeteamstatistics",partneractivity.StoreTeamstatistics);
    router.get("/getteamstatistics",auth,partneractivity.getTeamstatistics);
    router.get("/getdirectteamstatistics/:address", auth,partneractivity.getDirectTeamstatisticslatestfirst);
    router.put("/updateteamstatistics/:userAddress", auth,partneractivity.updateTeamstatistics);
    router.get("/getuserrankbonuses/:address/:amount/:sponsoraddress",partneractivity.getUserRankBonuses);   // Here I need to fix the bugs
    router.get("/getuserrank/:address",partneractivity.getUserRank);
  
    //get all token for all users
    router.get("/getgraphteamturnover", auth,partneractivity.getGraphToken);
    router.get("/getgraphteamturnoverweekly", auth,partneractivity.getGraphTokenweekly);
    router.get("/getgraphteamturnovermonthly", auth,partneractivity.getGraphTokenmonthly);
    router.get("/getgraphteamturnoversixmonths", auth,partneractivity.getGraphTokenSixMonths);
    router.get("/getgraphteamturnoveroneyear",auth,partneractivity.getGraphTokenOneYear);
      
    //for token user ghraph API
    router.get("/getusergraphtoken/:address", auth,partneractivity.getUserGraphToken);
    router.get("/getusergraphtokenweekly/:address", auth,partneractivity.getUserGraphTokenweekly);
    router.get("/getusergraphtokenmonthly/:address", auth,partneractivity.getUserGraphTokenmonthly);
    router.get("/getusergraphtokensixmonths/:address", auth,partneractivity.getUserGraphTokenSixMonths);
    router.get("/getusergraphtokenoneyear/:address", auth,partneractivity.getUserGraphTokenOneYear);
  
    //for user ghraph for team turnover
    router.get("/getusergraphteamturnover/:address", auth,partneractivity.getUserGraphTeamTurnoverHourly);
    router.get("/getusergraphteamturnoverweekly/:address", auth,partneractivity.getUserGraphTeamTurnoverWeekly);
    router.get("/getusergraphteamturnovermonthly/:address", auth,partneractivity.getUserGraphTeamTurnoverMonthly);
    router.get("/getusergraphteamturnoversixmonths/:address", auth,partneractivity.getUserGraphTeamTurnoverSixMonths);
    router.get("/getusergraphteamturnoveroneyear/:address", auth,partneractivity.getUserGraphTeamTurnoverYearly);


    //Get New User Rank bonus , new code 
    router.get("/getuserranknonous/get_new/:amount/:sponsorID",partneractivity.GetUserNewRankBonous);


    //testing API 
    router.get("/getuserRank/testing/:amount/:sponsorID",partneractivity.GetNewRankBonous);
      
      app.use("/partneractivity", router);


    };
    