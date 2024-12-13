module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        rewardType: {type:String,index:true},
        fromUser: {type:String,index:true},
        toUser: {type:String,index:true},
        rewardAmount:String
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Reward = mongoose.model("rewardtable", schema);
    return Reward;
  };
  