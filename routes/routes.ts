import express from 'express';
import { postBooking, getBookings, getBookingHistory, getCredits } from '../controller/controller';
const router = express.Router();

router.post('/bookings', postBooking);

router.get('/bookings', getBookings);

router.get('/bookings/:bookingId/history', getBookingHistory);

router.get('/credits/:patientId', getCredits);