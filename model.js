const mongoose = require('mongoose');

// if (process.env.NODE_ENV === "development") {
//     mongoose.connect(process.env.MONGOURL, {
//         useNewUrlParser: true,
//         keepAlive: true,
//         keepAliveInitialDelay: 300000,
//         useFindAndModify: false,
//         useCreateIndex: true,
//         useUnifiedTopology: true
//     }).then(_ => mongoose.connection.db.on('error', console.error.bind(console, 'connection error:')))
//         .catch(err => console.log(err));
// } else {
    mongoose.connect(process.env.MONGOURL, {
        auth: {authSource: "admin"},
        user: process.env.PROD_MONGOUSER,
        pass: process.env.PROD_MONGOPASSWORD,
        useNewUrlParser: true,
        keepAlive: true,
        keepAliveInitialDelay: 300000,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true
    }).then(_ => mongoose.connection.db.on('error', console.error.bind(console, 'connection error:')))
        .catch(err => console.log(err));
// }

const vetSchema = new mongoose.Schema({
    username: {type: String, required: true, trim: true, unique: true},
    email: {type: String, unique: true, trim: true,},
    expYear: {type: Number},
    KTP: {type: String, trim: true},
    cert_id: {type: String, trim: true, select: false},
    password: {type: String, required: true, select: false},
    promoted: {type: Boolean, default: false},
    street: {type: String},
    bio: {String},
    session: {
        device_name: {type: String},
        device_token: {type: String},
        type: {type: String, default: 'Point'},
        coordinates: {type: [Number], index: '2dsphere'},
        last_login: {type: Date},
        last_logout: {type: Date},
        status: {type: Boolean}
    },
    dayOfDuty: [{type: Number}],
    forgot_password_token: {type: String},
    forgot_password_expire_token: {type: Date},
    profile_picture: {type: String, default: "default.png"},
    profile_picture_last_changed_at: {type: Date},
    password_last_changed_at: {type: Date},
    fcmToken: {type: String},
    socketId: {type: String},
    ban: {type: Boolean, default: false}
}, {
    weights: { //apply index
        username: 5,
        email: 2,
        session: '2dsphere'
    },
    timestamps: true
});

exports.vet = mongoose.model("vet", vetSchema);

const chatSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectID, ref: 'user'},
    vet: {type: mongoose.Schema.Types.ObjectID, ref: 'vet'},
    // participans: [{type: mongoose.Schema.Types.ObjectID, ref: 'user'}],
    status: {type: Boolean, default: true},
    message: [{
        user: {type: mongoose.Schema.Types.ObjectID, ref: 'user'},
        vet: {type: mongoose.Schema.Types.ObjectID, ref: 'vet'},
        message: {type: String, required: true},
        file: {type: String},
        read: {type: Boolean, default: false},
        time: {type: Date, default: Date.now()}
    }]
});

exports.chat = mongoose.model("chat", chatSchema);

const userSchema = new mongoose.Schema({
    username: {type: String, required: true, trim: true, unique: true},
    email: {type: String, unique: true, required: true},
    email_verification_token: {type: String, select: false},
    email_expire_token: {type: Date},
    email_verified_at: {type: Date},
    email_status: {type: Boolean, default: false},
    phoneNumber: {type: String},
    phoneCode: {type: Number, default: 62},
    password: {type: String, select: false},
    loginWithGoogle: {type: String, default: ""},
    loginWithFacebook: {type: String, default: ""},
    session: [{
        device_name: {type: String},
        device_token: {type: String},
        lat: {type: Number},
        long: {type: Number},
        last_login: {type: Date},
        last_logout: {type: Date},
        status: {type: Boolean}
    }],
    notification: [{
        name: {type: String},
        vet: {type: mongoose.Schema.Types.ObjectID, ref: 'vet'},
        type: {type: String},
        createdAt: {type: Date, default: Date.now()}
    }],
    pet: [{
        name: {type: String},
        photo: {type: String},
        birthDate: {type: Date},
        gender: {type: String},
        status: {type: String},
        species: {String},
        createdAt: {type: Date, default: Date.now()}
    }],
    forgot_password_token: {type: String},
    forgot_password_expire_token: {type: Date},
    profile_picture: {type: String, default: "default.png"},
    profile_picture_last_changed_at: {type: Date},
    password_last_changed_at: {type: Date},
    archived_chat: [{type: mongoose.Schema.Types.ObjectID, ref: 'chat'}],
    appointment: [{
        vet: {type: mongoose.Schema.Types.ObjectID, ref: 'vet'},
        pet: {type: mongoose.Schema.Types.ObjectID},
        time: {type: Date, default: Date.now()}
    }],
    doctorFavourite: [{type: mongoose.Schema.Types.ObjectID, ref: 'vet'}],
    address: {type: String},
    fcmToken: {type: String},
    socketId: {type: String},
    ban: {type: Boolean, default: false}
}, {
    weights: { //apply index
        username: 5,
        email: 2
    },
    timestamps: true
});

exports.user = mongoose.model("user", userSchema);

const appointmentSchema = new mongoose.Schema({
    vet: {type: mongoose.Schema.Types.ObjectID, ref: 'vet'},
    clinic: {type: mongoose.Schema.Types.ObjectID, ref: 'clinic'},
    time: {type: Date},
    timeRequested: {type: Date},
    user: {type: mongoose.Schema.Types.ObjectID, ref: 'user'},
    pet: {type: mongoose.Schema.Types.ObjectID, ref: 'user.pet'},
    status: {type: Number, default: 0}, //1 = edit requested, 2 = edit accepted
    reason: {type: String}
}, {
    timestamps: true
});

exports.appointment = mongoose.model('appointment', appointmentSchema)

const clinicSchema = new mongoose.Schema({
    vet: [{type: mongoose.Schema.Types.ObjectID, ref: 'vet'}],
    username: {type: String, unique: true},
    password: {type: String},
    email: {type: String},
    address: {type: String},
    ban: {type: Boolean, default: false},
    email_token: {type: Number},
    email_expire_token: {type: Date},
    socketId: {type: String},
    photo: [{type: String, unique: true}],
    session: {
        type: {type: String, default: 'Point'},
        coordinates: [{type: Number, index: '2dsphere'}],
        status: {type: Boolean}
    },
}, {
    weights: { //apply index
        username: 5,
        email: 2,
        session: '2dsphere'
    },
    timestamps: true
});

exports.clinic = mongoose.model('clinic', clinicSchema)

const adminSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    password: {type: String},
}, {
    timestamps: true
});

exports.admin = mongoose.model('admin', adminSchema)

const blogSchema = new mongoose.Schema({
    html: {type: String},
    title: {type: String, required: true},
    publish: {type: Boolean, default: true}
}, {
    timestamps: true
});

exports.blog = mongoose.model('blog', blogSchema)
