const {user: User, vet: Vet, clinic: Clinic, admin: Admin} = require('../model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const nodeMailer = require('nodemailer');

/**
 * User Login, if user was not found, it will register
 *
 * @param {Request<P, ResBody, ReqBody, ReqQuery>|http.ServerResponse} req
 * @param {Response<ResBody>|Request<P, ResBody, ReqBody, ReqQuery>} res
 */
exports.login = (req, res) => {
    const {usernameOrEmail, password} = req.body;
    if (!usernameOrEmail) {
        return res.status(400).json({message: "param usernameOrEmail was required"})
    }

    User.findOne({
        $or: [
            {username: usernameOrEmail},
            {email: usernameOrEmail}
        ]
    }).select("username password email ban profile_picture email_status loginWithFacebook loginWithGoogle")
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
                            return res.status(401).json({message: "Password not match"})
                        }

                        jwt.sign({
                            username: data.username,
                            email: data.email,
                            id: data._id,
                            role: "user"
                        }, process.env.JWTTOKEN, (err, token) => {
                            if (err) {
                                return res.status(500).json({message: "Failed to assign JWT", error: err})
                            }
                            return res.status(200).json({
                                message: "Success Login",
                                data: {
                                    _token: token,
                                    username: data.username,
                                    profile_picture: data.profile_picture,
                                    id: data._id,
                                    email: data.email,
                                    role: "user"
                                }
                            });
                        })
                    }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
                } else {
                    const {profile_picture} = data;

                    jwt.sign({
                        username: data.username,
                        email: data.email,
                        id: data._id,
                        role: "user"
                    }, process.env.JWTTOKEN, {}, (err, token) => {
                        data.profile_picture = profile_picture;
                        return res.status(200).json({
                            message: "Success login as user",
                            data: {
                                _token: token,
                                username: data.username,
                                profile_picture: data.profile_picture,
                                id: data._id,
                                email: data.email,
                                role: "user"
                            }
                        });
                    })
                }

            } else {
                return res.status(404).json({message: "User not found"})
            }
        }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
};

exports.register = (req, res) => {
    const {username, password, email, noHp, loginWithGoogle, loginWithFacebook} = req.body;
    if (!username && !email && !password) {
        return res.status(400).json({message: "Field required"})
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
                        });
                        jwt.sign({
                                username: userData.username,
                                email: userData.email,
                                id: userDataDatabase._id,
                                role: "user"
                            }, process.env.JWTTOKEN, {}, (err, token) =>
                                res.status(201).json({
                                    message: "Success login",
                                    data: {
                                        _token: token,
                                        id: userDataDatabase._id,
                                        profile_picture: userDataDatabase.profile_picture,
                                        username: userData.username,
                                        email: userData.email,
                                    }
                                })
                        )
                    })
                    .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
            }).catch(err => res.status(500).json({message: "Failed to put bcrypt hash password", error: err}))
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
                .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
        }
    } else {
        return res.status(400).json({message: "Email not found"})
    }
};

exports.reSendEmail = async (req, res) => {
    const {email, username} = req.body
    const token = await function () {
        const token = Math.floor((Math.random() * 1000000) + 1)
        if (token.toString().length !== 6) {
            return this()
        } else {
            return token
        }
    };
    User.findOneAndUpdate({email}, {
        email_verification_token: token,
        email_expire_token: moment(Date.now()).add(3, "minutes").toISOString(),
    }).then(() => {
        nodeMailer.createTransport({
            host: process.env.EMAILHOST,
            port: process.env.EMAILPORT,
            secure: false,
            service: "Gmail",
            requireTLS: false,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAILPASSWORD
            }
        }).sendMail({
            from: "Tail 'n Tales Token Verification",
            to: email,
            subject: "Token Verification",
            html: `Hello ${username}! <br><br>Thank you for registering, your token verification is: <br><br><p style="font-size:24px;"><b>${token}</b></p><br>
                        IMPORTANT! NEVER TELL YOUR TOKEN TO ANYONE!
                        <img alt="TNT Logo" src="http://tailandtale.com/wp-content/uploads/2019/08/tnt_logo_jul19-1.png"/>
`
        }, err => {
            if (err) {
                res.status(500).json({message: "Failed to send email", error: err})
            } else {
                res.status(200).json({message: "Resend email success!"})
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
        email_expire_token: {$gte: moment().toISOString()}
    })
        .lean()
        .then(doc => {
            if (doc) {
                User.findOneAndUpdate({email}, {email_status: true, email_verification_token: null})
                    .then(() => res.status(201).json({message: "Email verified!"}))
                    .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
            } else {
                return res.status(404).json({msg: "Token not found or has been expired"})
            }
        }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))

};

exports.loginVet = (req, res) => {
    const {usernameOrEmail, password} = req.body;
    if (!usernameOrEmail || !password){
        return res.status(400).json({message: "Username or email or password needed"})
    }
    Vet.findOne({
        $or: [
            {username: usernameOrEmail},
            {email: usernameOrEmail}
        ]
    }).select("username password ban email profile_picture email_status")
        .lean()
        .then(data => {
            if (data) {
                if (data.ban) {
                    return res.status(403).json({message: "vet banned"})
                }
                bcrypt.compare(password, data.password).then(check => {
                    if (check) {
                        jwt.sign({
                            username: data.username,
                            email: data.email,
                            id: data._id,
                            role: "vet"
                        }, process.env.JWTTOKEN, {}, (err, token) => {
                            return res.status(200).json({
                                message: "Success login",
                                data: {
                                    _token: token,
                                    username: data.username,
                                    profile_picture: data.profile_picture,
                                    email: data.email,
                                    id: data._id
                                }
                            });
                        },)
                    } else {
                        return res.status(401).json({message: "Password incorrect"})
                    }
                }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
            } else {
                return res.status(404).json({message: "Vet not found"})
            }
        }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
};

exports.registerVet = (req, res) => {
    const {username, password, email, noHp, street, lat, long} = req.body;
    if (!username && !password && !email) {
        return res.status(400).json({message: "username, email and password required"})
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
                last_login: moment().toISOString()
            }
        };
        new Vet(vetData).save()
            .then(() => res.status(201).json())
            .catch(err => res.status(500).json({message: "Failed to run query", error: err}))

    }).catch(err => res.status(500).json({message: "Failed to assign bcrypt hash password", error: err}))

};

