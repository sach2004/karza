const mongoose = require('mongoose');

const plm = require("passport-local-mongoose");

mongoose.connect("mongodb+srv://sachin:sachin@cluster0.nlf26rw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    
    },
    email: { 
        type: String,
        required: true,
        unique: true
    },
    phoneNumber: { 
        type: String,
        required: false 
    },
    name: {
        type:String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },

    lend: [{
            borrowers:{
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'User'
            },
            lendername : {
                type: String
            },
            lenderdp : {
                type: String
            },
            amount: Number
    }],

    loan: [{
        lender: {
            
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lendername : {
            type: String
        },
        lenderdp : {
            type: String
        },

        amount: Number
    }],

    loanhistory : [{
        lender: {
            
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lendername : {
            type: String
        },
        lenderdp : {
            type: String
        },

        amount: Number
    }],

    lendhistory : [{
        lender: {
            
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lendername : {
            type: String
        },
        lenderdp : {
            type: String
        },

        amount: Number
    }],
    dp: {
        type: String,
       
    },

});

userSchema.plugin(plm);

module.exports = mongoose.model('User', userSchema);
