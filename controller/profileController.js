const {user: User, vet: Vet} = require('../model')
const moment = require('moment')
const fs = require('fs')
const path = require('path')
const mongoose = require("mongoose");
const {generateToken, transpoter} = require("../globalHelper");

exports.user_profile = (req, res) => {
    User.findById(res.userData.id)
        .select("username email profile_picture pet phoneNumber address loginWithGoogle loginWithFacebook")
        .lean()
        .then(data => res.status(200).json({message: "user profile", data: {data, prefix: "uploads/pet"}}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
};

exports.add_pet = (req, res) => {
    const {name, birthdate, status, species} = req.body;
    if(!req.file){
        return res.status(400).json({message: "file required"})
    }
    const id = mongoose.Types.ObjectId()
    User.findByIdAndUpdate(res.userData.id, {
        $push: {
            pet: {
                _id: id,
                name,
                photo: req.file ? req.file.filename : undefined,
                birthDate: birthdate,
                status,
                species
            }
        }
    }).then(() => res.status(201).json({message: "Pet succesfully added", data: {pet_id: id}}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
};

exports.update_pet = (req, res) => {
    const {petid, name, birthdate, status, species} = req.body
    const updatedData = {
        "pet.$.name": name,
        "pet.$.birthDate": birthdate,
        "pet.$.status": status,
        "pet.$.species": species,
    };
    if (req.file) {
        updatedData["pet.$.photo"] = req.file.filename
        User.findOne({
            _id: res.userData.id,
            'pet._id': petid
        }).lean()
            .select("pet.$.photo")
            .then(data => {
                try {
                    fs.unlinkSync(path.join(__dirname, "../uploads/pet/" + data.pet[0].photo))
                } catch (e) {
                    console.log(e)
                }
            })
    }
    User.findOneAndUpdate({
            _id: res.userData.id,
            'pet._id': petid
        },
        {
            $set: updatedData
        })
        .then(() => res.status(200).json({message: "pet updated"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
};

exports.delete_pet = (req, res) => {
    const {id: petId} = req.body
    // console.log(petId)
    // User.aggregate([
    //     {$match: {_id: res.userData.id}},
    //     {$unwind: '$pet'},
    //     {$match: {"pet._id": petId}},
    //     {$group: {_id: '$_id', list: {$push: 'pet.photo'}}}
    // ]).then(data => console.log(data))
    User.findOne({
        _id: res.userData.id,
        pet: {$elemMatch: {_id: petId}},
    }).select("pet.photo pet._id").lean()
        .then(({pet}) => {
            // fs.unlinkSync(path.join(__dirname, "../uploads/pet/" + realPhoto))

            User.findByIdAndUpdate(res.userData.id, {
                $pull: {
                    pet: {_id: petId}
                }
            })
                .then(() => res.status(202).json({message: "pet deleted"}))
                .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
        })
    // .catch(err => res.status(500).json({message: "Failed to run query", error: err}))

}

exports.update_profile = (req, res) => {
    const {avatar, name: username, email, phoneNumber, address} = req.body
    const updatedData = {username, phoneNumber, address}

    if (avatar) {
        updatedData.profile_picture = avatar
        updatedData.profile_picture_last_changed_at = moment(Date.now()).toISOString()
    }
    if (email) {
        const token = generateToken()

        updatedData.email = email
        updatedData.email_verification_token = token;
        updatedData.email_expire_token = moment().add(3, "minutes").toISOString();

        transpoter.sendMail({
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
        .then(() => res.status(200).json({message: "Profile updated"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
};

exports.updateProfileVet = (req, res) => {
    Vet.findById(res.userData.id).select("profile_picture").then(({profile_picture}) => {
        if (profile_picture !== "default.png") {
            fs.unlinkSync(path.join(__dirname, `../uploads/vet/${profile_picture}`))
        }
    })
    Vet.findByIdAndUpdate(res.userData.id, {
        profile_picture: req.file.filename
    }).then(() => res.status(200).json({message: "Profile vet updated"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}

exports.updateLocation = (req, res) => {
    const {latitude, longitude} = req.body
    Vet.findByIdAndUpdate(res.userData.id, {
        session: {
            coordinates: [longitude, latitude]
        }
    }).then(() => res.status(200).json({message: "Location updated"}))
        .catch(err => res.status(500).json({message: "Failed to run query", error: err}))
}
