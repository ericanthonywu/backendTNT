const express = require('express');
const router = express.Router();

//controller
const authController = require('../controller/authController');
const appointmentController = require('../controller/appointmentController')
const chatController = require('../controller/chatController')

//middleware
const authMiddleware = require('../middleware/authMiddleware');
const fileMiddleware = require("../middleware/uploadFileMiddleware");

//vet auth router
router.post('/login', authController.loginVet);
router.post('/register', authController.registerVet);
router.post('/verify', authController.verifyEmailVet);
router.post('/setFCMToken', authMiddleware.authMiddleware, authController.vetFCMToken);

//appointment router
router.post('/showAppointment', authMiddleware.authMiddleware, appointmentController.showVetAppointment)

//chat router
router.post('/fileChat', fileMiddleware.uploadChat.single("image"), authMiddleware.authMiddleware, chatController.vetFileChat)
router.post('/showChatList', authMiddleware.authMiddleware, chatController.getUser)
router.post('/showChat', authMiddleware.authMiddleware, chatController.vetShowChat)
router.post('/sendChat', authMiddleware.authMiddleware, chatController.vetSendChat)

module.exports = router;
