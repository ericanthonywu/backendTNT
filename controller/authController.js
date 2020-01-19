const {user: User, vet: Vet} = require('../model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const nodeMailer = require('nodemailer');

exports.login = (req, res) => {
    const {usernameOrEmail, password, loginWithGoogle, loginWithFacebook} = req.body;
    User.findOne({
        $or: [
            {username: usernameOrEmail},
            {email: usernameOrEmail}
        ]
    }).select("username password email profile_picture email_status loginWithFacebook loginWithGoogle").then(data => {
        if (data) {
            if (!data.email_status) {
                return res.status(403).json()
            }

            if (!data.loginWithFacebook || !data.loginWithGoogle) {
                bcrypt.compare(password, data.password).then(check => {
                    if (!check) {
                        return res.status(403).json()
                    }
                }).catch(err => res.status(500).json(err))
            }
            const {profile_picture} = data;

            delete data.profile_picture;
            delete data.password;
            delete data.email_status;
            delete data.loginWithFacebook;
            delete data.loginWithGoogle;
            jwt.sign({
                username: data.username,
                email: data.email,
                id: data._id,
                FCMToken: FCMToken
            }, process.env.JWTTOKEN, {expiresIn: "100000h"}, (err, token) => {
                data.profile_picture = profile_picture;
                return res.status(200).json({
                    _token: token,
                    username: data.username,
                    profile_picture: data.profile_picture,
                    id: data._id,
                    email: data.email,
                });
            })

        } else {
            return res.status(404).json()
        }
    }).catch(err => res.status(500).json(err))
};
exports.register = (req, res) => {
    const {username, password, email, noHp, loginWithGoogle, loginWithFacebook} = req.body;
    if (!username && !email) {
        return res.status(400).json()
    }
    const userData = {
        username: username,
        email: email,
        phoneNumber: noHp || "0",
        loginWithGoogle: loginWithGoogle || "",
        loginWithFacebook: loginWithFacebook || ""
    };
    if (email) {
        if (!loginWithFacebook && !loginWithGoogle) {
            console.log('hash')
            bcrypt.hash(password, parseInt(process.env.BcryptSalt)).then(password => {
                const token = Math.floor((Math.random() * 1000000) + 1); //generate 6 number token
                userData.password = password
                userData.email_verification_token = token;
                userData.email_expire_token = moment(Date.now()).add(3, "minutes").toISOString();
                const transpoter = nodeMailer.createTransport({
                    host: "smtp.gmail.com",
                    port: process.env.EMAILPORT,
                    secure: true,
                    service: "Gmail",
                    requireTLS: true,
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.EMAILPASSWORD
                    }
                });
                const mailOption = {
                    from: "Tail 'n Tales Email Verification",
                    to: email,
                    subject: "Email Verification",
                    html: `Hello ${username}! Thank you for registering, your token verification is <b>${token}</b>.
                        IMPORTANT! NEVER TELL YOUR TOKEN TO ANYONE!`
                };
                transpoter.sendMail(mailOption, err => {
                    if (err) {
                        return res.status(500).json(err)
                    }
                });
            }).catch(err => res.status(500).json(err))
        } else {
            userData.email_status = true;
            userData.loginWithFacebook = loginWithFacebook || false
            userData.loginWithGoogle = loginWithGoogle || false
        }
        new User(userData).save()
            .then(userDataDatabase => {
                jwt.sign({
                    username: userData.username,
                    email: userData.email,
                    id: userDataDatabase._id
                }, process.env.JWTTOKEN, {expiresIn: "100000h"}, (err, token) => {
                    return res.status(201).json({
                        _token: token,
                        id: userDataDatabase._id,
                        profile_picture: userDataDatabase.profile_picture,
                        username: userData.username,
                        email: userData.email,
                    });
                })
            })
            .catch(err => res.status(500).json(err))
    } else {
        return res.status(403).json()
    }
};

exports.verifyEmail = (req, res) => {
    const {token, email} = req.body;
    User.countDocuments({
        email: email,
        email_verification_token: token,
        email_expire_token: {$gte: moment(Date.now()).toISOString()}
    })
        .then(doc => {
            if (doc) {
                User.findOneAndUpdate({email: email}, {email_status: true, email_verification_token: null})
                    .then(() => res.status(202).json())
                    .catch(err => res.status(500).json(err));
            } else {
                return res.status(404).json({msg: "Token not found or has been expired"})
            }
        }).catch(err => res.status(500).json(err))
};

exports.loginVet = (req, res) => {
    const {usernameOrEmail, password} = req.body;
    Vet.findOne({
        $or: [
            {username: usernameOrEmail},
            {email: usernameOrEmail}
        ]
    }).select("username password email profile_picture email_status").then(data => {
        if (data) {
            bcrypt.compare(password, data.password).then(check => {
                if (check) {
                    jwt.sign({
                        username: data.username,
                        email: data.email,
                        id: data._id
                    }, process.env.JWTTOKEN, {expiresIn: "100000h"}, (err, token) => {
                        return res.status(200).json({
                            _token: token,
                            username: data.username,
                            profile_picture: data.profile_picture,
                            email: data.email,
                            id: data._id
                        });
                    },)
                } else {
                    return res.status(403).json()
                }
            }).catch(err => res.status(500).json(err))
        } else {
            return res.status(404).json()
        }
    }).catch(err => res.status(500).json(err))
};
exports.registerVet = (req, res) => {
    const {username, password, email, noHp, street, lat, long} = req.body;
    if (!username && !password) {
        return res.status(403).json()
    }
    if (email != null) {
        bcrypt.hash(password, Number(process.env.BcryptSalt)).then(password => {
            const vetData = {
                username: username,
                password: password,
                email: email || null,
                phoneNumber: noHp || "0",
                street: street,
                session: {
                    coordinates: [long, lat],
                    last_login: moment(Date.now()).toISOString()
                }
            };
            new Vet(vetData).save()
                .then(() => res.status(201).json())
                .catch(err => res.status(500).json(err))

        }).catch(err => res.status(500).json(err))
    } else {
        return res.status(403).json()
    }
};

exports.verifyEmailVet = (req, res) => {
    const {token, email} = req.body;
    Vet.countDocuments({
        email: email,
        email_verification_token: token,
        email_expire_token: {$gte: moment(Date.now()).toISOString()}
    })
        .then(doc => {
            if (doc) {
                Vet.findOneAndUpdate({email: email}, {email_status: true, email_verification_token: null})
                    .then(() => res.status(202).json())
                    .catch(err => res.status(500).json(err));
            } else {
                return res.status(404).json({msg: "Token not found or has been expired"})
            }
        }).catch(err => res.status(500).json(err))
};

exports.userFCMToken = (req, res) => {
    User.findByIdAndUpdate(res.userData.id,{
        fcmToken: req.body.fcmToken
    }).then(() => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.vetFCMToken = (req, res) => {
    Vet.findByIdAndUpdate(res.userData.id,{
        fcmToken: req.body.fcmToken
    }).then(() => res.status(200).json())
        .catch(err => res.status(500).json(err))
}
