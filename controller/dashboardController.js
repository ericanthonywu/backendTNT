const {vet: Vet,appointment: Appointment} = require('../model'),
    moment = require('moment')

exports.searchVet = (req, res) => {
    const {lat, long, vet, offset, maxDistance, minDistance} = req.body
    if (lat || long || vet) {
        Vet.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(long), parseFloat(lat)]
                    },
                    distanceField: "dist.calculated",
                    // includeLocs: "dist.location",
                    distanceMultiplier: 0.001,
                    // maxDistance: (maxDistance || 0) * 1000,
                    // minDistance: (minDistance || 0) * 1000,
                    spherical: true,
                    query: {
                        username: {$regex: vet + ".*"}
                    }
                },
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    profile_picture: 1,
                    dist: 1,
                }
            },
            {$limit: 10},
            {$skip: parseInt(offset) || 0}
        ])
            .then(data => res.status(200).json(data))
            .catch(err => res.status(500).json(err))
    } else {
        res.status(400).json()
    }
}

exports.showAppointment = (req,res) => {
    Appointment.find({
        time: {
            $gte: moment(),
            $lte: moment().endOf('day')
        },
        user: res.userData.id
    })
        .sort({time: 1})
        .populate('vet','username')
        .select("vet time")
        .limit(5)
        .then(appointment => res.status(200).json(appointment))
        .catch(err => res.status(500).json(err))
}

exports.showVetAppointment = (req,res) => {
    Appointment.find({
        vet: res.userData.id,
        time: {
            $gte: moment(),
            $lte: moment().endOf('day')
        },
    }).sort({time: 1})
        .populate('user','username')
        .select("user time")
        .limit(5)
        .then(appointment => res.status(200).json(appointment))
        .catch(err => res.status(500).json(err))
}
