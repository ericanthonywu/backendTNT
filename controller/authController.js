const {user: User, vet: Vet, clinic: Clinic, admin: Admin} = require('../model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const {transpoter, generateToken} = require('../globalHelper')

exports.login = (req, res) => {
    const {email, password} = req.body;
    if (!email) {
        return res.status(400).json({message: 'Email is required'})
    }

    User.findOne({email})
        .select("username password phoneNumber email ban profile_picture email_status loginWithFacebook loginWithGoogle")
        .lean()
        .then(data => {
            if (data) {
                if (data.ban) {
                    return res.status(403).json({message: "You have been banned by admin"})
                }
                if (!data.email_status) {
                    return res.status(403).json({message: "Your email has not verified"})
                }

                if (!data.loginWithFacebook && !data.loginWithGoogle) {
                    bcrypt.compare(password, data.password).then(check => {
                        if (!check) {
                            return res.status(401).json({message: "Your password is incorrect"})
                        }

                        jwt.sign({
                            username: data.username,
                            email: data.email,
                            id: data._id,
                            role: "user"
                        }, process.env.JWTTOKEN, {}, (err, token) => {
                            return res.status(200).json({
                                    message: "login successful",
                                    data: {
                                        token,
                                        username: data.username,
                                        profile_picture: data.profile_picture,
                                        id: data._id,
                                        email: data.email,
                                        phoneNumber: data.phoneNumber,
                                    }
                                }
                            );
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
                    }, process.env.JWTTOKEN, (err, token) => {
                        data.profile_picture = profile_picture;
                        return res.status(200).json({
                                message: "login successful",
                                data: {
                                    token,
                                    username: data.username,
                                    profile_picture: data.profile_picture,
                                    id: data._id,
                                    email: data.email,
                                    phoneNumber: data.phoneNumber,
                                }
                            }
                        );
                    })
                }

            } else {
                return res.status(401).json({message: 'Email / password wrong'});
            }
        }).catch(err => res.status(500).json(err))
};

exports.register = (req, res) => {
    const {username, password, email, noHp, loginWithGoogle, loginWithFacebook} = req.body;
    if (!username && !email && !loginWithFacebook && !loginWithGoogle && !password) {
        return res.status(400).json({message: "request required"})
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
                userData.email_expire_token = moment().add(3, "minutes").toISOString();
                new User(userData).save()
                    .then(userDataDatabase => {
                        transpoter.sendMail({
                            from: "noreply@tailandtale.com",
                            to: email,
                            subject: "Token Verification",
                            html: `Hello ${username}! <br><br>Thank you for registering, your token verification is: <br><br><p style="font-size:24px;"><b>${token}</b></p><br>
                        IMPORTANT! NEVER TELL YOUR TOKEN TO ANYONE!
                        <img alt="TNT Logo" src="http://tailandtale.com/wp-content/uploads/2019/08/tnt_logo_jul19-1.png"/>`
                        }, err => {
                            if (err) {
                                console.log(err)
                            }

                            jwt.sign({
                                    username: userData.username,
                                    email: userData.email,
                                    id: userDataDatabase._id,
                                    role: "user"
                                }, process.env.JWTTOKEN,(err, token) =>
                                    res.status(201).json({
                                        token,
                                        id: userDataDatabase._id,
                                        profile_picture: userDataDatabase.profile_picture,
                                        username: userData.username,
                                        email: userData.email,
                                    })
                            )
                        });
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
                            token,
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

exports.reSendEmail = async (req, res) => {
    const {email, username} = req.body
    const token = await generateToken();

    User.findOneAndUpdate({email}, {
        email_verification_token: token,
        email_expire_token: moment(Date.now()).add(3, "minutes").toISOString(),
    }).then(() => {
        transpoter.sendMail({
            from: "Tail 'n Tales Token Verification",
            to: email,
            subject: "Token Verification",
            html: `Hello! <br><br>Thank you for registering, your token verification is: <br><br><p style="font-size:24px;"><b>${token}</b></p><br>
                        IMPORTANT! NEVER TELL YOUR TOKEN TO ANYONE!
                        <img alt="TNT Logo" src="http://tailandtale.com/wp-content/uploads/2019/08/tnt_logo_jul19-1.png"/>
`
        }, err => {
            if (err) {
                res.status(500).json(err)
            } else {
                res.status(200).json({message: 'Success resend token'})
            }
        });
    })
}

exports.verifyEmail = (req, res) => {
    const {token, email} = req.body;
    if (!token || !email) {
        return res.status(400).json({message: 'token and email is required'})
    }
    User.countDocuments({
        email,
        email_status: false,
        email_verification_token: parseInt(token),
        // email_expire_token: {$gte: moment().toISOString()}
    })
        .lean()
        .then(doc => {
            if (doc) {
                User.findOneAndUpdate({email}, {email_status: true, email_verification_token: null})
                    .then(_ => {
                        User.findOne({email})
                            .select('username profile_picture phoneNumber')
                            .lean()
                            .then(data => {
                                jwt.sign({
                                    username: data.username,
                                    email: data.email,
                                    id: data._id,
                                    role: "user"
                                }, process.env.JWTTOKEN, (err, token) => {
                                    return res.status(200).json({
                                            message: "login successful",
                                            data: {
                                                token,
                                                username: data.username,
                                                profile_picture: data.profile_picture,
                                                id: data._id,
                                                email: data.email,
                                                phoneNumber: data.phoneNumber,
                                            }
                                        }
                                    );
                                })
                            }).catch(err => res.status(500).json(err))
                    })
                    .catch(err => res.status(500).json(err))
            } else {
                return res.status(404).json({message: "Token not found or has been expired"})
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
    }).select("username password ban email profile_picture email_status")
        .lean()
        .then(data => {
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
                        }, process.env.JWTTOKEN, {}, (err, token) => {
                            return res.status(200).json({
                                token,
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
    }).select("password").lean().then(data => {
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
            }, process.env.JWTTOKEN, {}, (err, token) => {
                if (err) {
                    return res.status(500).json(err)
                }
                return res.status(200).json({
                    token,
                    username: username,
                    id: data.id
                })
            })
        }).catch(err => res.status(500).json(err))
    })
}

exports.loginAdmin = (req, res) => {
    const {username, password: inputPassword} = req.body
    if (!username || !inputPassword) {
        return res.status(400).json()
    }
    Admin.findOne({
        username: username
    }).select("password username").lean().then(({password, _id: id, username}) => {
        if (!password) {
            return res.status(404).json()
        }

        bcrypt.compare(inputPassword, password).then(check => {
            if (!check) {
                return res.status(401).json()
            }

            jwt.sign({
                id: id,
                username: username,
                role: "admin"
            }, process.env.JWTTOKEN, {}, (err, token) => {
                if (err) {
                    return res.status(500).json(err)
                }

                res.status(200).json({
                    token,
                    username: username,
                    id: id
                })
            })
        }).catch(err => res.status(500).json(err))
    })
}

exports.migrateAdmin = (req, res) => {
    new Admin({
        username: "superadmin",
        password: bcrypt.hashSync("admin")
    }).save()
        .then(() => res.status(201).json({message: "Success migrate"}))
        .catch(err => res.status(500).json(err))

}

exports.verifyEmailVet = (req, res) => {
    const {token, email} = req.body;

    Vet.countDocuments({
        email,
        email_verification_token: token,
        email_expire_token: {$gte: moment()}
    })
        .lean()
        .then(doc => {
            if (doc) {
                Vet.findOneAndUpdate({email}, {email_status: true, email_verification_token: null})
                    .then(_ => res.status(202).json({message: "Email verified"}))
                    .catch(err => res.status(500).json(err));
            } else {
                return res.status(404).json({message: "Token not found or has been expired"})
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
