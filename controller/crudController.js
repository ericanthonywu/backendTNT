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
        const filenameArr = []

        await files.forEach(({filename}) => filenameArr.push(filename))

        bcrypt.hash(password, 10).then(hashedPassword => {
            new Clinic({
                username,
                password: hashedPassword,
                email,
                address,
                session: {
                    coordinates: [long, lat]
                },
                photo: filenameArr
            }).save()
                .then(({_id: id}) => res.status(201).json({id}))
                .catch(err => res.status(500).json(err))
        }).catch(err => res.status(500).json(err))
    } else {
        return res.status(400).json()
    }
}

exports.banClinic = (req, res) => {
    const {clinicId} = req.body

    if (!clinicId) {
        return res.status(400).json()
    }

    Clinic.findByIdAndUpdate(clinicId, {
        ban: true
    }).then(() => {
        res.status(200).json()
        const {io} = req
        Clinic.findById(clinicId).select("socketId").then(({socketId}) => io.sockets.connected[socketId].emit("ban"))
    }).catch(err => res.status(500).json(err))
}

exports.deleteClinic = (req, res) => {
    const {clinicId} = req.body
    Clinic.findByIdAndDelete(clinicId)
        .then(() => res.status(200).json())
        .catch(err => res.status(500).json(err))
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
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
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
        .then(({vet}) => res.status(200).json(({vet})))
        .catch(err => res.status(500).json(err))
}

exports.addVetClinic = (req, res) => {
    const {vetId} = req.body

    Clinic.countDocuments({_id: res.userData.id, vet: vetId}).then(count => {
        if (count) {
            return res.status(409).json()
        }

        Clinic.findByIdAndUpdate(res.userData.id, {
            $push: {
                vet: vetId
            }
        }).then(_ => res.status(200).json())
            .catch(err => res.status(500).json(err))
    }).catch(err => res.status(500).json(err))
}

exports.banVetClinic = (req, res) => {
    const {vetId, ban} = req.body
    Vet.findByIdAndUpdate(vetId, {
        ban: ban
    }).then(() => {
        res.status(200).json()
        const {io} = req
        Vet.findById(vetId).select("fcmToken socketId").then(({fcmToken, socketId}) => {
            pushNotif(fcmToken, "Oh no! You has been banned from admin")
            io.sockets.connected[socketId].emit("ban")
        })
    })
        .catch(err => res.status(500).json(err))
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
        .then(data => res.status(200).json(data))
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
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
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
        .then(data => res.status(data ? 200 : 404).json(data))
        .catch(err => res.status(500).json(err))
}

exports.showAllVet = (req, res) => {
    const {offset} = req.body
    Vet.find()
        .select("username profile_picture email expYear KTP ban cert_id promoted createdAt session.coordinates")
        .skip(offset || 0)
        .limit(8)
        .lean()
        .then(data => res.status(data ? 200 : 404).json(data))
        .catch(err => res.status(500).json(err))
}

exports.addVet = (req, res) => {
    const {cert_id, KTP, vet_name, vet_email, expYear, address, password, session} = req.body
    if (cert_id && KTP && vet_email && vet_name && expYear && address && password && session) {
        bcrypt.hash(password, parseInt(process.env.BcryptSalt)).then(password => {
            new Vet({
                cert_id: cert_id,
                KTP: KTP,
                email: vet_email,
                username: vet_name,
                expYear: expYear,
                street: address,
                password: password,
                session
            }).save()
                .then(({_id}) => res.status(201).json({id: _id}))
                .catch(err => res.status(500).json(err))
        }).catch(err => res.status(500).json(err))
    } else {
        return res.status(400).json({msg: "input must be filled"})
    }
}

exports.detailVet = (req, res) => {
    const {vetId} = req.body
    Vet.findById(vetId)
        .select("username profile_picture email expYear KTP cert_id createdAt session.coordinates")
        .lean()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.editVet = (req, res) => {
    const {password, _id: id, cert_id, KTP, email, username, expYear, address} = req.body
    const {file} = req

    const updatedData = {
        cert_id,
        KTP,
        email,
        username,
        expYear,
        address
    }

    if (password) {
        updatedData.password = bcrypt.hashSync(password, 10)
    }
    if (file) {
        updatedData.profile_picture = file.filename
    }

    Vet.findByIdAndUpdate(id, updatedData)
        .then(() => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.deleteVet = (req, res) => {
    const {idVet} = req.body

    Vet.findByIdAndDelete(idVet)
        .then(() => res.status(202).json())
        .catch(err => res.status(500).json(err))
}

exports.getBlog = (req, res) => {
    const {offset = 0, limit = 100} = req.body
    Blog.find()
        .select('title')
        .skip(offset)
        .limit(limit)
        .lean()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.getDetailBlog = (req,res) => {
    const {id} = req.body
    if (!id){
        return res.status(400).json()
    }

    Blog.findById(id)
        .select('html')
        .lean()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.addBlog = (req, res) => {
    const {html, title} = req.body
    if (!html || !title) {
        return res.status(400).json()
    }
    Blog.create({html, title})
        .then(() => res.status(201).json())
        .catch(err => res.status(500).json(err))
}

exports.editBlog = (req, res) => {
    const {id, html, title} = req.body
    if (!id || !html || !title) {
        return res.status(400).json()
    }

    Blog.findByIdAndUpdate(id, {html, title})
        .then(() => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.deleteBlog = (req, res) => {
    const {id} = req.body
    if (!id) {
        return res.status(400).json()
    }

    Blog.findByIdAndDelete(id)
        .then(() => res.status(202).json())
        .catch(err => res.status(500).json(err))
}
