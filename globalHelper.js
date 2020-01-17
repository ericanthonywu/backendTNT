const Axios = require('axios')
const {user: User, vet: Vet} = require('./model')

exports.userPushNotif = async (user, title, body) => {
    User.findById(user).select("fcmToken").then(({fcmToken}) => {
        Axios.post(`https://fcm.googleapis.com/fcm/send`, {
            to: fcmToken,
            notification: {
                title: title,
                body: body,
                show_in_foreground: true
            },
            data: {
                show_in_foreground: true,
                title: "a",
                body: "a"
            },
            content_available: true,
            show_in_foreground: true
        }, {
            headers: {
                "Content-Type": "application/json",
                Authorization: "key=AIzaSyBg4Nl93tC20G9IW7CIOFtDonczX6dD_bY"
            }
        }).catch(console.log)
    })
}

exports.vetPushNotif = async (vet, title, body) => {
    Vet.findById(vet).select("fcmToken").then(({fcmToken}) => {
        Axios.post(`https://fcm.googleapis.com/fcm/send`, {
            to: fcmToken,
            notification: {
                title: title,
                body: body,
                show_in_foreground: true
            },
            data: {
                show_in_foreground: true,
                title: "a",
                body: "a"
            },
            content_available: true,
            show_in_foreground: true
        }, {
            headers: {
                "Content-Type": "application/json",
                Authorization: "key=AIzaSyBg4Nl93tC20G9IW7CIOFtDonczX6dD_bY"
            }
        }).catch(console.log)
    })
}

exports.pushNotif = async (fcmToken, title, body) => {
    Axios.post(`https://fcm.googleapis.com/fcm/send`, {
        to: fcmToken,
        notification: {
            title: title,
            body: body,
            show_in_foreground: true
        },
        data: {
            show_in_foreground: true,
            title: "a",
            body: "a"
        },
        content_available: true,
        show_in_foreground: true
    }, {
        headers: {
            "Content-Type": "application/json",
            Authorization: "key=AIzaSyBg4Nl93tC20G9IW7CIOFtDonczX6dD_bY"
        }
    }).catch(console.log)
}
