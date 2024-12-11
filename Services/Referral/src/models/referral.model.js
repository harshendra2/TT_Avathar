module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        sponsoraddress:{
          type: String,
          set: v => v.toLowerCase(),
          index:true
        },
        myaddress: {
          type: String,
          set: v => v.toLowerCase(),
          index:true
        },
        nft:Array
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Referral = mongoose.model("referral", schema);
    return Referral;
  };
  
