const {user: User, vet: Vet} = require('../model')
const moment = require('moment')
const fs = require('fs')
const path = require('path')
const nodeMailer = require("nodemailer");
const mongoose = require("mongoose");

exports.user_profile = (req, res) => {
    User.findById(res.userData.id)
        .select("username email profile_picture pet phoneNumber address loginWithGoogle loginWithFacebook")
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).json(err))
};

exports.add_pet = (req, res) => {
    const {name, birthdate, status} = req.body;
    const id = mongoose.Types.ObjectId()
    User.findByIdAndUpdate(res.userData.id, {
        $push: {
            pet: {
                _id: id,
                name: name,
                photo: req.file.filename,
                birthDate: birthdate,
                status: status
            }
        }
    }).then(() => res.status(200).json({id}))
        .catch(err => res.status(500).json(err))
};

exports.update_pet = (req, res) => {
    const {petid, name, birthdate, status} = req.body
    const updatedData = {
        "pet.$.name": name,
        "pet.$.birthDate": birthdate,
        "pet.$.status": status,
    }
    if (req.file) {
        updatedData["pet.$.photo"] = req.file.filename
        User.findOne({
            _id: res.userData.id,
            'pet._id': petid
        }).select("pet.$.photo")
            .then(data => fs.unlinkSync(path.join(__dirname, "../uploads/pet/" + data.pet[0].photo)))
    }
    User.findOneAndUpdate({
            _id: res.userData.id,
            'pet._id': petid
        },
        {
            $set: updatedData
        })
        .then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
};

exports.delete_pet = (req, res) => {
    const {petId} = req.body
    User.findByIdAndUpdate(res.userData.id, {
        $pull: {
            pet: {_id: petId}
        }
    }).then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.update_profile = (req, res) => {
    const {avatar, name: username, email, phoneNumber, address} = req.body
    const updatedData = {username, phoneNumber, address}


    if (avatar) {
        updatedData.profile_picture = avatar
        updatedData.profile_picture_last_changed_at = moment(Date.now()).toISOString()
    }
    if (email) {
        updatedData.email = email
        const token = Math.floor((Math.random() * 1000000) + 1); //generate 6 number token
        updatedData.email_verification_token = token;
        updatedData.email_expire_token = moment(Date.now()).add(3, "minutes").toISOString();

        nodeMailer.createTransport({
            host: process.env.EMAILHOST,
            port: process.env.EMAILPORT,
            secure: true,
            service: "Gmail",
            requireTLS: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAILPASSWORD
            }
        }).sendMail({
            from: "Tail 'n Tales Email Verification",
            to: email,
            subject: "Email Verification",
            html: `Hello ${username}! Thank you for registering, your token verification is <b>${token}</b>. IMPORTANT! NEVER TELL YOUR TOKEN TO ANYONE!`
        }, err => {
            if (err) {
                return res.status(500).json(err)
            }
        });
    }
    User.findByIdAndUpdate(res.userData.id, updatedData)
        .then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
};

exports.updateProfileVet = (req, res) => {
    Vet.findById(res.userData.id).select("profile_picture").then(({profile_picture}) => {
        if (profile_picture !== "default.png"){
            fs.unlinkSync(path.join(__dirname, `../uploads/vet/${profile_picture}`))
        }
    })
    Vet.findByIdAndUpdate(res.userData.id, {
        profile_picture: req.file.filename
    }).then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
}

exports.updateLocation = (req,res) => {
    const {latitude,longitude} = req.body
    Vet.findByIdAndUpdate(res.userData.id,{
        session: {
            coordinates: [longitude,latitude]
        }
    }).then(_ => res.status(200).json())
        .catch(err => res.status(500).json(err))
}
