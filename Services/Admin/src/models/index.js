const dbConfig = require("../config/db.config.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;

db.referrals = require("./referral.model.js")(mongoose);
db.mintnfts = require("./mintnft.model.js")(mongoose);
db.teamstatistics = require("./teamstatistics.model.js")(mongoose);
db.admin= require("./admin.model.js")(mongoose);//I create
db.blanknft= require("./blanknft.model.js")(mongoose);
 db.sitemaintancestatus= require("./sitemaintance.model.js")(mongoose);//I create 
 db.UserRewards=require("./UserReward.model.js")(mongoose);
module.exports = db;
