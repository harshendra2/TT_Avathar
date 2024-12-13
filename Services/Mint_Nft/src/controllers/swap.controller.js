const { Promise } = require("mongoose");
const db = require("../models");
const Swap = db.swaps;
const Teamstatistic = db.teamstatistics;


exports.StoreSwaps = async (req, res) => {
    try {

      const SwapInsert = new Swap({
        "maker":req.body.maker,
        "type":req.body.type,
        "from":req.body.from,
        "to":req.body.to,
        "price":req.body.price
        });
      const ResultData = await SwapInsert.save();
     res.send({status:true, message:"Swap Data has been Stored", data:ResultData});
    } catch (error) {
        console.error('Error occurred at line:', error.stack); 
        res.status(500).json({ status: false, error: 'Internal Server Error' });
    }

};

exports.GetSwaps = (req, res) => {
    Swap.find()
      .then(data => {
        res.send({status:true,message:"Get All List Of Swap Transaction",data:data});
      })
      .catch(err => {
        res.status(500).send({
          message:
            err.message || "Some error occurred while retrieving Swap Transaction."
        });
      });
};


exports.getswapdata=async(req,res)=>{
  try{
       const address=req.params.address
            
      const data = await Swap.find({ maker:address }).sort({ createdAt: -1 });
      return res.status(200).send({ status: true,message:"data fetch successfully", data: data });
  }catch(err){
      return res.status(500).send({status:false,message:err.message})
  }
}