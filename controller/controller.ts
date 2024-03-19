import { Request, Response } from 'express';
import { Op } from "sequelize";
import { Booking, Credit, BookingStatusUpdate } from '../model/model';
import { getBookingStats, getCreditsUsedStats } from '../lib/helpers';

export const authorizeUser = async (req: Request, res: Response) => {
    // add JWT to authorize user, make each endpoint require this token before sending a response
    // ...
}

// Endpoint to create a booking with an unused credit
export const postBooking = async (req: Request, res: Response) => {
    const { time, patient, provider } = req.body;
    // TODO: validate params

    try {
        // Find an unused credit that is not expired
        const d = new Date();
        const credit = await Credit.findOne({
            where: {
                expirationDate: {
                    [Op.gt]: d, // Expiration date is greater than the current date
                },
                BookingId: null, // Credit is not associated with any booking
            },
        });

        if (!credit) {
            return res.status(404).json({ error: 'No unused, non-expired credits found.' });
        }

        // Create a booking associated with the credit
        const booking = await Booking.create({ time, patient, provider });

        // Record the initial status in the booking status history
        await BookingStatusUpdate.create({ status: booking.status, BookingId: booking.id });

        // Associate the booking with the credit
        await booking.setCredit(credit);

        res.status(201).json({
            message: 'Booking created successfully',
            booking: booking,
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'An error occurred while creating the booking.' });
    }
}

// Endpoint to retrieve bookings for a specific user (patient or provider)
export const getBookings = async (req: Request, res: Response) => {
    const { userId } = req.query;
    // TODO: validate query params

    if (!userId) {
        return res.status(400).json({ error: 'User ID must be provided as a query parameter.' });
    }

    try {
        // Retrieve bookings from the database for the specified user
        const bookings = await Booking.findAll({
            where: {
                [Op.or]: [{ patient: userId }, { provider: userId }],
            },
        });

        // TODO: create a Type for each 'stats' type
        let stats: any[] = [];
        if (bookings?.[0].provider === userId) {
            stats = await getBookingStats(userId);
        }

        res.status(200).json({ bookings, stats });
    } catch (error) {
        console.error('Error retrieving bookings:', error);
        res.status(500).json({ error: 'An error occurred while retrieving bookings.' });
    }
}

// Get booking history for a certain booking
export const getBookingHistory = async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    // TODO: validate params

    try {
        // Retrieve the booking status history from the database for the specified booking
        const history = await BookingStatusUpdate.findAll({
            where: { BookingId: bookingId },
            order: [['timestamp', 'ASC']],
        });

        res.status(200).json({ history });
    } catch (error) {
        console.error('Error retrieving booking status history:', error);
        res.status(500).json({ error: 'An error occurred while retrieving booking status history.' });
    }

}

// Get all credits for a certain user
export const getCredits = async (req: Request, res: Response) => {
    const { patientId } = req.params;
    // TODO: validate params

    try {
        // get credits for the specified patient
        const credits = await Credit.findAll({
            where: {
                patient: patientId,
            },
        });
        // Retrieve the monthly credits used statistics from the database for the specified patient
        let stats: any[] = [];
        if (credits.length) {
            stats = await getCreditsUsedStats(patientId);
        }

        res.status(200).json({ credits, stats });
    } catch (error) {
        console.error('Error retrieving monthly credits used statistics:', error);
        res.status(500).json({ error: 'An error occurred while retrieving monthly credits used statistics.' });
    }
}

