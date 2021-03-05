const {vet: Vet, clinic: Clinic} = require('../model')

exports.searchVet = (req, res) => {
    const {lat, long, vet, offset, maxDistance, minDistance} = req.body
    if (lat || long) {
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
                    query: vet ? {
                        username: {$regex: `(?i)${vet}.*`}
                    } : {}
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
            .then(data => res.status(200).json({message: "Search vet data", data}))
            .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
    } else {
        res.status(400).json({message: "lat, long and vet id is required"})
    }
}

exports.searchClinic = async (req, res) => {
    const {lat, long, clinic, offset, maxDistance, minDistance} = req.body
    if (lat || long) {
        Clinic.aggregate([
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
                    query: clinic ? {
                        username: {$regex: `(?i)${clinic}.*`}
                    } : {}
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
        ]).then(aggregatedResult => {
            Vet.populate(aggregatedResult, {
                path: "vet",
                select: {
                    username: 1,
                    profile_picture: 1
                }
            })
                .then(data => res.status(200).json({message: "Search clinic data", data}))
                .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
        }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
    } else {
        res.status(400).json({message: "lat, long and vet id is required"})
    }
}

exports.getClinicByVet = (req, res) => {
    const {vetId} = req.body
    Clinic.find({vet: vetId})
        .select("username")
        .lean()
        .then(data => res.status(200).json({message: "clinic data", data}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.getDetailClinic = (req, res) => {
    const {clinicId} = req.body
    if (!clinicId){
        return res.status(400).json({message: "clinic id is required"})
    }

    Clinic.findById(clinicId)
        .select('vet username address photo')
        .populate('vet','username profile_picture dayOfDuty')
        .lean()
        .then(data => res.status(200).json({message: "clinic detail data", data: {data, prefix: "uploads/clinic"}}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.getDetailVet = (req, res) => {
    const {vetId} = req.body
    if (!vetId){
        return res.status(400).json({message: "clinic id is required"})
    }
    Vet.findById(vetId)
        .select('bio photo profile_picture username expYear')
        .lean()
        .then(vetData => {
            Clinic.find({vet: vetId})
                .select('username')
                .lean()
                .then(clinicData => {
                    res.status(200).json({message: "vet detail data", data: {...vetData, clinic: clinicData}, prefix: "uploads/vet"})
                })
                .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
        })
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}
