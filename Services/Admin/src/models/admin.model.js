module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        mobile: { type: Number, required: true },
        email: { type: String, required: true, unique: true,index:true },
        password: { type: String, required: true },
        ResetToken:{ type: String, }
      },
      { timestamps: true }
    );
  
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    const Admin= mongoose.model("admin", schema);
    return Admin;
  };
  
