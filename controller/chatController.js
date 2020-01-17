const {pushNotif} = require("../globalHelper");
const {userPushNotif} = require("../globalHelper");
const {vetPushNotif} = require("../globalHelper");
const {chat: Chat, vet: Vet, user: User} = require('../model')

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
        .then(async () => {
            res.status(200).json()
            const {io} = req
            // io.sockets.emit('newChat', {
            //     message: message,
            //     to: vet,
            //     from: res.userData.id,
            // });
            Vet.findById(vet).select("socketId fcmToken").then(async ({socketId, fcmToken}) => {
                if(io.sockets.connected[socketId]) {
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
    }).then(async () => {
        res.status(200).json()
        const {io} = req
        // io.sockets.emit('newChat', {
        //     message: message,
        //     to: user,
        //     from: res.userData.id,
        // });

        User.findById(user).select("socketId fcmToken").then(async ({socketId, fcmToken}) => {
            if(io.sockets.connected[socketId]) {
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

exports.userShowChat = (req, res) => {
    const {vet} = req.body
    Chat.findOne({
        user: res.userData.id,
        vet: vet,
    }).select("message.message message.read message.time status message.user message.vet")
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.vetShowChat = (req, res) => {
    const {user} = req.body

    Chat.findOne({
        user: user,
        vet: res.userData.id
    }).select("message.message message.read message.time status message.vet")
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
