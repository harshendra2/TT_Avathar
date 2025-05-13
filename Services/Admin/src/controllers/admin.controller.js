const db = require("../models");
const sitemaintancemodel=db.sitemaintancestatus
const adminmodel = db.admin;
const bcrypt = require("bcryptjs");
const mintnft = db.mintnfts
const referrals = db.referrals
const Teamstatistic = db.teamstatistics
const { generateToken } = require("../helpers/userhelpers");
const blanknft = db.blanknft;
const UserRewards=db.UserRewards;
const {ethers}=require('ethers');
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "default";

exports.create = async (req, res) => {
  try {
    const { firstname, lastname, mobile, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const admindata = {
      firstname,
      lastname,
      mobile,
      email,
      password: hashedPassword,
    };
    const data = await adminmodel.create(admindata);
    return res
      .status(201)
      .send({ status: true, message: "Admin create sucessfully", data: data });
  } catch (err) {
	console.log(err)  
    return res.status(500).send({ message: err.message });
  }
};

exports.adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res
        .status(400)
        .send({ status: false, message: "email is required" });
    }
    if (!password) {
      return res
        .status(400)
        .send({ status: false, message: "password is required" });
    }
    const admin = await adminmodel.findOne({ email: email });
    if (!admin) {
      return res
        .status(404)
        .send({ status: false, message: "admin not found" });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(400)
        .send({ status: false, message: "password is incorrect" });
    }
    // const token = generateToken(admin.email, admin._id);
    const token = jwt.sign(
        {
          username:admin.email,
          userId: admin._id
        },
        secret,
        { expiresIn: "24h" }
      );
    return res
      .status(200)
      .send({
        status: true,
        message: "admin login sucessfully",
        data: admin,
        token: token,
      });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

