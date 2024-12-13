module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        maker: {type:String, set: v => v.toLowerCase(),index:true},
        type: {type:String,index:true},
        from:Number,
        to:Number,
        price:Number
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    const Swap = mongoose.model("swap", schema);
    return Swap;
  };
  