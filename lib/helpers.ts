import { fn, Op, col, literal } from "sequelize";
import { Booking, Credit } from '../model/model';
import sqlzClient from '../db/client';

// TODO: Consider creating a Model for the DB for both types of stats

// Function to get statistics on canceled and rescheduled bookings for a specific provider
export async function getBookingStats(providerId) {
    try {
        // Retrieve canceled and rescheduled bookings for the specified provider
        const stats = await Booking.findAll({
            attributes: [
                [fn('COUNT', literal('DISTINCT CASE WHEN status = "canceled" THEN id END')), 'canceledBookings'],
                [fn('COUNT', literal('DISTINCT CASE WHEN status = "rescheduled" THEN id END')), 'rescheduledBookings'],
            ],
            where: {
                provider: providerId,
                [Op.or]: [{ status: 'canceled' }, { status: 'rescheduled' }],
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
                [fn('SUM', literal('CASE WHEN "Booking"."status" = "confirmed" THEN "Credit"."type" END')), 'totalCreditsUsed'],
                [fn('MONTH', col('"Booking"."time"')), 'month'],
                [fn('YEAR', col('"Booking"."time"')), 'year'],
            ],
            include: [
                {
                    model: Credit,
                    attributes: [],
                    where: {
                        BookingId: literal('"Booking"."id"'), // Match Credit to Booking
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

// Fallback function to execute raw SQL queries if the need arises
export async function executeQuery(query: string, params: Record<string, any> = []) {
    const connection = await sqlzClient.authenticate();
    try {
        // TODO: parse query and params, validate / sanitize to prevent unwanted behavior. Make sure you are returning the proper data
        const [results, metadata] = await connection.query(query, params);
        return [results, metadata];
    } catch (error) {
        throw error;
    }
}