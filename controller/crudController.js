const {clinic: Clinic, vet: Vet, user: User, appointment: Appointment} = require('../model')
const bcrypt = require('bcryptjs')

exports.addClinic = (req,res) => {
    const {username, password, email} = req.body
    if (username && password && email){
        new Clinic({
            username: username,
            password: bcrypt.hashSync(password,10),
            email: email
        }).save().then(() => res.status(201).json())
            .catch(err => res.status(500).json(err))
    }else{
        return res.status(400).json()
    }
}

exports.banClinic = (req,res) => {
    const {clinicId} = req.body
    if (!clinicId){
        return res.status(400).json()
    }
    Clinic.findByIdAndUpdate(clinicId,{
        ban: true
    })
}

exports.showClinic = (req,res) => {
    const {offset} = req.body
    Clinic.find({})
        .select("username email createdAt")
        .skip(offset || 0)
        .limit(10)
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
}

exports.addVet = (req,res) => {
    const {vetId} = req.body

    Clinic.findByIdAndUpdate(res.userData.id,{
        $push:{
            vet: vetId
        }
    }).then(() => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.banVet = (req,res) => {
    const {vetId} = req.body
    Vet.findByIdAndUpdate(vetId,{
        ban: true
    }).then(() => res.status(200).json())
        .catch(err => res.status(500).json(err))
}
