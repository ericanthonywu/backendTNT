const {clinic: Clinic, vet: Vet, user: User, appointment: Appointment, blog: Blog} = require('../model')
const bcrypt = require('bcryptjs')
const {pushNotif} = require("../globalHelper");

exports.addClinic = async (req, res) => {
    const {
        body: {
            username,
            password,
            email,
            address,
            lat,
            long
        },
        files
    } = req;

    if (username && password && email && address && lat && long) {
        bcrypt.hash(password, 10).then(hashedPassword => {
            new Clinic({
                username,
                password: hashedPassword,
                email,
                address,
                session: {
                    coordinates: [long, lat]
                },
                photo: files.map(({filename}) => filename)
            }).save()
                .then(({_id: id}) => res.status(201).json({id}))
                .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
        }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
    } else {
        return res.status(400).json({message: "invalid request"})
    }
}

exports.banClinic = (req, res) => {
    const {clinicId} = req.body

    if (!clinicId) {
        return res.status(400).json({message: "Clinic id needed"})
    }

    Clinic.findByIdAndUpdate(clinicId, {
        ban: true
    }).then(() => {
        res.status(200).json({message: "Clinic banned"})
        const {io} = req
        Clinic.findById(clinicId).select("socketId").then(({socketId}) => io.sockets.connected[socketId].emit("ban"))
    }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.deleteClinic = (req, res) => {
    const {clinicId} = req.body
    Clinic.findByIdAndDelete(clinicId)
        .then(() => res.status(200).json({message: "Clinic deleted"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.showClinic = (req, res) => {
    const {offset} = req.body
    Clinic.aggregate([
        {
            $project: {
                _id: 1,
                username: 1,
                vet: {$size: "$vet"},
                createdAt: 1
            }
        },
        {$limit: 8},
        {$skip: offset || 0}
    ])
        .then(data => res.status(200).json({message: "Clinic data", data}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.showVetClinic = (req, res) => {
    const {offset} = req.body
    if (typeof offset == "undefined") {
        return res.status(400).json()
    }

    Clinic.findById(res.userData.id)
        .select("vet")
        .limit(8)
        .skip(offset)
        .populate("vet", "username createdAt cert_id expYear KTP")
        .lean()
        .then(({vet}) => res.status(200).json({message: "Vet clinic data", data: vet}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.addVetClinic = (req, res) => {
    const {vetId} = req.body

    Clinic.countDocuments({_id: res.userData.id, vet: vetId}).then(count => {
        if (count) {
            return res.status(409).json({message: "clinic cannot be same"})
        }

        Clinic.findByIdAndUpdate(res.userData.id, {
            $push: {
                vet: vetId
            }
        }).then(() => res.status(200).json({message: "Vet added to clinic"}))
            .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
    }).catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.banVetClinic = (req, res) => {
    const {vetId, ban} = req.body
    Vet.findByIdAndUpdate(vetId, {
        ban: ban
    }).then(() => {
        res.status(200).json({message: "Vet banned"})
        const {io} = req
        Vet.findById(vetId).select("fcmToken socketId").then(({fcmToken, socketId}) => {
            pushNotif(fcmToken, "Oh no! You has been banned from admin")
            io.sockets.connected[socketId].emit("ban")
        })
    })
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.searchVetClinic = (req, res) => {
    const {keyword} = req.body

    // Clinic.aggregate([
    //     {
    //         $lookup: {
    //             from: Vet.collection.name,
    //             localField: "vet",
    //             foreignField: "_id",
    //             as: "vet"
    //         },
    //     },
    //     {
    //         $match: {
    //             "vet.username": {$regex: `(?i)${keyword}.*`},
    //             id: {$ne: res.userData.id}
    //         }
    //     },
    //     {
    //         $project: {
    //             _id: 1,
    //             "vet.username": 1
    //         }
    //     },
    // ])
    //     .then(data => res.status(200).json(data))
    //     .catch(err => res.status(200).json(err))

    // Clinic.findOne({id: {$ne: res.userData.id}})
    //     .select("vet")
    //     .populate({
    //         path: "vet",
    //         match: {
    //             username: {$regex: `(?i)${keyword}.*`},
    //         },
    //         select: {
    //             username: 1,
    //             profile_picture: 1,
    //             id_cert: 1,
    //         }
    //     })
    //     .then(({vet}) => res.status(200).json(vet))
    //     .catch(err => res.status(200).json(err))

    Vet.find({username: {$regex: `(?i)${keyword}.*`}})
        .select("username profile_picture id_cert")
        .lean()
        .then(data => res.status(200).json({message: "vet search data", data}))
        .catch(err => res.status(200).json(err))
}

exports.editClinic = async (req, res) => {
    const {username, email, address, session, password, _id: id} = req.body
    const query = {
        username,
        email,
        address,
        session
    }

    if (password) {
        query.password = await bcrypt.hash(password, 10)
    }

    Clinic.findByIdAndUpdate(id, query)
        .then(data => res.status(200).json({message: "Clinic edited", data}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.detailClinic = (req, res) => {
    const {clinicId} = req.body;
    if (!clinicId) {
        return res.status(400).json()
    }

    Clinic.findById(clinicId)
        .select("vet username email address location createdAt photo session.coordinates")
        .populate("vet", "cert_id username createdAt expYear")
        .lean()
        .then(data => res.status(data ? 200 : 404).json({message: data ? "Clinic data" : "Clinic not found", data}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.showAllVet = (req, res) => {
    const {offset} = req.body
    Vet.find()
        .select("username profile_picture email expYear KTP ban cert_id promoted createdAt session.coordinates")
        .skip(offset || 0)
        .limit(8)
        .lean()
        .then(data => res.status(data ? 200 : 404).json({message: "Vet data", data}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.addVet = (req, res) => {
    const {cert_id, KTP, vet_name, vet_email, expYear, address, password, lat,long,bio} = req.body
    // if (cert_id && KTP && vet_email && vet_name && expYear && address && password && session) {
    bcrypt.hash(password, parseInt(process.env.BcryptSalt)).then(password => {
        new Vet({
            cert_id,
            KTP,
            email: vet_email,
            username: vet_name,
            expYear,
            address,
            password: password,
            session: {coordinates: [long,lat]},
            bio
        }).save()
            .then(({_id}) => res.status(201).json({message: "vet added", data: {id: _id}}))
            .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
    })
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
    // } else {
    //     return res.status(400).json({msg: "input must be filled"})
    // }
}

exports.detailVet = (req, res) => {
    const {vetId} = req.body
    Vet.findById(vetId)
        .select("username profile_picture email expYear address KTP cert_id createdAt session.coordinates")
        .lean()
        .then(data => res.status(200).json({message: "Detail vet", data}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.editVet = (req, res) => {
    const {password, _id: id, cert_id, KTP, email, username, expYear, address, session} = req.body
    const {file} = req

    const updatedData = {
        cert_id,
        KTP,
        email,
        username,
        expYear,
        address,
        "session.coordinates": session.coordinates
    }

    if (password) {
        updatedData.password = bcrypt.hashSync(password, 10)
    }
    if (file) {
        updatedData.profile_picture = file.filename
    }

    Vet.findByIdAndUpdate(id, updatedData)
        .then(() => res.status(200).json({message: "vet edited"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.deleteVet = (req, res) => {
    const {idVet} = req.body

    Vet.findByIdAndDelete(idVet)
        .then(() => res.status(202).json({message: "vet deleted"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.getBlog = (req, res) => {
    const {offset = 0, limit = 100} = req.body
    Blog.find()
        .select('title')
        .skip(offset)
        .limit(limit)
        .lean()
        .then(data => res.status(200).json({message: "Blog data", data}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.getDetailBlog = (req, res) => {
    const {id} = req.body
    if (!id) {
        return res.status(400).json({message: "id not found"})
    }

    Blog.findById(id)
        .select('html')
        .lean()
        .then(data => res.status(200).json({message: "Detail blog", data}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.addBlog = (req, res) => {
    const {html, title} = req.body
    if (!html || !title) {
        return res.status(400).json()
    }
    Blog.create({html, title})
        .then(() => res.status(201).json({message: "Blog added"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.editBlog = (req, res) => {
    const {id, html, title} = req.body
    if (!id || !html || !title) {
        return res.status(400).json({message: "Id, html and title needed"})
    }

    Blog.findByIdAndUpdate(id, {html, title})
        .then(() => res.status(200).json({message: "Blog edited"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.deleteBlog = (req, res) => {
    const {id} = req.body
    if (!id) {
        return res.status(400).json({message: "Id needed"})
    }

    Blog.findByIdAndDelete(id)
        .then(() => res.status(202).json({message: "blog deleted"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}
