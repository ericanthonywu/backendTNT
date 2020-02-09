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
router.post('/setFCMToken', authMiddleware.authMiddleware, authController.userFCMToken);

//dashboard router
router.post('/searchVet', authMiddleware.authMiddleware, dashboardController.searchVet);

//profile router
router.post('/user_profile', authMiddleware.authMiddleware, profileController.user_profile);
router.post('/update_profile', authMiddleware.authMiddleware, profileController.update_profile);
router.post('/delete_pet', authMiddleware.authMiddleware, profileController.delete_pet);
router.post('/add_pet', fileMiddleware.uploadPet.single('image'), authMiddleware.authMiddleware, profileController.add_pet);
router.post('/update_pet', fileMiddleware.uploadPet.single('image'), authMiddleware.authMiddleware, profileController.update_pet);

//chat router
router.post('/fileChat', fileMiddleware.uploadChat.single("image"), authMiddleware.authMiddleware, chatController.userFileChat)
router.post('/sendChat', authMiddleware.authMiddleware, chatController.userSendChat)
router.post('/showChat', authMiddleware.authMiddleware, chatController.userShowChat)
router.post('/getVet', authMiddleware.authMiddleware, chatController.getVet)
router.post('/endChat', authMiddleware.authMiddleware, chatController.endChat)

//appointment router
router.post('/addAppointment', authMiddleware.authMiddleware, appointmentController.addAppointment)
router.post('/reScheduleAppointment', authMiddleware.authMiddleware, appointmentController.reScheduleAppointment)
router.post('/cancelAppointment', authMiddleware.authMiddleware, appointmentController.cancelAppointment)
router.post('/showVetAvailable', authMiddleware.authMiddleware, appointmentController.showVetAvailable)
router.post('/showUsersTodayAppointment', authMiddleware.authMiddleware, appointmentController.showUsersTodayAppointment)
router.post('/showUserAppointment', authMiddleware.authMiddleware, appointmentController.showUserAppointment)

module.exports = router;
