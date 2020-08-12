const {appointment: Appointment, vet: Vet, clinic: Clinic} = require('../model')
const moment = require('moment')
const scheduler = require('node-schedule')
const {userPushNotif, pushNotif, vetPushNotif} = require("../globalHelper");

exports.addAppointment = (req, res) => {
    const {time, vet, clinic, petId} = req.body

    if (moment(time).isValid() && vet && clinic && petId) {
        Appointment.countDocuments({
            time: {
                $gte: moment(time),
                $lte: moment(time).add(1, "hour")
            },
            vet: vet,
        }).lean()
            .then(c => {
                if (c < 4) {
                    new Appointment({
                        vet,
                        clinic,
                        time,
                        user: res.userData.id,
                        pet: petId
                    }).save()
                        .then(async ({_id}) => {
                            res.status(200).json()
                            const {io} = req
                            Vet.findById(vet).select("socketId username fcmToken").lean().then(({socketId, username, fcmToken}) => {
                                scheduler.scheduleJob(_id.toString(), moment(time).subtract(15, "minutes").toISOString(), _ => {
                                    pushNotif(fcmToken, "Appointment Reminder", `sebentar lagi ada appoinment dengan user ${res.userData.username} jangan sampai telat ya!`)
                                    userPushNotif(res.userData.id, "Appointment Reminder", `sebentar lagi ada appoinment dengan Dr. ${username} jangan sampai telat ya!`)
                                })
                                scheduler.scheduleJob(_id.toString(), moment(time).add(15, "minutes").toISOString(), _ =>
                                    userPushNotif(fcmToken, "Thank you for use our booking system", `You are free to book again anytime with any doctor :)`)
                                )
                                pushNotif(fcmToken, "New Appointment", `Ada appointment baru dengan ${res.userData.username} pada ${moment(time).format("D MMMM HH:mm")}`)
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
        timeRequested: time,
        status: 1
    }).then(() => {
        res.status(200).json()
        Appointment.findById(id)
            .select("clinic vet")
            .populate("clinic", "socketId")
            .populate("vet", "username")
            .lean()
            .then(({clinic, vet}) => {
                const {io} = req
                if (io.sockets.connected[clinic.socketId]) {
                    io.sockets.connected[clinic.socketId].emit("requestEdit", {
                        user: {
                            username: res.userData.username,
                            _id: res.userData.id
                        },
                        vet,
                        timeRequested: time,
                        _id: res.userData.id,
                    })
                }
            })
    })
}

exports.reScheduleAppointmentAction = (req, res) => {
    const {id, time, action, reason} = req.body;
    if (!id || !time || typeof action !== "undefined" || (action === "reject" && typeof reason == "undefined")) {
        return res.status(400).json()
    }
    Appointment.findById(id)
        .select("user vet")
        .populate("user", "username fcmToken")
        .populate("vet", "username fcmToken")
        .lean()
        .then(({user, vet}) => {
            switch (action) {
                case "accept":
                    Appointment.findByIdAndUpdate(id, {
                        time: time,
                        status: 2
                    }).then(_ => {
                        res.status(200).json();
                        scheduler.scheduledJobs[id].reschedule(moment(time).subtract(15, "minutes").toISOString())
                        pushNotif(user.fcmToken, `Appointment dengan ${vet.username} sudah di reschedule menjadi ${moment(time).format("DD/MM/YYY HH:mm")}`)
                        pushNotif(vet.fcmToken, `Appointment dengan ${user.username} sudah di reschedule menjadi ${moment(time).format("DD/MM/YYY HH:mm")}`)
                    }).catch(err => res.status(500).json(err))
                    break;
                case "reject":
                    Appointment.findByIdAndDelete(id).then(() => {
                        res.status(202).json();
                        scheduler.scheduledJobs[id].cancel()
                        pushNotif(user.fcmToken, `Appointment dengan ${vet.username} di cancel dengan alasan ${reason}`)
                        pushNotif(vet.fcmToken, `Appointment dengan ${user.username} di cancel oleh clinic ${res.userData.username}`)
                    }).catch(err => res.status(500).json(err))
                    break;
                default:
                    res.status(400).json({message: "action unknown"})
            }
        })
}

exports.cancelAppointment = (req, res) => {
    const {id} = req.body
    Appointment.findByIdAndDelete(id)
        .then(_ => {
            res.status(200).json()
            scheduler.scheduledJobs[id].cancel()
            Appointment.findById(id)
                .select("vet time")
                .populate("vet", "fcmToken")
                .lean()
                .then(({vet, time}) =>
                    vetPushNotif(
                        vet.fcmToken,
                        "Appointment canceled",
                        `Oops.. your appointment at ${moment(time).format("D MMMM HH:mm")} with ${res.userData.username} has been canceled`
                    )
                )
                .catch(console.log)
        }).catch(err => res.status(500).json(err))
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
        .lean()
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
        .lean()
        .then(appointment => res.status(200).json(appointment))
        .catch(err => res.status(500).json(err))
}

exports.showUserAppointment = (req, res) => {
    Appointment.find({
        user: res.userData.id,
    })
        .populate("vet", "username profile_picture")
        .populate("clinic", "username")
        .select("time status clinic vet")
        .sort({time: -1})
        .lean()
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
        .sort({time: 1})
        .lean()
        .then(appointment => res.status(200).json(appointment))
        .catch(err => res.status(500).json(err))
}

exports.clinicShowAllPendingAppointment = (req, res) => {
    Appointment.find({status: 0, clinic: res.userData.id})
        .sort({time: -1})
        .select("user time vet")
        .populate("user", "username")
        .populate("vet", "username")
        .lean()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.clinicShowQuickPendingAppointment = (req, res) => {
    Appointment.find({status: 1, clinic: res.userData.id})
        .sort({time: -1})
        .select("user timeRequested vet")
        .populate("user", "username")
        .populate("vet", "username")
        .lean()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.clinicShowAllBookingAppointment = (req, res) => {
    const {offset = 0} = req.body

    Appointment.find({clinic: res.userData.id})
        .sort({time: -1})
        .select("user time vet")
        .populate("user", "username phoneNumber email")
        .populate("vet", "username")
        .limit(10)
        .skip(offset)
        .lean()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.clinicShowOngoingAppointment = (req, res) => {
    const {offset = 0} = req.body
    Appointment.find({
        clinic: res.userData.id,
        time: {$gte: moment()}
    }).sort({time: -1})
        .select("user pet time vet")
        .populate("user", "username phoneNumber email")
        .populate("vet", "username")
        // .populate("pet", "username")
        .limit(10)
        .skip(offset)
        .lean()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))

}
