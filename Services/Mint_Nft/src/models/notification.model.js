module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        walletaddress:  {type:String,index:true,set: v => v.toLowerCase()},
        notification: String,
        readstatus:{
          type:Boolean,
          default: false,
          index:true
      }
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Notification = mongoose.model("notification", schema);
    return Notification;
  };
  