///blanknft functions
exports.createBlankNft = async (req, res) => {
  try {
    const { walletaddress, levelprice, blankTokenId, status } = req.body;
    const blanknftdata = {
      walletaddress,
      levelprice,
      blankTokenId,
      level,
      status,
    };

    //  const checkdata=await blanknft.findOne({walletaddress})
    //    if(checkdata)return res.status(400).send({status:false,message:"this walletaddress allready present"})
      const data = await blanknft.create(blanknftdata);
            
    return res
      .status(201)
      .send({
        status: true,
        message: "blankNft create sucessfully",
        data: data,
      });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

// Function to fetch all blank NFT data
exports.getallBlankNft = async (req, res) => {
  try {
    const blankNftdata = await blanknft.find();
    return res
      .status(200)
      .send({
        status: true,
        message: "blankNft data fetch successfully",
        data: blankNftdata,
      });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};


exports.upadateblankNftStatus = async (req, res) => {
  try {
    const id = req.body.id;
    const status = req.body.status;
    const blankNftdata = await blanknft.findOneAndUpdate(
      { _id: id },
      { status: status },
      { new: true }
    );
    return res
      .status(200)
      .send({
        status: true,
        message: "blankNft status update successfully",
        data: blankNftdata,
      });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
 };





exports.deleteallblanknftdata = async (req, res) => {
  try {

    const data = await blanknft.deleteMany({})
    return res
      .status(200)
      .send({
        status: true,
        message: "data deleted sucessfully",

      });
  } catch {
    return res.status(500).send({ status: false, message: err.message });
  }
}


exports.getblanknftone1= async (req, res) => {
  try {
    const walletaddress = req.params.walletaddress

    const data = await blanknft.findOne({ walletaddress })

    return res.status(200).send({ status: true, message: "Data fetch successfully", assignstatus: data.status })

  } catch (err) {
    return res.status(500).send({ status: false, message: err.message })
  }
}

exports.getdateuseraddress = async (req, res) => {
  try {
    const sponsoraddress = req.params.sponsoraddress;
    const referraldata = await referrals.find({ sponsoraddress: sponsoraddress });

    if (referraldata) {
      const promises = await referraldata.map(async (referrerData) => {
        const UserTeamstatistic = await Teamstatistic.find({ walletaddress: referrerData.myaddress });
        return UserTeamstatistic;
      })
      const AllData = await Promise.all(promises);
      res.send({ status: true, message: "Get All List Of Team statistics", data: AllData });

    }
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};


exports.getdate = async (req, res) => {
  try {
    const { useraddress } = req.params;

    if (!useraddress) {
      return res.status(400).send({ status: false, message: 'useraddress parameter is required' });
    }

    const mintnft1 = await mintnft.findOne({ useraddress }).sort({ createdAt: 1 });

    if (!mintnft1) {
      return res.status(404).send({ status: false, message: 'No records found for the given useraddress' });
    }

    return res.status(200).send({ status: true, createdAt: mintnft1.createdAt.getTime() });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

exports.GetTotalNftPrice = async (req, res) => {
  try {
  
    const data = await blanknft.aggregate([
      {
        $group: {
          _id: null,
          totalMintPrice: { $sum: "$levelprice" },
        },
      },
    ]);
    const totalPrice =data[0].totalMintPrice
    return res.status(200).send({ status: true,totalPrice });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};



exports.createBlankNft1 = async (req, res) => {
  try {
    const { walletaddress, levelprice, status, blanklevel } = req.body;
    const tokenIds = {
      1: 1285001,
      2: 1286001,
      3: 1287001,
      4: 1288001,
      5: 1290001,
      6: 1291001,
      7: 1292001,
      8: 1293001
    };

    if (blanklevel >= 1 && blanklevel <= 8) {
      const existingLevelCount = await blanknft.count({ blanklevel:blanklevel });
      if (existingLevelCount > 0) {
        const lastLevelEntry = await blanknft.findOne({ blanklevel:blanklevel }).sort({ blankTokenId: -1 });
        if (lastLevelEntry) {
         
          tokenIds[blanklevel] = lastLevelEntry.blankTokenId + 1;
        }
      }
    }

      
    let blankTokenId = tokenIds[blanklevel].toString(); 
    if (blanklevel === 1) {
      
      blankTokenId += '1';
    }

    const blanknftdata = {
      walletaddress,
      levelprice,
      blankTokenId,
      blanklevel,
      status
    };

   
    const data = await blanknft.create(blanknftdata);
     
    return res.status(201).send({
      status: true,
      message: "BlankNft created successfully",
      data: data,
    });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};


 exports.getdataone=async(req,res)=>{
  try{

    const walletaddress=req.params.walletaddress

    const data=await blanknft.find({walletaddress:walletaddress})
   return res.status(200).send({status:true,message:"data fetch sucessfully",data:data})

  }catch(err){
    return res.status(500).send({status:false,message:err.message})
  }
 }


exports.createBlankNft2 = async (req, res) => {
  try {
    const { walletaddress, levelprice, status, blanklevel } = req.body;

    const checkdata = await blanknft.findOne({ walletaddress, blanklevel });
    if(checkdata) return res.status(400).send({status:false,message:"User has allready assign this level of nft"})

    const tokenIds = {
      1: 1285001,
      2: 1286001,
      3: 1287001,
      4: 1288001,
      5: 1290001,
      6: 1291001,
      7: 1292001,
      8: 1293001
    };

    let blankTokenId;

    if (blanklevel >= 1 && blanklevel <= 8) {
      const existingLevelCount = await blanknft.countDocuments({ blanklevel: blanklevel });

      if (existingLevelCount > 0) {
        const lastLevelEntry = await blanknft.findOne({ blanklevel: blanklevel }).sort({ blankTokenId: -1 });

        if (lastLevelEntry) {
          blankTokenId = (parseInt(lastLevelEntry.blankTokenId) + 1).toString();
        } else {
          blankTokenId = tokenIds[blanklevel].toString();
        }
      } else {
        blankTokenId = tokenIds[blanklevel].toString();
      }
    } else {
      return res.status(400).send({
        status: false,
        message: "Invalid blanklevel. It should be between 1 and 8."
      });
    }

    const existingRecords = await blanknft.find({ walletaddress });

    if (existingRecords.length > 0) {
      const hasActiveRecord = existingRecords.some(record => record.status === true);

      if (hasActiveRecord) {
        return res.status(400).send({
          status: false,
          message: "Creation not applicable. Wallet address status is true in one or more existing records."
        });
      }
    }

    const blanknftdata = {
      walletaddress,
      levelprice,
      blankTokenId,
      blanklevel,
      status
    };

    const data = await blanknft.create(blanknftdata);

    return res.status(201).send({
      status: true,
      message: "BlankNft created successfully",
      data: data,
    });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};




//
exports.getblanknftone2= async (req, res) => {
  try {
    const walletaddress = req.params.walletaddress;
     const blanklevel=req.params.blanklevel
    const checkdata = await blanknft.findOne({ walletaddress, blanklevel });
         if(checkdata) return res.status(400).send({status:false,message:"User has allready assign this level of nft"})
    const data = await blanknft.find({ walletaddress });

    const hasTrueStatus = data.some(doc => doc.status === true);

    if (hasTrueStatus) {
      return res.status(200).send({ status:false, message: "this walletadrres status allready true" });
    }

    return res.status(200).send({ status: true, message: "No records have status set to true"});

  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
}



exports.getdataone2=async(req,res)=>{
  try{

    const walletaddress=req.params.walletaddress

    const data=await blanknft.find({walletaddress:walletaddress,status:true});
    if(data.length>0){
      const nft = await data[0];
      const level=await nft.blanklevel
      const imageurl=`https://cyperts.xyz/nodeimages/Images/blankLevel${level}.png`
      return res.status(200).send({status:true,message:"data fetch sucessfully",data:data,imageurl:imageurl})
    }else{
      return res.status(200).send({status:true,message:"User do not have active blank NFT",data:[],imageurl:""})
    }

  }catch(err){
    return res.status(500).send({status:false,message:err.message})
  }
 }


 ///storebalanknft api  

 exports.createBlankNft5= async (req, res) => {
  try {
    const { walletaddress, levelprice, status, blanklevel } = req.body;
   
    const checkdata = await blanknft.findOne({ walletaddress, blanklevel });
         if(checkdata) return res.status(400).send({status:false,message:"User has allready assign this level of nft"})
    const tokenIds = {
      1: 1285001,
      2: 1286001,
      3: 1287001,
      4: 1288001,
      5: 1290001,
      6: 1291001,
      7: 1292001,
      8: 1293001
    };

    let blankTokenId;

    if (blanklevel >= 1 && blanklevel <= 8) {
      const existingLevelCount = await blanknft.countDocuments({ blanklevel: blanklevel });

      if (existingLevelCount > 0) {
        const lastLevelEntry = await blanknft.findOne({ blanklevel: blanklevel }).sort({ blankTokenId: -1 });

        if (lastLevelEntry) {
          blankTokenId = (parseInt(lastLevelEntry.blankTokenId) + 1).toString();
        } else {
          blankTokenId = tokenIds[blanklevel].toString();
        }
      } else {
        blankTokenId = tokenIds[blanklevel].toString();
      }
    } else {
      return res.status(400).send({
        status: false,
        message: "Invalid blanklevel. It should be between 1 and 8."
      });
    }

    const existingRecords = await blanknft.find({ walletaddress });

    if (existingRecords.length > 0) {
      const hasActiveRecord = existingRecords.some(record => record.status === true);

      if (hasActiveRecord) {
        return res.status(400).send({
          status: false,
          message: "Creation not applicable. Wallet address status is true in one or more existing records."
        });
      }
    }

    const blanknftdata = {
      walletaddress,
      levelprice,
      blankTokenId,
      blanklevel,
      status
    };

    const data = await blanknft.create(blanknftdata);

    return res.status(201).send({
      status: true,
      message: "BlankNft created successfully",
      data: data,
    });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};


//
const tokenmodel=db.token

exports.storetokenid = async (req, res) => {
  try {
    const { useraddress, tokenId } = req.body;
  
    const tokendata = {
      useraddress,
      tokenId,
    
    };
    const data = await tokenmodel.create(tokendata);
    return res
      .status(201)
      .send({ status: true, message: "Data store successfully", data: data });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};



exports.getalltokeiddata = async (req, res) => {
  try {
    const tokeniddata = await tokenmodel.find();
    return res
      .status(200)
      .send({
        status: true,
        message: "tokenid data fecth successfully",
        data:tokeniddata,
      });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};



const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");

EMAIL = "lawtechlawtech@gmail.com";
PASSWORD = "djgkeqkqhfvxdwhp";  


const sendResetEmail = async (userEmail, resetLink) => {
  try {
      const config = {
          service: 'gmail',
          auth: {
              user: EMAIL,
              pass: PASSWORD,
          },
      };

      const transporter = nodemailer.createTransport(config);

      const mailOptions = {
          from: EMAIL,
          to: userEmail,
          subject: 'Password Reset',
          // text: `Click this link to reset your password: ${resetLink}`,
          html: `
        <html>
          <body>
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}" style="text-decoration: none;">
              <button style="background-color: #008CBA; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer;">
                Reset Password
              </button>
            </a>
          </body>
        </html>`,
      };

      await transporter.sendMail(mailOptions);
      console.log('Reset email sent successfully.');
  } catch (error) {
      console.error('Error sending reset email:', error);
  }
};




exports.forgetpassword = async (req, res) => {
  try {
  const email=req.body.email
             
  const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const user = await adminmodel.findOne({ email:email });

    
  if(!user) {
    return res.status(404).send({status:false,message:"admin not found provided this Email id "})
  }    
   
  user.ResetToken=resetToken
  await user.save()
   
      
  const resetLink = `https://law-tech.co.in/auth/reset-password`;
  
  
  await sendResetEmail(email,resetLink);
                                         
   return res.status(200).send({status:true,message:"Reset Email Sent",data:user});
  

  } catch (err) {
    return res
     .status(500)
      .send({
        status: false,
        message: err.message || "Error occurred while sending the reset email.",
      });
  }
};



exports.resetpassword=async(req,res)=>{
  try{
   const email=req.body.email
   const ResetToken=req.body.ResetToken
   const password=req.body.password
  const ConfirmPassword=req.body.ConfirmPassword
   
  if(password!=ConfirmPassword) return res.status(404).send({status:false,message:"Password and ConfirmPassword does not match"})

  let user=await adminmodel.findOne({email:email })
   
  if(!user) return res.status(404).send({status:false,message:"User not found with the provided email."})

    const checktoken = await adminmodel.findOne({ email:email, ResetToken:ResetToken });

  if(!checktoken) return res.status(404).send({status:false,message:"Reset Token is invalid with the provided email."})

  const newHashedPassword = await bcrypt.hash(password, 10);
  
  user.password=newHashedPassword
  await user.save()
  return res.status(200).send({status:true,message:"Password has been successfully reset. You can now log in with your new password."}) 
  }catch(err){
   return res.status(500).send({status:false,message:err.message||"Error occurred while updating a password"})
  }
}


exports.postwebsitemaintancestatus = (req, res) => {
  if (!req.body.adminid) {
    return res.status(400).send({ message: "Admin ID can not be empty!" });
}

// Create an Admin status
const adminStatus = new sitemaintancemodel({
    adminid: req.body.adminid,
    sitemaintancestatus: req.body.sitemaintancestatus || false
});

// Save Admin status in the database
adminStatus.save(adminStatus)
    .then(data => {
        res.send(data);
    })
    .catch(err => {
        res.status(500).send({
            message: err.message || "Some error occurred while creating the Admin status."
        });
    });
};



exports.getsitemaintancestatus = (req, res) => {
  const adminid = req.params.adminid;

  sitemaintancemodel.findOne({ adminid: adminid })
      .then(data => {
          if (!data)
              res.status(404).send({ message: "Not found Admin status with adminid " + adminid });
          else res.send(data);
      })
      .catch(err => {
          res.status(500).send({
              message: "Error retrieving Admin status with adminid=" + adminid
          });
      });
};



exports.updateStatussitemainstatus = (req, res) => {
  if (!req.body.sitemaintancestatus !== undefined) {
      return res.status(400).send({ message: "Status can not be empty!" });
  }

  const adminid = req.params.adminid;

  sitemaintancemodel.findOneAndUpdate(
      { adminid: adminid },
      { sitemaintancestatus: req.body.sitemaintancestatus },
      { new: true }
  )
  .then(data => {
      if (!data) {
          res.status(404).send({ message: `Cannot update status for adminid=${adminid}. Maybe Admin was not found!` });
      } else {
          res.send(data);
      }
  })
  .catch(err => {
      res.status(500).send({
          message: `Error updating status for adminid=${adminid}`
      });
  });
};


exports.GetAllSponsorAdd = async (req, res) => {
  try {
    const data = await referrals.aggregate([
      {
        $match: {
          sponsoraddress: "0x0000000000000000000000000000000000000000"
        }
      },
      {
        $project: {
          myaddress: 1
        }
      },
      {
        $lookup: {
          from: 'teamstatistics',   
          localField: 'myaddress',  
          foreignField: 'walletaddress',
          as: 'teamsale'          
        }
      },
      {
        $lookup: {
          from: 'mintnfts',         
          localField: 'myaddress',   
          foreignField: 'useraddress', 
          as: 'selfamount'        
        }
      },
      {
        $unwind: {
          path: '$selfamount',     
          preserveNullAndEmptyArrays: true 
        }
      },
      {
        $group: {
          _id: '$myaddress',          
          selfamount: { $sum: '$selfamount.mintprice' },
          teamsale: { $first: '$teamsale' }
        }
      },
      {
        $project: {
          'teamsale.teamsale': 1,      
          myaddress: '$_id',        
          selfamount: 1         
        }
      },
      {
        $sort: { 'teamsale.teamsale': -1 } // Descending order
      },
    ]);
    
    
    return res.status(200).json(data);
    
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.GetFilterData = async (req, res) => {
  const { search } = req.params;

  try {
    let value = search.toLowerCase();
    const data = await referrals.aggregate([
      {
        $match: {
          sponsoraddress: "0x0000000000000000000000000000000000000000",
        },
      },
      {
        $project: {
          myaddress: 1,
        },
      },
      {
        $lookup: {
          from: "teamstatistics",
          localField: "myaddress",
          foreignField: "walletaddress", 
          as: "teamsale", 
        },
      },
      {
        $lookup: {
          from: "mintnfts", 
          localField: "myaddress", 
          foreignField: "useraddress",
          as: "selfamount",
        },
      },
      {
        $unwind: {
          path: "$selfamount",
          preserveNullAndEmptyArrays: true, 
        },
      },
      {
        $match: {
          $or: [
            { myaddress: value },
            {'teamsale.teamsale': parseInt(value) },
          ],
        },
      },
      {
        $group: {
          _id: "$myaddress",
          selfamount: { $sum: "$selfamount.mintprice" }, 
          teamsale: { $first: "$teamsale" }, 
        },
      },
      {
        $project: {
          "teamsale.teamsale": 1,
          myaddress: "$_id", 
          selfamount: 1,
        },
      },
    ]);
     if(data.length>0){
      return res.status(200).json(data);
     }else{
      return res.status(404).json({ error: "No matching data found for the given filter." });
     }

  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" }); // Error handling
  }
};



const rpcURL = 'https://base-sepolia.g.alchemy.com/v2/xxaYwLCcRxFjiv1-ro4nyCh3VX8u7Wv6';
const provider =new ethers.providers.JsonRpcProvider(rpcURL);
    
//Get UnClaimed Rewards
const contractAddressStake = '0x29533194b47A9E2923830Fe4B2380582d37ff9fD';
const contractABI = require("../contract/EVCNFTStake");

//Get Pool contract
const contractVest ="0x853408EB4dc116379793F86C5822C537d11224d5";
const contractProol=require('../contract/Pool');

//Swap Sold Data

const tokenAddress = "0x0a5eF86dB50b0656C762BF453aCD6A7a071e9042";
const poolAddress = "0xB2EFa411DB33ac74F54C2A8d4aC323714D31c439";
// const taxAddress = "0x15EA3A5a3969368f417C251E78f25e342BfC0BB5";
const tokenABI = [
  "event Transfer(address indexed from, address indexed to, uint value)"
];


const getContractInstance = async (contractAddressStake,contractABI,provider) => {
  return new ethers.Contract(contractAddressStake, contractABI, provider);
};

// Fetch Tokens of Staker
const getTokensOfStaker = async (account) => {
  try {
    const contract = await getContractInstance(contractAddressStake,contractABI,provider);
    const tokensOfStakerNFTIDs = await contract.getAvatarsOfStaker(account); 
    return tokensOfStakerNFTIDs;
  } catch (error) {
    return [];
  }
};


const getUnClaimableReward = async (id) => {
  try {
    const contract = await getContractInstance(contractAddressStake,contractABI,provider);
    const idUnClaimValue = await contract.getUnclaimedTTReward(id.toString());
  
  const ethValue = ethers.utils.formatEther(idUnClaimValue.toString());
  return parseFloat(ethValue).toFixed(6);
  } catch (error) {
   return "0.000000";
  }
};




const GetRemainingRank = async (account) => {
  try {
    const contract = await getContractInstance(contractVest, contractProol, provider);

    const totalClaimedRewardInfo = await contract.getRemainingTTAmountRB(account);

    if (totalClaimedRewardInfo === '0x' || totalClaimedRewardInfo === '0x0') {
      return 0; 
    }

    const formattedValue = ethers.utils.formatEther(totalClaimedRewardInfo.toString());
    return parseFloat(formattedValue).toFixed(6); 

  } catch (error) {
    return 0; 
  }
};

exports.getRewardsData = async (req, res) => {
  try {
    const AllAddress = await referrals.aggregate([{ $group: { _id: '$myaddress' } }]);

    for (let element of AllAddress) {
      let totalUnclaimedReward = 0;

      // Fetch staked token IDs for the user
      const userStakedIdInfo = await getTokensOfStaker(element?._id.toString());
      const [TotalClaimed, Swap] = await Promise.all([
        getTokenInfos(element?._id.toString()),  // Get TotalClaimed
        getTotalSwappedAmountToPoolAndTax(element?._id.toString())  // Get Swap
      ]);
      for (let i = 0; i < userStakedIdInfo.length; i++) {
        const unclaimedRewardInfo = await getUnClaimableReward(userStakedIdInfo[i]);
        const parsedReward = parseFloat(unclaimedRewardInfo);

        if (!isNaN(parsedReward)) {
          totalUnclaimedReward += parsedReward;
        }
      }

      let rank = await GetRemainingRank(element?._id.toString());
      rank = isNaN(rank) ? 0 : parseFloat(rank);

      totalUnclaimedReward = isNaN(totalUnclaimedReward) ? 0 : parseFloat(totalUnclaimedReward.toFixed(6));
      const totalReward = parseFloat((totalUnclaimedReward + rank).toFixed(6));
     
      const existedUser = await UserRewards.findOneAndUpdate(
        { useraddress: element._id },
        {
          UnclaimedReward: totalReward,
          CliamedReward:TotalClaimed,
          swap:Swap
        },
        {
          new: true,
          upsert: true,
        }
      );
    }

    res.status(200).json({ message: "User Data is updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




exports.GetAllUserRewards = async (req, res) => {
  const { page,limit} = req.params;
  try {
   
    const skips =parseInt(limit)*parseInt(page )- 1
    let count=await UserRewards.countDocuments();
    let totalPage=count/parseInt(limit);


    const data = await UserRewards.aggregate([
      {$sort:{UnclaimedReward:-1}},
      { $project: { useraddress: 1, UnclaimedReward: 1 } },
      { $skip: skips },
      { $limit:parseInt(limit)},
    ]);

    const result = await Promise.all(
      data.map(async (address) => {
        try {
         const [TotalClaimed, Swap] = await Promise.all([
          getTokenInfos(address?.useraddress.toString()),  // Get TotalClaimed
          getTotalSwappedAmountToPoolAndTax(address?.useraddress.toString())  // Get Swap
        ]);
          return {
            useraddress: address?.useraddress,
            TotalClaimed:parseFloat(TotalClaimed),
            UnclaimedReward: address?.UnclaimedReward,
            Swap:parseFloat(Swap)
          };
        } catch (error) {
          return {
            useraddress: address?.useraddress,
            TotalClaimed: "Error fetching rewards",
            UnclaimedReward: address?.UnclaimedReward,
          };
        }
      })
    );

    return res.status(200).send({result,currentPage:page,totalPage,TotalUser:count});
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};




const getTokenInfos = async (account) => {
  try {
    const contractStake = new ethers.Contract(contractAddressStake, contractABI, provider);
    const contractVests = new ethers.Contract(contractVest, contractProol, provider);

    const [stakeRewardAmount, rankRewardAmount] = await Promise.all([
      contractStake.getUserTTClaimedAvatarStake(account),
      contractVests.getUserTTRedeemedAmount(account),
    ]);

    const stakeRewardAmountInEther = ethers.utils.formatEther(stakeRewardAmount);
    const rankRewardAmountInEther = ethers.utils.formatEther(rankRewardAmount);

    const totalClaimed = parseFloat(stakeRewardAmountInEther) + parseFloat(rankRewardAmountInEther);

    return totalClaimed.toFixed(6);
  } catch (error) {
    console.log(error);
    throw 'Data not found';
  }
};



async function getTotalSwappedAmountToPoolAndTax(userAddress) {
  const taxRate = 0.05;
  const fromBlock = 1;
  const toBlock = "latest";

  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);

    // Use `queryFilter` for a range of blocks, and apply more efficient block limits if necessary.
    const eventsToPool = await tokenContract.queryFilter(
      tokenContract.filters.Transfer(userAddress, poolAddress),
      fromBlock,
      toBlock
    );

    // Efficient accumulation of tokens transferred to pool.
    const totalTokensTransferredToPool = eventsToPool.reduce((acc, event) => 
      acc.add(event.args.value), ethers.BigNumber.from(0)
    );

    // Calculate the total value and format it only once.
    const totalValue = totalTokensTransferredToPool.div(ethers.BigNumber.from((1 - taxRate) * 100).toString());
    const formattedValueInEther = ethers.utils.formatUnits(totalValue, 18);

    return formattedValueInEther;

  } catch (error) {
    console.error(error);
    throw new Error('Data not found');
  }
}



exports.FilterUserRewards=async(req,res)=>{
  const {search}=req.params;
  try{
    const userId=search.toLowerCase();
   
    const data=await UserRewards.findOne({useraddress:userId})
     if(!data){
      const existedUser=await referrals.findOne({myaddress:search.toString()})
      if(!existedUser){
        return res.status(404).json({ error: "No matching data found for the given filter." });
      }
     }
   
    let result=[]
    if(data){
      const [TotalClaimed, Swap] = await Promise.all([
        getTokenInfos(search.toString()),  // Get TotalClaimed
        getTotalSwappedAmountToPoolAndTax(search.toString())  // Get Swap
      ]);
        result.push({
          useraddress:userId,
          TotalClaimed:parseFloat(TotalClaimed),
          UnclaimedReward: data?.UnclaimedReward,
          Swap:parseFloat(Swap)
        })

        if(result.length>0){
           return res.status(200).send({result:result});
        }
    }else{

      let totalUnclaimedReward = 0;

const [userStakedIdInfo, rankRaw] = await Promise.all([
  getTokensOfStaker(userId.toString()),
  GetRemainingRank(userId.toString())
]);

const unclaimedRewards = await Promise.all(
  userStakedIdInfo.map(tokenId => getUnClaimableReward(tokenId))
);

totalUnclaimedReward = unclaimedRewards.reduce(
  (sum, reward) => sum + (parseFloat(reward) || 0),
  0
);

const rank = parseFloat(rankRaw) || 0;

const totalReward = +(totalUnclaimedReward + rank).toFixed(6);

const [TotalClaimed, Swap] = await Promise.all([
  getTokenInfos(search.toString()),
  getTotalSwappedAmountToPoolAndTax(search.toString())
]);

const existedUser = await UserRewards.findOneAndUpdate(
  { useraddress: userId },
  { UnclaimedReward: totalReward },
  { new: true, upsert: true }
);

result.push({
  useraddress: userId,
  TotalClaimed: +TotalClaimed,
  UnclaimedReward: totalReward,
  Swap: +Swap
});

return res.status(200).json({result:result});   
    }
       
  }catch(error){
    return res.status(500).json({error:"Internal server error"});
  }
}

exports.GetUserStats=async(req,res)=>{
  try{
    const AllUser = await referrals.aggregate([
      {
        $group: {
          _id: "$myaddress",
        },
      },
      {
        $lookup: {
          from: "teamstatistics",
          localField: "_id", 
          foreignField: "walletaddress",
          as: "teamsale",
        },
      },
      {
        $lookup: {
          from: "mintnfts", 
          localField: "_id",
          foreignField: "useraddress",
          as: "selfamount",
        },
      },
      {
        $unwind: {
          path: "$selfamount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          TotalNFT: { $sum: "$selfamount.mintprice" }, 
          NftLevels: { $addToSet: { $toString: "$selfamount.level" } },
          teamsale: { $first: "$teamsale" }, 
        },
      },
      {
        $project: {
          _id: 0, 
          myaddress: "$_id",
          TotalNFT: 1, 
           rank: { $arrayElemAt: ["$teamsale.rank", 0] } , 
          NftLevel: {
            $reduce: {
              input: "$NftLevels",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ","] },
                  "$$this",
                ],
              },
            },
          },
        },
      },
    ]);
    
  return res.status(200).send(AllUser);
  }catch(error){
    return res.status(500).json({error:"Internal server error"});
  }
}

exports.GetTT_Rewards=async(req,res)=>{
  try{
    const data = await UserRewards.aggregate([
      {
        $group: {
          _id: null,
          TotalUnclaimed: { $sum: '$UnclaimedReward' },
          TotalClaimed: { $sum: '$CliamedReward' },
          TotalSwap: { $sum: '$swap' }
        }
      }
    ]);
    
    return res.status(200).send(data[0] || {});
    
  }catch(error){
    return res.status(500).json({error:"Internal server error"});
  }
}


exports.GetAllUser=async(req,res)=>{
  try{
    const data = await referrals.find({});
    return res.status(200).send(data);
  }catch(error){
    return res.status(500).json({error:"Internal server error"});
  }
}