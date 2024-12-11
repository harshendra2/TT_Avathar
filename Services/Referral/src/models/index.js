const dbConfig = require("../config/db.config.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;
// db.notifications = require("./notification.model.js")(mongoose);
db.referrals = require("./referral.model.js")(mongoose);
db.nfts = require("./nft.model.js")(mongoose);
// db.swaps = require("./swap.model.js")(mongoose);
db.mintnfts = require("./mintnft.model.js")(mongoose);
db.teamstatistics = require("./teamstatistics.model.js")(mongoose);
// db.reward= require("./rewardtable.model.js")(mongoose);
db.admin= require("./admin.model.js")(mongoose);//I create
db.blanknft= require("./blanknft.model.js")(mongoose);//I create 
// db.token= require("./tokenid.model.js")(mongoose);//I create
 db.sitemaintancestatus= require("./sitemaintance.model.js")(mongoose);//I create 
module.exports = db;
