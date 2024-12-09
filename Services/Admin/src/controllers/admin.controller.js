const db = require("../models");
const sitemaintancemodel=db.sitemaintancestatus
const adminmodel = db.admin;
const bcrypt = require("bcryptjs");
const mintnft = db.mintnfts
const referrals = db.referrals
const Teamstatistic = db.teamstatistics
const { generateToken } = require("../helpers/userhelpers");
const blanknft = db.blanknft;

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
    const token = generateToken(admin.email, admin._id);
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
