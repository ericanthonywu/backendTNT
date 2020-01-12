const express = require('express'),
    router = express.Router(),

//controller
    authController = require('../controller/authController'),
    dashboardController = require('../controller/dashboardController'),
    profileController = require('../controller/profileController'),
    chatController = require('../controller/chatController'),
    appointmentController = require('../controller/appointmentController'),

//middleware
    authMiddleware = require('../middleware/authMiddleware'),
    fileMiddleware = require('../middleware/uploadFileMiddleware');

//user auth router
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/verify', authController.verifyEmail);
router.post('/setFCMToken',authMiddleware.authMiddleware, authController.userFCMToken);

//dashboard router
router.post('/searchVet', authMiddleware.authMiddleware, dashboardController.searchVet);
router.post('/showAppointment', authMiddleware.authMiddleware, dashboardController.showAppointment)

//profile router
router.post('/user_profile', authMiddleware.authMiddleware, profileController.user_profile);
router.post('/update_profile', authMiddleware.authMiddleware, profileController.update_profile)
router.post('/add_pet', fileMiddleware.uploadPet.single('image'), authMiddleware.authMiddleware, profileController.add_pet);
router.post('/update_pet', fileMiddleware.uploadPet.single('image'), authMiddleware.authMiddleware, profileController.update_pet);

//chat router
// router.post('/fileChat',fileMiddleware.uploadChat,authMiddleware.authMiddleware,chatController.fileChat)
router.post('/sendChat', authMiddleware.authMiddleware, chatController.userSendChat)
router.post('/showChat', authMiddleware.authMiddleware, chatController.userShowChat)
router.post('/getVet', authMiddleware.authMiddleware, chatController.getVet)

//appointment router
router.post('/addAppointment', authMiddleware.authMiddleware, appointmentController.addAppointment)
router.post('/showVetAvailable', authMiddleware.authMiddleware, appointmentController.showVetAvailable)

module.exports = router;
