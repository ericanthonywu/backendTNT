const {clinic: Clinic, vet: Vet, user: User, appointment: Appointment} = require('../model')
const bcrypt = require('bcryptjs')

exports.addClinic = (req, res) => {
    const {username, password, email} = req.body
    if (username && password && email) {
        bcrypt.hash(password, 10).then(hashedPassword => {
            new Clinic({
                username: username,
                password: hashedPassword,
                email: email
            }).save()
                .then(_ => res.status(201).json())
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
    }).then(() => res.status(200).json())
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
        {$limit: 10},
        {$skip: parseInt(offset) || 0}
    ]).then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.showVetClinic = (req, res) => {
    const {offset} = req.body
    if (typeof offset == "undefined") {
        return res.status(400).json()
    }

    Clinic.findById(res.userData.id)
        .select("vet")
        .populate("vet", "username createdAt id_cert")
        .then(({vet}) => res.status(200).json(({vet})))
        .catch(err => res.status(500).json(err))
}

exports.addVetClinic = (req, res) => {
    const {vetId} = req.body

    Clinic.findByIdAndUpdate(res.userData.id, {
        $push: {
            vet: vetId
        }
    }).then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.banVetClinic = (req, res) => {
    const {vetId} = req.body
    Vet.findByIdAndUpdate(vetId, {
        ban: true
    }).then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.searchVetClinic = (req, res) => {
    const {keyword} = req.body
    Vet.find({username: {$regex: `(?i)${keyword}.*`}})
        .select("username profile_picture id_cert")
        .then(data => res.status(200).json(data))
        .catch(err => res.status(200).json(err))
}

exports.getClinicNotification = (req,res) => {

}
