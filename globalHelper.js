const Axios = require('axios')
const {user: User, vet: Vet} = require('./model')

exports.userPushNotif = (user, title, body, data = {}) => {
    User.findById(user).select("fcmToken").then(({fcmToken}) => pushNotif(fcmToken, title, body, data))
}

exports.vetPushNotif = (vet, title, body, data = {}) => {
    Vet.findById(vet).select("fcmToken").then(({fcmToken}) => pushNotif(fcmToken, title, body, data))
}

exports.pushNotif = (fcmToken, title, body, data = {}) => {
    if (fcmToken) {
        Axios.post(`https://fcm.googleapis.com/fcm/send`, {
            to: fcmToken,
            notification: {
                title: title,
                body: body,
                show_in_foreground: true
            },
            data: data,
            content_available: true,
            show_in_foreground: true
        }, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `key=${process.env.FCMLEGACYKEY}`
            }
        }).catch(console.log)
    }
}
