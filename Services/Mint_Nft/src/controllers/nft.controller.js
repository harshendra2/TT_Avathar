const db = require("../models");
const Nfts = db.nfts;

exports.create = async (req, res) => {
    const nftData = {
      nft:req.body.nft,
      price: req.body.price,
      level: req.body.level,
      bv: req.body.bv,
    };
  
    Nfts.create(nftData, (err, nft) => {
      if (err) {
        res.status(500).send({ message: "Error creating NFT: " + err });
      } else {
        res.send(nft);
      }
    });
    };
  
  exports.findAll = (req, res) => {
    Nfts.find()
      .then(data => {
        res.send(data);
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving Nfts."
        });
      });
  };
  
 
  exports.update = (req, res) => {
    if (!req.body) {
      return res.status(400).send({
        message: "Data to update can not be empty!"
      });
    }
  
    const id = req.params.id;
    Nfts.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot update Nft with id=${id}. Maybe Nft was not found!`
          });
        } else res.send({ message: "Nft was updated successfully." });
      })
      .catch(err => {
        res.status(500).send({
          message: "Error updating Nft with id=" + id
        });
      });
  };
  
  // Delete a Nft with the specified id in the request
  exports.delete = (req, res) => {
    const id = req.params.id;
  
    Nfts.findByIdAndRemove(id, { useFindAndModify: false })
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot delete Nft with id=${id}. Maybe Nft was not found!`
          });
        } else {
          res.send({
            message: "Nft was deleted successfully!"
          });
        }
      })
      .catch(err => {
        res.status(500).send({
          message: "Could not delete Nft with id=" + id
        });
      });
  };
  
  
  