module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
          walletaddress: { type: String, index: true,unique:true },
          ownnft: { type: String, index: true },
          totalpartners: Number,
          rank: { type: Number, index: true },
          teamsale: Number,
          teamsalelastweek: Number,
          teamsaleprivousweek:Number,
          adminchangestatus: {
              type: Boolean,
              default: false
          }
      },
      { timestamps: true }
    );
    schema.index({ walletaddress: 1 }, { unique: true });
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });
  
    
    const Teamstatistics = mongoose.model("teamstatistics", schema);
    return Teamstatistics;
  };
  