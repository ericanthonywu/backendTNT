const {appointment: Appointment, vet: Vet} = require('../model')
const moment = require('moment')
const Axios = require('axios')
const scheduler = require('node-schedule')
const {pushNotif} = require("../globalHelper");
const {userPushNotif, vetPushNotif} = require("../globalHelper");

exports.addAppointment = (req, res) => {
    const {time, vet} = req.body

    if (moment(time).isValid() && vet) {
        Appointment.countDocuments({
            time: {
                $gte: time,
                $lte: moment(time).add(1, "hour")
            },
            vet: vet
        }).then(c => {
            if (c < 4) {
                new Appointment({
                    vet: vet,
                    time: time,
                    user: res.userData.id
                }).save()
                    .then(async ({_id}) => {
                        res.status(200).json()
                        const {io} = req
                        Vet.findById(vet).select("socketId username fcmToken").then(({socketId, username, fcmToken}) => {
                            scheduler.scheduleJob(_id, moment(time).subtract(15, "minutes").toISOString(), () => {
                                pushNotif(fcmToken, "Appointment Reminder", `15 menit lagi ada appoinment dengan user ${res.userData.username} jangan sampai telat ya!`)
                                userPushNotif(res.userData.id, "Appointment Reminder", `15 menit lagi ada appoinment dengan Dr. ${username} jangan sampai telat ya!`)
                            })
                            pushNotif(fcmToken, "Appointment baru", `Ada appointment baru dari user ${res.userData.username} pada tanggal ${moment(time).format("D MMMM H:m")}`)
                            io.sockets.connected[socketId].emit('newAppointment', {
                                user: res.userData.username,
                                time: time
                            })
                        })
                    })
                    .catch(err => res.status(500).json(err))
            } else {
                return res.status(406).json()
            }
        }).catch(err => res.status(500).json(err))
    } else {
        return res.status(400).json()
    }
}

exports.reScheduleAppointment = (req, res) => {
    const {id, time} = req.body
    Appointment.findByIdAndUpdate(id, {
        time: time
    }).then(() => {
        res.status(200).json()
        scheduler.scheduledJobs[id].reschedule(moment(time).subtract(15, "minutes").toISOString())
    }).catch(err => res.status(500).json(err))
}

exports.cancelAppointment = (req, res) => {
    const {id} = req.body
    Appointment.findByIdAndDelete(id)
        .catch(err => res.status(500).json(err))
        .finally(() => {
            res.status(200).json()
            scheduler.scheduledJobs[id].cancel()
        })
}

exports.showVetAvailable = (req, res) => {
    const {vet} = req.body

    Appointment.find({
        vet: vet,
        time: {
            $gte: moment().toISOString()
        }
    }).select("time")
        .then(time => res.status(200).json(time))
        .catch(err => res.status(500).json(err))
}

exports.showVetAppointment = (req, res) => {
    Appointment.find({
        vet: res.userData.id,
        time: {
            $gte: moment(),
            $lte: moment().endOf("day")
        }
    }).populate("user", "username")
        .select("user time")
        .then(appointment => res.status(200).json(appointment))
        .catch(err => res.status(500).json(err))
}
