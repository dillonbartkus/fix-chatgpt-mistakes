import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import sequelize from './db/client';
import { Booking, Credit, BookingStatusHistory } from './db/model';
import routes from './routes/routes';

const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Fallback function to execute raw SQL queries if the need arises
async function executeQuery(query: string, params: Record<string, any> = []) {
    const connection = await sequelize.getConnection();
    try {
        const [rows] = await connection.query(query, params);
        return rows;
    } catch (error) {
        throw error;
    }
}

// TODO: Consider moving these helper functions to their own file in /lib, or creating a Model for the DB for both types of stats
// Function to get statistics on canceled and rescheduled bookings for a specific provider
export async function getStats(providerId) {
    try {
        // Retrieve canceled and rescheduled bookings for the specified provider
        const stats = await Booking.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.literal('DISTINCT CASE WHEN status = "canceled" THEN id END')), 'canceledBookings'],
                [sequelize.fn('COUNT', sequelize.literal('DISTINCT CASE WHEN status = "rescheduled" THEN id END')), 'rescheduledBookings'],
            ],
            where: {
                provider: providerId,
                [sequelize.Op.or]: [{ status: 'canceled' }, { status: 'rescheduled' }],
            },
        });

        // Extract the results from the stats
        const [result] = stats;

        // Prepare the statistic information
        const canceledBookings = result.getDataValue('canceledBookings') || 0;
        const rescheduledBookings = result.getDataValue('rescheduledBookings') || 0;

        return [
            canceledBookings,
            rescheduledBookings,
        ];
    } catch (error) {
        console.error('Error getting cancellation and reschedule statistics:', error);
        throw error;
    }
}

// Function to get monthly statistics on credits used by a specific patient, including the percentage
export async function getCreditsUsedStats(patientId) {
    try {
        // Retrieve total credits available for the specified patient
        const totalCreditsQuery = await Credit.sum('type', {
            where: {
                BookingId: null, // Credits not associated with any booking
            },
        });

        // Retrieve monthly credits used by the specified patient
        const stats = await Booking.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.literal('CASE WHEN "Booking"."status" = "confirmed" THEN "Credit"."type" END')), 'totalCreditsUsed'],
                [sequelize.fn('MONTH', sequelize.col('"Booking"."time"')), 'month'],
                [sequelize.fn('YEAR', sequelize.col('"Booking"."time"')), 'year'],
            ],
            include: [
                {
                    model: Credit,
                    attributes: [],
                    where: {
                        BookingId: sequelize.literal('"Booking"."id"'), // Match Credit to Booking
                    },
                },
            ],
            where: {
                patient: patientId,
                status: 'confirmed',
            },
            group: ['month', 'year'],
        });

        // Extract the results from the stats
        const result = stats.map((row) => ({
            totalCreditsUsed: row.getDataValue('totalCreditsUsed') || 0,
            month: row.getDataValue('month'),
            year: row.getDataValue('year'),
        }));

        // Calculate the percentage for each month
        const totalCreditsAvailable = totalCreditsQuery || 1; // To avoid division by zero
        const monthlyStatsWithPercentage = result.map((row) => ({
            ...row,
            percentageCreditsUsed: (row.totalCreditsUsed / totalCreditsAvailable) * 100,
        }));

        return monthlyStatsWithPercentage;
    } catch (error) {
        console.error('Error getting monthly credits used statistics:', error);
        throw error;
    }
}

app.use('/', routes);

// TODO: Move these endpoints to their respective route / controller / model files

// Endpoint to create a booking with an unused credit
app.post('/bookings', async (req: Request, res: Response) => {
    const { time, patient, provider } = req.body;

    try {
        // Find an unused credit that is not expired
        const d = new Date();
        const credit = await Credit.findOne({
            where: {
                expirationDate: {
                    [sequelize.Op.gt]: d, // Expiration date is greater than the current date
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
        await BookingStatusHistory.create({ status, BookingId: booking.id });


        // Associate the booking with the credit
        await booking.setCredit(credit);

        res.status(201).json({
            message: 'Booking created successfully',
            booking: booking.toJSON(),
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'An error occurred while creating the booking.' });
    }
});


// Endpoint to retrieve bookings for a specific user (patient or provider)
app.get('/bookings', async (req: Request, res: Response) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'User ID must be provided as a query parameter.' });
    }

    try {
        // Retrieve bookings from the database for the specified user
        const bookings = await Booking.findAll({
            where: {
                [sequelize.Op.or]: [{ patient: userId }, { provider: userId }],
            },
        });

        let stats = [];
        if (bookings?.[0].provider === userId) stats = await getStats(userId);

        res.status(200).json({ bookings, stats });
    } catch (error) {
        console.error('Error retrieving bookings:', error);
        res.status(500).json({ error: 'An error occurred while retrieving bookings.' });
    }
});

app.get('/bookings/:bookingId/history', async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    try {
        // Retrieve the booking status history from the database for the specified booking
        const history = await BookingStatusHistory.findAll({
            where: { BookingId: bookingId },
            order: [['timestamp', 'ASC']], // Order by timestamp in ascending order
        });

        res.status(200).json({ history });
    } catch (error) {
        console.error('Error retrieving booking status history:', error);
        res.status(500).json({ error: 'An error occurred while retrieving booking status history.' });
    }
});

app.get('/credits/:patientId', async (req: Request, res: Response) => {
    const { patientId } = req.params;

    try {
        // get credits for the specified patient
        const credits = await Credit.findAll({
            where: {
                patient: patientId,
            },
        });
        // Retrieve the monthly credits used statistics from the database for the specified patient
        const stats = await getCreditsUsedStats(patientId);

        res.status(200).json({ credits, stats });
    } catch (error) {
        console.error('Error retrieving monthly credits used statistics:', error);
        res.status(500).json({ error: 'An error occurred while retrieving monthly credits used statistics.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});