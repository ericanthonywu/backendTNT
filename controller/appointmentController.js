const {appointment: Appointment, vet: Vet} = require('../model')
const moment = require('moment')
const scheduler = require('node-schedule')
const {userPushNotif, pushNotif, vetPushNotif} = require("../globalHelper");

exports.addAppointment = (req, res) => {
    const {time, vet, clinic} = req.body

    if (moment(time).isValid() && vet) {
        Appointment.countDocuments({
            time: {
                $gte: moment(time),
                $lte: moment(time).add(1, "hour")
            },
            vet: vet
        }).then(c => {
            if (c < 4) {
                new Appointment({
                    vet: vet,
                    clinic: clinic,
                    time: time,
                    user: res.userData.id
                }).save()
                    .then(async ({_id}) => {
                        res.status(200).json()
                        const {io} = req
                        Vet.findById(vet).select("socketId username fcmToken").then(({socketId, username, fcmToken}) => {
                            scheduler.scheduleJob(_id.toString(), moment(time).subtract(15, "minutes").toISOString(), _ => {
                                pushNotif(fcmToken, "Appointment Reminder", `sebentar lagi ada appoinment dengan user ${res.userData.username} jangan sampai telat ya!`)
                                userPushNotif(res.userData.id, "Appointment Reminder", `sebentar lagi ada appoinment dengan Dr. ${username} jangan sampai telat ya!`)
                            })
                            if (io.sockets.connected[socketId]) {
                                io.sockets.connected[socketId].emit('newAppointment', {
                                    user: res.userData.username,
                                    time: time
                                })
                            }
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
    const {id, time} = req.body;
    Appointment.findByIdAndUpdate(id, {
        time: time
    }).then(_ => {
        res.status(200).json();
        scheduler.scheduledJobs[id].reschedule(moment(time).subtract(15, "minutes").toISOString())
    }).catch(err => res.status(500).json(err))
}

exports.cancelAppointment = (req, res) => {
    const {id} = req.body
    Appointment.findByIdAndDelete(id)
        .then(_ => {
            res.status(200).json()
            scheduler.scheduledJobs[id].cancel()
        }).catch(err => res.status(500).json(err))
    Appointment.findById(id)
        .select("vet time")
        .populate("vet", "fcmToken")
        .then(({vet, time}) =>
            vetPushNotif(
                vet.fcmToken,
                "Appointment canceled",
                `Oops.. your appointment at ${moment(time).format("D MMMM HH:mm")} with ${res.userData.username} has been canceled`
            )
        )
        .catch(console.log)
}

exports.showVetAvailable = (req, res) => {
    const {vet} = req.body

    Appointment.find({
        vet: vet,
        status: 1,
        time: {
            $gte: moment()
        }
    }).select("time")
        .then(time => res.status(200).json(time))
        .catch(err => res.status(500).json(err))
}

exports.showVetAppointment = (req, res) => {
    Appointment.find({
        vet: res.userData.id,
        status: 1,
        time: {
            $gte: moment(),
            $lte: moment().endOf("day")
        }
    }).populate("user", "username")
        .select("user time")
        .then(appointment => res.status(200).json(appointment))
        .catch(err => res.status(500).json(err))
}

exports.showUserAppointment = (req, res) => {
    Appointment.find({
        user: res.userData.id,
        // status: 1,
        // time: {$gte: moment(), $lte: moment().endOf("month")}
    }).populate("vet", "username profile_picture")
        .select("time vet")
        .then(appointment => res.status(200).json(appointment))
        .catch(err => res.status(500).json(err))
}

exports.showUsersTodayAppointment = (req, res) => {
    Appointment.find({
        user: res.userData.id,
        // status: 1,
        time: {
            $gte: moment(),
            $lte: moment().endOf("day")
        }
    }).populate("vet", "username profile_picture")
        .select("time vet")
        .then(appointment => res.status(200).json(appointment))
        .catch(err => res.status(500).json(err))
}

exports.clinicAcceptAppointment = (req, res) => {
    const {appointmentId} = req.body
    Appointment.findByIdAndUpdate(appointmentId, {
        status: 1
    }).then(_ => {
        res.status(200).json()
        Appointment.findById(appointmentId)
            .select("user vet")
            .populate("user", "fcmToken username")
            .populate("vet", "fcmToken username")
            .then(data => {
                pushNotif(data.user.fcmToken, `Hi ${data.user.username}`, `,Your appointment to ${data.vet.username} has been confirm, we will remind you 15 minutes before the booking :) `)
                pushNotif(data.vet.fcmToken, "Appointment baru", `New appointment from ${res.userData.username} at ${moment(data.time).format("D MMMM HH:mm")}`)
            })
    })
}

exports.clinicRejectAppointment = (req, res) => {
    const {appointmentId, reason} = req.body
    Appointment.findByIdAndUpdate(appointmentId, {
        status: 2,
        reason: reason
    }).then(_ => {
        res.status(200).json()
        Appointment.findById(appointmentId)
            .select("user vet")
            .populate("user", "fcmToken username")
            .populate("vet", "username")
            .then(data =>
                pushNotif(
                    data.user.fcmToken,
                    `Sorry ${data.user.username}, your appointment has been rejected :( `,
                    `Your appointment to ${data.vet.username} has been rejected, open notification to see why they rejected you! `
                )
            ).catch(err => res.status(500).json(err))
    }).catch(err => res.status(500).json(err))
}

exports.clinicShowAllPendingAppointment = (req, res) => {
    Appointment.find({status: 0, clinic: res.userData.id})
        .sort({time: -1})
        .select("user time vet")
        .populate("user", "username")
        .populate("vet", "username")
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.clinicShowQuickPendingAppointment = (req, res) => {
    Appointment.find({status: 0, clinic: res.userData.id})
        .sort({time: -1})
        .select("user time vet")
        .populate("user", "username")
        .populate("vet", "username")
        .limit(5)
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.clinicShowAllBookingAppointment = (req, res) => {
    const {clinic, offset} = clinic
    if (!clinic) {
        return res.status(400).json()
    }

    Appointment.find({clinic: clinic})
        .sort({time: -1})
        .select("user time vet")
        .populate("user", "username")
        .populate("vet", "username")

        .limit(10)
        .skip(offset || 0)
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