exports.loginClinic = (req, res) => {
    const {username, password} = req.body
    Clinic.findOne({
        username: username
    }).select("password").lean().then(data => {
        if (!data) {
            return res.status(404).json({message: "data not found"})
        }

        if (data.ban) {
            return res.status(403).json({message: "clinic has been banned"})
        }

        bcrypt.compare(password, data.password).then(check => {
            if (!check) {
                return res.status(401).json({message: "password incorrect"})
            }

            jwt.sign({
                id: data.id,
                username: data.username,
                role: "clinic"
            }, process.env.JWTTOKEN, {}, (err, token) => {
                if (err) {
                    return res.status(500).json({message: "Failed to get jwt token", error: err})
                }
                return res.status(200).json({
                    message: "Success login",
                    data: {
                        _token: token,
                        username: username,
                        id: data.id
                    }
                })
            })
        }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
    })
}

exports.loginAdmin = (req, res) => {
    const {username, password: inputPassword} = req.body
    if (!username || !inputPassword) {
        return res.status(400).json({message: "username and password required"})
    }
    Admin.findOne({
        username: username
    }).select("password username").lean().then(({password, _id: id, username}) => {
        if (!password) {
            return res.status(404).json({message: "Admin not found"})
        }

        bcrypt.compare(inputPassword, password).then(check => {
            if (!check) {
                return res.status(401).json({message: "Password incorrect"})
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
                    message: "Success login",
                    data: {
                        _token: token,
                        username: username,
                        id: id
                    }
                })
            })
        }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
    })
}

/**
 * Migrate for admin
 *
 * @param {Request} req
 * @param {Response} res
 */
exports.migrateAdmin = (req, res) => {
    new Admin({
        username: "superadmin",
        password: bcrypt.hashSync("admin", parseInt(process.env.BcryptSalt))
    }).save()
        .then(() => res.status(201).json({message: "Admin migrated!"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))

}

/**
 * Verify email for Vet
 *
 * @param {Request<P, ResBody, ReqBody, ReqQuery>|http.ServerResponse} req
 * @param {Response} res
 */
exports.verifyEmailVet = (req, res) => {
    const {token, email} = req.body;
    Vet.countDocuments({
        email,
        email_verification_token: token,
        email_expire_token: {$gte: moment(Date.now()).toISOString()}
    })
        .lean()
        .then(doc => {
            if (doc) {
                Vet.findOneAndUpdate({email}, {email_status: true, email_verification_token: null})
                    .then(() => res.status(202).json({message: "Email verified!"}))
                    .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
            } else {
                return res.status(404).json({msg: "Token not found or has been expired"})
            }
        }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
};

/**
 * set FCM token for user
 *
 * @param {Request} req
 * @param {Response<ResBody>|Request<P, ResBody, ReqBody, ReqQuery>} res
 */
exports.userFCMToken = (req, res) => {
    User.findByIdAndUpdate(res.userData.id, {
        fcmToken: req.body.fcmToken
    }).then(() => res.status(200).json({message: "User fcmtoken set!"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

/**
 * set FCM token for vet
 *
 * @param {Request} req
 * @param {Response<ResBody>|Request<P, ResBody, ReqBody, ReqQuery>} res
 */
exports.vetFCMToken = (req, res) => {
    Vet.findByIdAndUpdate(res.userData.id, {
        fcmToken: req.body.fcmToken
    })
        .then(() => res.status(200).json({message: "Vet fcmtoken set!"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}
