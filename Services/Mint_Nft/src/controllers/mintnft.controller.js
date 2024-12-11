const db = require("../models");
const { clearStoreTeamstatistics,clearRedisKeysByPattern } = require('../config/redis');
const mintnfts = db.mintnfts;
const Referral = db.referrals;
const Nfts = db.nfts;

exports.createbk = async (req, res) => {
	let { useraddress,level,mintprice,referreraddress } = req.body;
  
	const existsData = await Referral.findOne({myaddress: req.body.useraddress});
	if (referreraddress) {
		referreraddress = referreraddress.toLowerCase();
	} else {
		referreraddress = existsData?existsData.sponsoraddress:'0x0000000000000000000000000000000000000000';
	}

	var condition = { useraddress,level,mintprice };

	if (!req.body.useraddress) {
		res.status(400).send({ message: "my address can not be empty!" });
		return;
	}

  	await mintnfts.find(condition)
   .then(async data => {
		if (data.length !=0 ){
			res.status(400).send({ message: "Record already exist!" });
		}else{
			const mintnft = await new mintnfts({
				useraddress,
				level,
				mintprice,
				referreraddress
			});
		
			await mintnft.save()
			.then(async data => {
        		clearStoreTeamstatistics(useraddress);
        		clearStoreTeamstatistics(referreraddress);
				
				if(req.body.referreraddress!==req.body.useraddress){
					if(existsData){
						if(existsData.sponsoraddress == '0x0000000000000000000000000000000000000000' && req.body.referreraddress){
							const SponserData = {
								sponsoraddress: req.body.referreraddress, 
							};
							await Referral.findByIdAndUpdate(existsData._id, SponserData, { new: true, runValidators: true })
						}
						
						const ReferralData = {
							$push: {
								nft: {
									$each: Array.isArray(req.body.level) ? req.body.level : [req.body.level]
								}
							}
						};
		
						await Referral.findByIdAndUpdate(existsData._id, ReferralData, { new: true, runValidators: true })
					}else{
						const referralData = {
							sponsoraddress: req.body.referreraddress,
							myaddress: req.body.useraddress,
							nft: req.body.level
						};
						
						const ReferralData = await new Referral(referralData);
					
						await ReferralData.save();
					}
				}
				res.status(200).send({
					status:true,
					message:"Mint NFT data has been successfully",
					mintresult:data,
				});
			})
			.catch(err => {
				res.status(500).send({
					status:false,
					message:
					err.message || "Some error occurred while creating the mintnft."
				});
			});
		}
	})
};

exports.findAll = (req, res) => {
    const useraddress = req.query.useraddress;
    var condition = useraddress ? { useraddress: { $regex: new RegExp(useraddress), $options: "i" } } : {};
  
    mintnfts.find(condition)
      .then(data => {
        res.send(data);
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving mintnfts."
        });
      });
  };

  
exports.findOne = (req, res) => {
    const useraddress = req.params.useraddress;
    mintnfts.aggregate([
        {
            $match: {
                useraddress: useraddress
            }
        },
        {
            $lookup: {
                from: "nfts",
                localField: "level",
                foreignField: "level",
                as: "nftData"
            }
        }
    ])
    .then(data => {
        if (data.length == 0) {
            res.status(404).send({ message: "Not found mint nft with useraddress " + useraddress });
        } else {
            const imageUrl = `https://ttavatar-test.xyz/Images/`;
            res.send({ status: true, message: "All Mints Nft List", data: data, imageUrl: imageUrl });
        }
    })
    .catch(err => {
        res.status(500).send({ message: "Error retrieving mint nft with useraddress=" + useraddress });
    });
  };

  exports.update = (req, res) => {
	if (!req.body) {
	  return res.status(400).send({
		message: "Data to update can not be empty!"
	  });
	}
	const id = req.params.id;
	mintnfts.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
	  .then(data => {
		if (!data) {
		  res.status(404).send({
			message: `Cannot update Sponsor with id=${id}. Maybe Sponsor was not found!`
		  });
		} else res.send({ message: "Sponsor was updated successfully." });
	  })
	  .catch(err => {
		res.status(500).send({
		  message: "Error updating Sponsor with id=" + id
		});
	  });
  };

  
exports.delete = (req, res) => {
	const id = req.params.id;
  
	mintnfts.findByIdAndRemove(id, { useFindAndModify: false })
	  .then(data => {
		if (!data) {
		  res.status(404).send({
			message: `Cannot delete Sponsor with id=${id}. Maybe Sponsor was not found!`
		  });
		} else {
		  res.send({
			message: "Sponsor was deleted successfully!"
		  });
		}
	  })
	  .catch(err => {
		res.status(500).send({
		  message: "Could not delete Sponsor with id=" + id
		});
	  });
  };


  exports.deleteAll = (req, res) => {
	mintnfts.deleteMany({})
	  .then(data => {
		res.send({
		  message: `${data.deletedCount} mintnfts were deleted successfully!`
		});
	  })
	  .catch(err => {
		res.status(500).send({
		  message:
			err.message || "Some error occurred while removing all mintnfts."
		});
	  });
  };

  exports.getUserJoinedDetails = async (req, res) => {
	const useraddress = req.params.useraddress;

	try {
	  const data = await mintnfts.aggregate([
		{
		  $match: {
			useraddress: useraddress,
			referreraddress: { $nin: [null, "0x0000000000000000000000000000000000000000"] }
		  }
		},
		{
		  $lookup: {
			from: 'nfts',
			localField: 'level',
			foreignField: 'level',
			as: 'nftData'
		  }
		},
		{
		  $sort: {
			createdAt: 1 
		  }
		},
		{
		  $limit: 1
		},
		{
		  $addFields: {
			createdAtMilliseconds: {
			  $toLong: "$createdAt"
			}
		  }
		}
	  ]);
	
	  if (data.length === 0) {
		return res.status(400).send({ status: false, message: "Not found mint NFT with useraddress " + useraddress });
	  }
	
	  const item = data[0];
	  const result = {
		_id: item._id,
		useraddress: item.useraddress,
		level: item.level,
		mintprice: item.mintprice,
		createdAt: item.createdAtMilliseconds, 
		nftData: item.nftData.map(nft => nft.nft)
	  };
	
	  const imageUrl = `https://ttavatar-test.xyz/Images/`;
	  res.send({ status: true, message: "First Mint NFT Data", date: result.createdAt, nftname: result.nftData[0] });
	} catch (err) {
	  res.status(500).send({ message: "Error retrieving mint NFT with useraddress=" + useraddress });
	}
	
};

  