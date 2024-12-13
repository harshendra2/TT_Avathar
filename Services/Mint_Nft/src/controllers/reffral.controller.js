const db = require("../models");
const Referral = db.referrals;
const { clearStoreTeamstatistics,clearRedisKeysByPattern } = require('../config/redis');


exports.create = async (req, res) => {
    try {
      if (!req.body.sponsoraddress) {
        return res.status(400).send({ message: "Sponsor address cannot be empty!" });
      }
  
      if (!req.body.myaddress) {
        return res.status(400).send({ message: "My address cannot be empty!" });
      }
  
      if (req.body.sponsoraddress === req.body.myaddress) {
        return res.status(400).send({ message: "Self-referencing addresses are not allowed." });
      }
  
      const existingReferral = await Referral.findOne({
        sponsoraddress: req.body.sponsoraddress,
        myaddress: req.body.myaddress,
      });
  
      if (existingReferral) {
        if (req.body.nft) {
          const updateData = {
            $push: {
              nft: {
                $each: Array.isArray(req.body.nft) ? req.body.nft : [req.body.nft],
              },
            },
          };
  
          const updatedReferral = await Referral.findByIdAndUpdate(existingReferral._id, updateData, {
            new: true,
            runValidators: true,
          });
  
          if (!updatedReferral) {
            return res.status(404).send({ message: `Referral not found with id ${existingReferral.id}` });
          }
  
          clearStoreTeamstatistics(req.body.sponsoraddress);
          clearStoreTeamstatistics(req.body.myaddress);
          
  
          return res.status(200).send(updatedReferral);
        } else {
          return res.status(200).send(existingReferral);
        }
      } else {
       const referralData = {
          sponsoraddress: req.body.sponsoraddress,
          myaddress: req.body.myaddress,
        };
  
        if (req.body.nft) {
          referralData.nft = req.body.nft;
        }
  
        const newReferral = new Referral(referralData);
  
        const savedReferral = await newReferral.save();
        clearStoreTeamstatistics(req.body.sponsoraddress);
        clearStoreTeamstatistics(req.body.myaddress);
        
        return res.status(201).send(savedReferral);
      }
    } catch (error) {
      console.error("Error handling referral:", error);
  
      if (error.name === 'ValidationError') {
        return res.status(400).send({ message: "Validation error: " + error.message });
      }
  
      return res.status(500).send({ message: "Internal server error while handling referral." });
    }
  };


exports.findAll = (req, res) => {
    Referral.find()
      .then(data => {
        res.send(data);
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving Referrals."
        });
      });
  };

  
exports.findAllPartnerActivity = (req, res) => {
    const address = req.params.address;
    Referral.find({ sponsoraddress: address })
      .then(data => {
        res.send(data);
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving Referrals."
        });
      });
  };
  

  exports.findOne = (req, res) => {
    const id = req.params.id;
     Referral.findById(id)
      .then(data => {
        if (!data)
          res.status(404).send({ message: "Not found Referral with id " + id });
        else res.send(data);
      })
      .catch(err => {
        res
          .status(500)
          .send({ message: "Error retrieving Referral with id=" + id });
      });
  };

  exports.update = (req, res) => {
    if (!req.body) {
      return res.status(400).send({
        message: "Data to update can not be empty!"
      });
    }
  
    const id = req.params.id;
  
    Referral.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot update Referral with id=${id}. Maybe Referral was not found!`
          });
        } else res.send({ message: "Referral was updated successfully." });
      })
      .catch(err => {
        res.status(500).send({
          message: "Error updating Referral with id=" + id
        });
      });
  };


  exports.delete = (req, res) => {
    const id = req.params.id;
  
    Referral.findByIdAndRemove(id, { useFindAndModify: false })
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot delete Referral with id=${id}. Maybe Referral was not found!`
          });
        } else {
          res.send({
            message: "Referral was deleted successfully!"
          });
        }
      })
      .catch(err => {
        res.status(500).send({
          message: "Could not delete Referral with id=" + id
        });
      });
  };

  exports.deleteAll = (req, res) => {
    Referral.deleteMany({})
      .then(data => {
        res.send({
          message: `${data.deletedCount} Referrals were deleted successfully!`
        });
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while removing all Referrals."
        });
      });
  };