module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        useraddress:{
          type: String,
          set: v => v.toLowerCase(),
          index:true
        },
        UnclaimedReward: {type:Number},
        CliamedReward: {type:Number},
        swap: {type:Number}
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const UserReward = mongoose.model("UserReward", schema);
    return UserReward;
  };
  
