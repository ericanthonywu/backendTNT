const {user: User, vet: Vet, clinic: Clinic, admin: Admin} = require('../model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const nodeMailer = require('nodemailer');

exports.login = (req, res) => {
    const {usernameOrEmail, password} = req.body;
    if (!usernameOrEmail) {
        return res.status(400).json()
    }
    User.findOne({
        $or: [
            {username: usernameOrEmail},
            {email: usernameOrEmail}
        ]
    }).select("username password email ban profile_picture email_status loginWithFacebook loginWithGoogle").then(data => {
        if (data.ban) {
            return res.status(403).json({msg: "You have been banned by admin"})
        }
        if (data) {
            if (!data.email_status) {
                return res.status(403).json({msg: "Your email has not verified"})
            }

            if (!data.loginWithFacebook && !data.loginWithGoogle) {
                bcrypt.compare(password, data.password).then(check => {
                    if (!check) {
                        return res.status(401).json()
                    }
                    const {profile_picture} = data;

                    jwt.sign({
                        username: data.username,
                        email: data.email,
                        id: data._id,
                        role: "user"
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
                }).catch(err => {
                    return res.status(500).json(err)
                })
            } else {
                const {profile_picture} = data;

                jwt.sign({
                    username: data.username,
                    email: data.email,
                    id: data._id,
                    role: "user"
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
            }

        } else {
            return res.status(404).json()
        }
    }).catch(err => res.status(200).json(err))
};

exports.register = (req, res) => {
    const {username, password, email, noHp, loginWithGoogle, loginWithFacebook} = req.body;
    if (!username && !email) {
        return res.status(400).json()
    }
    if ((!loginWithFacebook && !loginWithGoogle) && !password) {
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
                    from: "Tail 'n Tales Token Verification",
                    to: email,
                    subject: "Token Verification",
                    html: `Hello ${username}! <br><br>Thank you for registering, your token verification is: <br><br><p style="font-size:24px;"><b>${token}</b></p><br>
                        IMPORTANT! NEVER TELL YOUR TOKEN TO ANYONE!
                        <img alt="TNT Logo" src="http://tailandtale.com/wp-content/uploads/2019/08/tnt_logo_jul19-1.png"/>
`
                };
                new User(userData).save()
                    .then(userDataDatabase => {
                        transpoter.sendMail(mailOption, err => {
                            if (err) {
                                console.log(err)
                            }
                        });
                        jwt.sign({
                                username: userData.username,
                                email: userData.email,
                                id: userDataDatabase._id,
                                role: "user"
                            }, process.env.JWTTOKEN, {}, (err, token) =>
                                res.status(201).json({
                                    _token: token,
                                    id: userDataDatabase._id,
                                    profile_picture: userDataDatabase.profile_picture,
                                    username: userData.username,
                                    email: userData.email,
                                })
                        )
                    })
                    .catch(err => res.status(500).json(err))
            }).catch(err => res.status(500).json(err))
        } else {
            userData.email_status = true;
            userData.loginWithFacebook = loginWithFacebook || false
            userData.loginWithGoogle = loginWithGoogle || false
            new User(userData).save()
                .then(userDataDatabase => {
                    jwt.sign({
                        username: userData.username,
                        email: userData.email,
                        id: userDataDatabase._id,
                        role: "user"
                    }, process.env.JWTTOKEN, {}, (err, token) => {
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
        }
    } else {
        return res.status(403).json()
    }
};

exports.reSendEmail = (req, res) => {
    const {email, username} = req.body
    const token = Math.floor((Math.random() * 1000000) + 1); //generate 6 number token
    User.findOneAndUpdate({email: email}, {
        email_verification_token: token,
        email_expire_token: moment(Date.now()).add(3, "minutes").toISOString(),
    }).then(_ => {
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
            from: "Tail 'n Tales Token Verification",
            to: email,
            subject: "Token Verification",
            html: `Hello ${username}! <br><br>Thank you for registering, your token verification is: <br><br><p style="font-size:24px;"><b>${token}</b></p><br>
                        IMPORTANT! NEVER TELL YOUR TOKEN TO ANYONE!
                        <img alt="TNT Logo" src="http://tailandtale.com/wp-content/uploads/2019/08/tnt_logo_jul19-1.png"/>
`
        };
        transpoter.sendMail(mailOption, err => {
            if (err) {
                return res.status(500).json(err)
            }
        });
    })
}

exports.verifyEmail = (req, res) => {
    const {token, email} = req.body;
    User.countDocuments({
        email: email,
        email_status: false,
        email_verification_token: parseInt(token),
        email_expire_token: {$gte: moment(Date.now()).toISOString()}
    })
        .then(doc => {
            if (doc) {
                User.findOneAndUpdate({email: email}, {email_status: true, email_verification_token: null})
                    .then(_ => res.status(201).json())
                    .catch(err => res.status(500).json(err))
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
    }).select("username password ban email profile_picture email_status").then(data => {
        if (data.ban) {
            return res.status(403).json()
        }
        if (data) {
            bcrypt.compare(password, data.password).then(check => {
                if (check) {
                    jwt.sign({
                        username: data.username,
                        email: data.email,
                        id: data._id,
                        role: "vet"
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
                    return res.status(401).json()
                }
            }).catch(err => res.status(500).json(err))
        } else {
            return res.status(404).json()
        }
    }).catch(err => res.status(500).json(err))
};

exports.registerVet = (req, res) => {
    const {username, password, email, noHp, street, lat, long} = req.body;
    if (!username && !password && !email) {
        return res.status(403).json()
    }

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
            .then(_ => res.status(201).json())
            .catch(err => res.status(500).json(err))

    }).catch(err => res.status(500).json(err))

};

exports.loginClinic = (req, res) => {
    const {username, password} = req.body
    Clinic.findOne({
        username: username
    }).select("password").then(data => {
        if (!data) {
            return res.status(404).json()
        }

        if (data.ban) {
            return res.status(403).json()
        }

        bcrypt.compare(password, data.password).then(check => {
            if (!check) {
                return res.status(401).json()
            }

            jwt.sign({
                id: data.id,
                username: data.username,
                role: "clinic"
            }, process.env.JWTTOKEN, {expiresIn: 100000}, (err, token) => {
                if (err) {
                    return res.status(500).json(err)
                }
                return res.status(200).json({
                    _token: token,
                    username: username,
                    id: data.id
                })
            })
        }).catch(err => res.status(500).json(err))
    })
}

exports.loginAdmin = (req, res) => {
    const {username, password} = req.body
    if (!username || !password) {
        return res.status(400).json()
    }
    Admin.findOne({
        username: username
    }).select("password").then(data => {
        if (!data) {
            return res.status(404).json()
        }

        bcrypt.compare(password, data.password).then(check => {
            if (!check) {
                return res.status(401).json()
            }

            jwt.sign({
                id: data.id,
                username: data.username,
                role: "admin"
            }, process.env.JWTTOKEN, {expiresIn: 100000}, (err, token) => {
                if (err) {
                    return res.status(500).json(err)
                }

                res.status(200).json({
                    _token: token,
                    username: username,
                    id: data.id
                })
            })
        }).catch(err => res.status(500).json(err))
    })
}

exports.migrateAdmin = (req, res) => {
    new Admin({
        username: "superadmin",
        password: bcrypt.hashSync("admin", parseInt(process.env.BcryptSalt))
    }).save()
        .then(_ => res.status(201).json())
        .catch(err => res.status(500).json(err))

}

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
                    .then(_ => res.status(202).json())
                    .catch(err => res.status(500).json(err));
            } else {
                return res.status(404).json({msg: "Token not found or has been expired"})
            }
        }).catch(err => res.status(500).json(err))
};

exports.userFCMToken = (req, res) => {
    User.findByIdAndUpdate(res.userData.id, {
        fcmToken: req.body.fcmToken
    }).then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.vetFCMToken = (req, res) => {
    Vet.findByIdAndUpdate(res.userData.id, {
        fcmToken: req.body.fcmToken
    })
        .then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
}
