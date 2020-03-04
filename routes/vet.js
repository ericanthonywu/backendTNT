const express = require('express');
const router = express.Router();

//controller
const {loginVet, registerVet, verifyEmailVet, vetFCMToken} = require('../controller/authController');
const {vetFileChat, getUser, vetShowChat, vetSendChat} = require("../controller/chatController");
const {showVetAppointment} = require("../controller/appointmentController");
const {updateProfileVet, updateLocation} = require("../controller/profileController");

//middleware
const {authMiddleware} = require('../middleware/authMiddleware');
const {uploadChat, uploadVet} = require("../middleware/uploadFileMiddleware");

//vet auth router
router.post('/login', loginVet);
router.post('/register', registerVet);
router.post('/verify', verifyEmailVet);
router.post('/setFCMToken', authMiddleware, vetFCMToken);

//profile
router.post('/updateProfile', uploadVet.single("image"), authMiddleware, updateProfileVet)
router.post('/updateLocation', authMiddleware, updateLocation)

//appointment router
router.post('/showAppointment', authMiddleware, showVetAppointment)

//chat router
router.post('/fileChat', uploadChat.single("image"), authMiddleware, vetFileChat)
router.post('/showChatList', authMiddleware, getUser)
router.post('/showChat', authMiddleware, vetShowChat)
router.post('/sendChat', authMiddleware, vetSendChat)

module.exports = router;
