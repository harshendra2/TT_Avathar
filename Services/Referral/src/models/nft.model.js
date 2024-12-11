module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        nft: {type:String,index:true},
        level: {type:Number,index:true},
        price:Number,
        bv:Number
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    const Nft = mongoose.model("nft", schema);
    return Nft;
  };
  