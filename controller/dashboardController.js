const {vet: Vet, clinic: Clinic} = require('../model')

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
                    includeLocs: "dist.location",
                    distanceMultiplier: 0.001,
                    // maxDistance: (maxDistance || 0) * 1000,
                    // minDistance: (minDistance || 0) * 1000,
                    spherical: true,
                    query: {
                        username: {$regex: `(?i)${vet}.*`}
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
            .lean()
            .then(data => res.status(200).json(data))
            .catch(err => res.status(500).json(err))
    } else {
        res.status(400).json()
    }
}

exports.searchClinic = async (req, res) => {
    const {lat, long, clinic, offset, maxDistance, minDistance} = req.body
    if (lat || long || clinic) {
        const aggregatedResult = await Clinic.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(long), parseFloat(lat)]
                    },
                    distanceField: "dist.calculated",
                    includeLocs: "dist.location",
                    distanceMultiplier: 0.001,
                    // maxDistance: (maxDistance || 0) * 1000,
                    // minDistance: (minDistance || 0) * 1000,
                    spherical: true,
                    query: {
                        username: {$regex: `(?i)${clinic}.*`}
                    }
                },
            },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    address: 1,
                    dist: 1,
                    vet: 1
                }
            },
            {$limit: 10},
            {$skip: parseInt(offset) || 0}
        ])
        Vet.populate(aggregatedResult, {
            path: "vet",
            select: {
                username: 1,
                profile_picture: 1
            }
        })
            .lean()
            .then(data => res.status(200).json(data))
            .catch(err => res.status(500).json(err))
    } else {
        res.status(400).json()
    }
}

exports.getClinicByVet = (req,res) => {
    const {vetId} = req.body
    Clinic.find({vet: vetId})
        .select("username")
        .lean()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}
