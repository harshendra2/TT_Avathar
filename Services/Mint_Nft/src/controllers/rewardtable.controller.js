const db = require("../models");
const reward=db.reward;

exports.create = async (req, res) => {
    const rewarddata= {
        rewardType: req.body.rewardType,
        fromUser: req.body.fromUser,
        toUser: req.body.toUser,
        rewardAmount: req.body.rewardAmount,
    };
reward.create(rewarddata, (err, nft) => {
      if (err) {
        res.status(500).send({ message: "Error creating NFT: " + err });
      } else {
        res.send(nft);
      }
    });
    };

    exports.getreward = async (req, res) => {
      try{

        const  useraddress  = req.query.useraddress 
        const rewardata = await reward.aggregate([
          {
              $match: {
                toUser: useraddress
              }
          },
        
      ]);
      return res.status(200).send({status:true,data:rewardata})

      }catch(err){
        return res.status(500).send({status:false,message:err.message})
      }

      };