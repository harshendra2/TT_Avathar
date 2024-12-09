module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        useraddress:{
          type: String,
          set: v => v.toLowerCase(),
          index:true
        },
        level: {type:Number,index:true},
        mintprice:Number,
        referreraddress:{
          type: String,
          //set: v => v.toLowerCase(),
          default: null
        },
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Mintnft = mongoose.model("mintnft", schema);
    return Mintnft;
  };
  
