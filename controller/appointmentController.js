const {appointment: Appointment, vet: Vet} = require('../model')
const moment = require('moment')
const Axios = require('axios')
const scheduler = require('node-schedule')
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
                        Vet.findById(vet).select("socketId username").then(({socketId, username}) => {
                            scheduler.scheduleJob(_id, moment(time).subtract(15, "minutes").toISOString(), () => {
                                vetPushNotif(vet, "Appointment Reminder", `15 menit lagi ada appoinment dengan user ${res.userData.username} jangan sampai telat ya!`)
                                userPushNotif(res.userData.id, "Appointment Reminder", `15 menit lagi ada appoinment dengan Dr. ${username} jangan sampai telat ya!`)
                            })
                            io.sockets.connected[socketId].emit('newAppointment', {
                                user: res.userData.username,
                                time: time
                            })
                        })
                        await vetPushNotif(vet, "Appointment baru", `Ada appointment baru dari user ${res.userData.username} pada tanggal ${moment(time).format("D MMMM H:m")}`)
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
        scheduler.scheduledJobs[id].reschedule(moment(time).subtract(15, "minutes").toISOString())
    }).catch(err => res.status(500).json(err))
}

exports.cancelAppointment = (req, res) => {
    const {id} = req.body
    Appointment.findByIdAndDelete(id)
        .then(() => {
            scheduler.scheduledJobs[id].cancel()
            res.status(200).json()
        }).catch(err => res.status(500).json(err))
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
