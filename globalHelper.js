const Axios = require('axios')
const {user: User, vet: Vet} = require('./model')
const nodeMailer = require("nodemailer")

/**
 * Push notif by user Id
 *
 * @param {string} user
 * @param {string} title
 * @param {string} body
 * @param {Object} data
 * @returns {boolean} status success or not the push notification delivered
 */
exports.userPushNotif = (user, title, body, data = {}) =>
    User.findById(user).select("fcmToken").lean().then(({fcmToken}) => pushNotif(fcmToken, title, body, data))

/**
 * Push notif by vet id
 *
 * @param vet {string}
 * @param title {string}
 * @param body {string}
 * @param data {Object}
 */
exports.vetPushNotif = (vet, title, body, data = {}) => {
    Vet.findById(vet).select("fcmToken").lean().then(({fcmToken}) => pushNotif(fcmToken, title, body, data))
}

/**
 * Handle Push notif from firebase
 *
 * @param {string} fcmToken
 * @param {string} title
 * @param {string} body
 * @param {Object} data
 */
exports.pushNotif = (fcmToken, title, body = "", data = {}) => {
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
        })
            .then(() => true)
            .catch(err => {
                console.log(err.response)
                return false
            })
    }
}

/**
 * Add Notification list
 *
 * @param user {string}
 * @param updatedData {Object}
 */
exports.userAddNotification = (user, updatedData) => {
    User.findByIdAndUpdate(user, {
        $push: {
            notification: updatedData
        }
    })
}

/**
 * Global email transporter
 *
 * @type {Mail}
 */
exports.transpoter = nodeMailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAILPASSWORD
    }
});

/**
 * Generate OTP Number
 *
 * @return {number}
 */
exports.generateToken = () => {
    const token = Math.floor((Math.random() * 1000000) + 1)
    return token.toString().length !== 6 ? this() : token;
};
