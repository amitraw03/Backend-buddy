const mongoose = require ("mongoose");
const {Schema} = mongoose; 

const connectionRequestSchema = new Schema(
    {
        fromUserId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User", //reference to the USer collection
            required:true,
        },
        toUserId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        status:{
            type:String,
            required:true,
            enum:{
                values:["ignored","interested","accepted","rejected"],
                message : `{VALUE} is incorrect status type`,
            }
        },
    },
    {
        timestamps:true,
    }
);

//to makke DB query much efficient by storing such keywords as indexes in D.B
connectionRequestSchema.index({fromUserId:1, toUserId:1});

connectionRequestSchema.pre("save",function (next) {
    const connectionRequest = this;
    // fromUserId != toUserId
    if(connectionRequest.fromUserId.equals(connectionRequest.toUserId)){
       throw new Error(`You can't send request to yourself`);
    }
    next();
});

const ConnectionRequest = new mongoose.model("ConnectionRequest", connectionRequestSchema);
module.exports = ConnectionRequest;