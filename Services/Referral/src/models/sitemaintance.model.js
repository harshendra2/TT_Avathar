module.exports = mongoose => {
    var schema = mongoose.Schema(
        {   
              adminid:{ type:Number},
            sitemaintancestatus: { type:Boolean,default: false},
             
        },
        { timestamps: true }
    );

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Admin = mongoose.model("sitemaintance", schema);
    return Admin;
};
