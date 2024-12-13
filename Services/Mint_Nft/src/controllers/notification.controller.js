const db = require("../models");
const Notification = db.notifications;

exports.create = (req, res) => {

	console.log("this is req".req)

	if (!req.body.walletaddress) {
    res.status(400).send({ message: "wallet address can not be empty!" });
    return;
  }
   console.log("this is body",req.body)
  const NotificationData = new Notification({
    walletaddress: req.body.walletaddress,
    notification: req.body.notification,
  });

  NotificationData
    .save(NotificationData)
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while creating the Notification."
      });
    });
};

exports.findAll = (req, res) => {
    Notification.find({})
      .then(data => {
        res.send(data);
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving Notifications."
        });
      });
  };

  
exports.findByAddress = (req, res) => {
    const walletaddress = req.params.walletaddress;
    Notification.find({ walletaddress: walletaddress })
      .then(data => {
        res.send(data);
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving Notifications."
        });
      });
  };

  exports.findOne = (req, res) => {
    const id = req.params.id;
     Notification.findById(id)
      .then(data => {
        if (!data)
          res.status(404).send({ message: "Not found Notification with id " + id });
        else res.send(data);
      })
      .catch(err => {
        res
          .status(500)
          .send({ message: "Error retrieving Notification with id=" + id });
      });
  };

  exports.update = (req, res) => {
    if (!req.body) {
      return res.status(400).send({
        message: "Data to update can not be empty!"
      });
    }
  
    const id = req.params.id;
  
    Notification.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot update Notification with id=${id}. Maybe Notification was not found!`
          });
        } else res.send({ message: "Notification was updated successfully." });
      })
      .catch(err => {
        res.status(500).send({
          message: "Error updating Notification with id=" + id
        });
      });
  };

  exports.delete = (req, res) => {
    const id = req.params.id;
  
    Notification.findByIdAndRemove(id, { useFindAndModify: false })
      .then(data => {
        if (!data) {
          res.status(404).send({
            message: `Cannot delete Notification with id=${id}. Maybe Notification was not found!`
          });
        } else {
          res.send({
            message: "Notification was deleted successfully!"
          });
        }
      })
      .catch(err => {
        res.status(500).send({
          message: "Could not delete Notification with id=" + id
        });
      });
  };

  exports.deleteAll = (req, res) => {
    Notification.deleteMany({})
      .then(data => {
        res.send({
          message: `${data.deletedCount} Notifications were deleted successfully!`
        });
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while removing all Notifications."
        });
      });
  };

  exports.deleteNotificationById = async (req, res) => {
    try {
        const id = req.params.id;
        const result = await Notification.findByIdAndDelete(id);
  
        if (!result) {
            return res.status(404).send({ status: false, message: 'Notification not found' });
        }
  
        return res.status(200).send({ status: true, message: 'Notification deleted successfully' });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
  };


  
exports.deletenotificationuseraddress = async (req, res) => {
    try {
      const walletaddress = req.params.walletaddress;
  
      const result = await Notification.deleteMany({ walletaddress: walletaddress });
  
      if (result.deletedCount === 0) {
        return res.status(404).send({ status: false, message: 'No notifications found for the given wallet address' });
      }
  
      res.status(200).send({ status: true, message: 'All notifications deleted successfully' });
    } catch (err) {
      return res.status(500).send({ status: false, message: err.message });
    }
  };
  