import express from 'express';
import {
    postBooking,
    getBookings,
    getBookingHistory,
    getCredits,
    authorizeUser,
} from '../controller/controller';

const router = express.Router();

// add route to authorize user and give JWT
router.post('/login', authorizeUser);

router.post('/bookings', postBooking);

router.get('/bookings', getBookings);

router.get('/bookings/:bookingId/history', getBookingHistory);

router.get('/credits/:patientId', getCredits);

export default router