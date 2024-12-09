module.exports = mongoose => {
    var schema = mongoose.Schema(
        {
            walletaddress: { 
                type: String, 
                index: true,
                set: v => v.toLowerCase()
            },
            levelprice:{type:Number},
            blanklevel:{type:Number},
            blankTokenId: { type: Number, index: true },
            status: {type:Boolean},
        },
        { timestamps: true }
    );

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Admin = mongoose.model("blanknft", schema);
    return Admin;
};
