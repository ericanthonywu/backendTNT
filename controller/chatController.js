const scheduler = require("node-schedule");
const {pushNotif} = require("../globalHelper");
const {chat: Chat, vet: Vet, user: User} = require('../model')
const moment = require('moment')
const fs = require('fs');
const path = require('path');
const Axios = require('axios')

exports.userSendChat = (req, res) => {
    const {vet, message} = req.body
    Chat.findOneAndUpdate({
        user: res.userData.id,
        vet: vet,
        status: true
    }, {
        $push: {
            message: {
                user: res.userData.id,
                message: message
            }
        }
    }).setOptions({
        setDefaultsOnInsert: true,
        upsert: true
    })
        .then(async _ => {
            res.status(200).json()
            const {io} = req
            Vet.findById(vet).select("socketId fcmToken").then(async ({socketId, fcmToken}) => {
                if (io.sockets.connected[socketId]) {
                    io.sockets.connected[socketId].emit('newChat', {
                        message: message,
                        from: res.userData.id
                    })
                }
                await pushNotif(fcmToken, res.userData.username, message)
            })
        })
        .catch(err => res.status(500).json(err))
}

exports.vetSendChat = (req, res) => {
    const {user, message} = req.body
    Chat.findOneAndUpdate({
        user: user,
        vet: res.userData.id,
        status: true
    }, {
        $push: {
            message: {
                vet: res.userData.id,
                message: message
            }
        }
    }).then(async _ => {
        res.status(200).json()
        const {io} = req

        User.findById(user).select("socketId fcmToken").then(async ({socketId, fcmToken}) => {
            if (io.sockets.connected[socketId]) {
                io.sockets.connected[socketId].emit('newChat', {
                    message: message,
                    from: res.userData.id
                })
            }
            pushNotif(fcmToken, res.userData.username, message)
        })
    })
        .catch(err => res.status(500).json(err))
}

exports.userShowChat = (req, res) => {
    const {vet} = req.body
    Chat.findOne({
        user: res.userData.id,
        vet: vet,
    }).select("message.message message.read message.time message.file status message.user message.vet")
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.vetShowChat = (req, res) => {
    const {user} = req.body

    Chat.findOne({
        user: user,
        vet: res.userData.id
    }).select("message.message message.read message.time message.file status message.vet")
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.getVet = (req, res) => {
    Chat.find({
        user: res.userData.id
    }).populate("vet", "username profile_picture")
        .select({message: {$slice: -1}, vet: 1})
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.getUser = (req, res) => {
    Chat.find({
        vet: res.userData.id
    }).populate("user", "username profile_picture")
        .select({message: {$slice: -1}, user: 1})
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.userFileChat = (req, res) => {
    const {vet} = req.body;
    Chat.findOneAndUpdate({
        user: res.userData.id,
        vet: vet,
        status: true
    }, {
        $push: {
            message: {
                user: res.userData.id,
                file: req.file.filename
            }
        }
    }).setOptions({
        setDefaultsOnInsert: true,
        upsert: true
    })
        .then(async _ => {
            res.status(200).json()
            const {io} = req
            Vet.findById(vet).select("socketId fcmToken").then(async ({socketId, fcmToken}) => {
                if (io.sockets.connected[socketId]) {
                    io.sockets.connected[socketId].emit('newChat', {
                        file: req.file.filename,
                        from: res.userData.id
                    })
                }
                await pushNotif(fcmToken, res.userData.username, `${res.userData.username} sent you a photo`)
            })
        })
        .catch(err => res.status(500).json(err))
}

exports.vetFileChat = (req, res) => {
    const {user} = req.body;
    Chat.findOneAndUpdate({
        vet: res.userData.id,
        user: user,
        status: true
    }, {
        $push: {
            message: {
                vet: res.userData.id,
                file: req.file.filename
            }
        }
    }).setOptions({
        setDefaultsOnInsert: true,
        upsert: true
    })
        .then(async _ => {
            res.status(200).json()
            const {io} = req
            User.findById(user).select("socketId fcmToken").then(async ({socketId, fcmToken}) => {
                if (io.sockets.connected[socketId]) {
                    io.sockets.connected[socketId].emit('newChat', {
                        file: req.file.filename,
                        from: res.userData.id
                    })
                }
                await pushNotif(fcmToken, res.userData.username, `${res.userData.username} sent you a photo`)
            })
        })
        .catch(err => res.status(500).json(err))
}

exports.endChat = (req, res) => {
    const {chatId} = req.body
    Chat.findByIdAndUpdate(chatId, {
        status: false
    }).then(_ => {
        res.status(200).json()
        scheduler.scheduleJob(moment().add({month: 1}).toISOString(), _ => {
            Chat.findById(chatId)
                .select("message.message message.time message.file message.user message.vet user vet")
                .populate("user", "username")
                .populate("vet", "username")
                .populate("message.user", "username")
                .populate("message.vet", "username")
                .then(async ({message, user, vet}) => {
                    // Chat.findByIdAndDelete(chatId) TODO: Jangan lupa delete stelah testing

                    // define file path
                    const filePath = path.join(__dirname, `../chatBackupTemp/${chatId + Date.now().toString() + user + vet}log.txt`);


                    const turnChatIntoFile = _ => {
                        let chatMessage = ""
                        message.forEach(({message, time, file, user, vet}) => {
                            const spaceBar = " ";
                            let currentLineChat = moment(time).format("YYYY-MM-DD HH:mm:ss") + spaceBar; // add time it sent
                            currentLineChat += (user ? user.username : vet.username) + ":" + spaceBar; //put sender identifier after time
                            currentLineChat += (file ? "sent a photo" : message) + spaceBar; //add message

                            chatMessage += currentLineChat + "\n" //line break at end of message
                        })
                        return chatMessage
                    }
                    fs.writeFile(filePath, await turnChatIntoFile(), err => {
                        if (err) {
                            console.log(err)
                        }
                        const form_data = new FormData();
                        form_data.append("file", fs.createReadStream(filePath));
                        const sendToDrive = _ => {
                            Axios.post("bla bla", form_data, {
                                headers: {
                                    'Content-Type': 'multipart/form-data',
                                },
                            }).then(() =>
                                fs.unlinkSync(filePath)
                            ).catch(err => {
                                console.log(err)
                                sendToDrive()
                            })
                        }
                        sendToDrive()
                    })
                })
        })
    }).catch(err => res.status(500).json(err))
}
