const {appointment: Appointment,user: User} = require('../model')
const moment = require('moment')
const Axios = require('axios')
const {vetPushNotif} = require("../globalHelper");

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
                    .then(async () => {
                        res.status(200).json()
                        const {io} = req
                        await vetPushNotif(vet,"Appointment baru",`Ada appointment baru dari user ${res.userData.username} pada tanggal ${moment(time).format("D MMMM pukul H:m")}`)
                        io.sockets.emit('newAppointment',{
                            to: vet,
                            user: res.userData.username,
                            time: time
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
